import { format, isFirstDayOfMonth, isSameDay, parseISO } from 'date-fns'

import { type MonteCarloResult, type PriceData } from '@/lib/api'
import {
  type Annuity,
  type PricePoint,
  type Scenario,
  type ScenarioResults,
  type SimulationState,
} from './types'

export function parsePortfolioDate(date: string | Date): Date {
  if (date instanceof Date) return date
  return date.includes('/')
    ? parseISO(date.split('/').reverse().join('-'))
    : parseISO(date)
}

function convertAmount(
  amount: number,
  fromCurrency: 'USD' | 'BTC',
  price: number
): { usdAmount: number; btcAmount: number } {
  if (fromCurrency === 'USD') {
    return {
      usdAmount: amount,
      btcAmount: amount / price,
    }
  } else {
    return {
      usdAmount: amount * price,
      btcAmount: amount,
    }
  }
}

function* dateWindowGenerator(
  priceData: PriceData[],
  monteCarloData?: MonteCarloResult
): Generator<PricePoint> {
  // Yield all historical dates
  for (const price of priceData) {
    const date = parsePortfolioDate(price.date)
    yield {
      date,
      price: price.price,
      isProjection: false,
      scenarioPrices: {
        average: price.price,
        best: price.price,
        worst: price.price,
      },
    }
  }

  // Yield all projected dates if available
  if (monteCarloData?.chartData) {
    for (const projection of monteCarloData.chartData) {
      const date = parsePortfolioDate(projection.date)
      yield {
        date,
        price: projection.averagePrice,
        isProjection: true,
        scenarioPrices: {
          average: projection.averagePrice,
          best: projection.bestPrice,
          worst: projection.worstPrice,
        },
      }
    }
  }
}

function processInflow(
  state: SimulationState,
  annuity: Annuity,
  pricePoint: PricePoint
) {
  for (const scenario of state.scenarios) {
    const price = pricePoint.scenarioPrices[scenario.name]
    const amounts = convertAmount(
      annuity.principal,
      annuity.principalCurrency,
      price
    )

    scenario.currentState.btcBalance += amounts.btcAmount
    scenario.currentState.usdBalance += amounts.usdAmount

    scenario.cashFlows.push({
      date: format(pricePoint.date, 'yyyy-MM-dd'),
      annuityId: annuity.id,
      type: 'inflow',
      usdAmount: amounts.usdAmount,
      btcAmount: amounts.btcAmount,
      isProjection: pricePoint.isProjection,
    })
  }
}

function processOutflow(
  state: SimulationState,
  activeAnnuity: { annuity: Annuity; remainingTermMonths: number },
  pricePoint: PricePoint
) {
  const monthlyRate = activeAnnuity.annuity.amortizationRate / 12
  const { annuity } = activeAnnuity

  for (const scenario of state.scenarios) {
    const currentPrice = pricePoint.scenarioPrices[scenario.name]

    // Find the creation price from this scenario's cash flows
    const creationInflow = scenario.cashFlows.find(
      (cf) => cf.type === 'inflow' && cf.annuityId === annuity.id
    )
    const creationPrice = creationInflow
      ? creationInflow.usdAmount / creationInflow.btcAmount
      : pricePoint.scenarioPrices[scenario.name]

    // Convert to USD terms using creation price for BTC principal
    const principalUSD =
      annuity.principalCurrency === 'BTC'
        ? annuity.principal * creationPrice
        : annuity.principal

    // Calculate fixed monthly payment in USD
    const monthlyPaymentUSD =
      principalUSD *
      (monthlyRate / (1 - Math.pow(1 + monthlyRate, -annuity.termMonths)))

    // Convert USD payment to BTC using current price
    const amounts = convertAmount(monthlyPaymentUSD, 'USD', currentPrice)

    // Update balances
    scenario.currentState.btcBalance = Math.max(
      0,
      scenario.currentState.btcBalance - amounts.btcAmount
    )
    scenario.currentState.usdBalance = Math.max(
      0,
      scenario.currentState.usdBalance - amounts.usdAmount
    )

    // Record cash flow
    scenario.cashFlows.push({
      date: format(pricePoint.date, 'yyyy-MM-dd'),
      annuityId: annuity.id,
      type: 'outflow',
      usdAmount: monthlyPaymentUSD, // Use fixed USD payment
      btcAmount: amounts.btcAmount,
      isProjection: pricePoint.isProjection,
    })

    // Track monthly income for charts
    scenario.monthlyIncome.push({
      date: format(pricePoint.date, 'yyyy-MM-dd'),
      usdAmount: monthlyPaymentUSD, // Use fixed USD payment
      isProjection: pricePoint.isProjection,
    })
  }
}

function recordValuations(state: SimulationState, pricePoint: PricePoint) {
  for (const scenario of state.scenarios) {
    const price = pricePoint.scenarioPrices[scenario.name]

    scenario.valuations.push({
      date: format(pricePoint.date, 'yyyy-MM-dd'),
      btcValue: scenario.currentState.btcBalance,
      usdValue: scenario.currentState.btcBalance * price,
      isProjection: pricePoint.isProjection,
    })
  }
}

function isLastDay(
  date: Date,
  priceData: PriceData[],
  monteCarloData?: MonteCarloResult
): boolean {
  const lastHistoricalDate = parsePortfolioDate(
    priceData[priceData.length - 1].date
  )
  const lastProjectedDate = monteCarloData?.chartData
    ? parsePortfolioDate(
        monteCarloData.chartData[monteCarloData.chartData.length - 1].date
      )
    : lastHistoricalDate

  return isSameDay(date, lastProjectedDate)
}

export function performCalculations(
  priceData: PriceData[],
  annuities: Annuity[],
  monteCarloData?: MonteCarloResult
): ScenarioResults {
  // Initialize scenarios
  const scenarios: Scenario[] = ['average', 'best', 'worst'].map((name) => ({
    name,
    valuations: [],
    cashFlows: [],
    monthlyIncome: [],
    currentState: {
      btcBalance: 0,
      usdBalance: 0,
    },
  }))

  const state: SimulationState = {
    date: new Date(0), // Will be set on first iteration
    scenarios,
    activeAnnuities: [],
  }

  // Process each date in sequence
  for (const pricePoint of dateWindowGenerator(priceData, monteCarloData)) {
    state.date = pricePoint.date

    // Add any annuities that start on this date
    for (const annuity of annuities) {
      if (isSameDay(parsePortfolioDate(annuity.createdAt), pricePoint.date)) {
        state.activeAnnuities.push({
          annuity: { ...annuity },
          remainingTermMonths: annuity.termMonths,
        })
        processInflow(state, annuity, pricePoint)
      }
    }

    // Process monthly payments for active annuities
    if (isFirstDayOfMonth(pricePoint.date)) {
      for (const active of state.activeAnnuities) {
        // Make sure the annuity wasn't just created on this date
        if (
          isSameDay(
            parsePortfolioDate(active.annuity.createdAt),
            pricePoint.date
          )
        ) {
          continue
        }

        if (active.remainingTermMonths > 0) {
          processOutflow(state, active, pricePoint)
          active.remainingTermMonths--
        }
      }
    }

    // Record valuations if it's the first of the month or last day of data
    if (
      isFirstDayOfMonth(pricePoint.date) ||
      isLastDay(pricePoint.date, priceData, monteCarloData)
    ) {
      recordValuations(state, pricePoint)
    }

    // Clean up completed annuities
    state.activeAnnuities = state.activeAnnuities.filter(
      (active) => active.remainingTermMonths > 0
    )
  }

  // Convert to expected return format
  return state.scenarios.reduce(
    (results, scenario) => ({
      ...results,
      [scenario.name]: {
        cashFlows: scenario.cashFlows,
        valuations: scenario.valuations,
        monthlyIncome: scenario.monthlyIncome,
      },
    }),
    {} as ScenarioResults
  )
}
