import { addMonths, format, isSameDay, parseISO, startOfMonth } from 'date-fns'

import { type MonteCarloResult } from '@/hooks/use-monte-carlo'
import { type PriceData } from '@/lib/api'
import { type Annuity, type CashFlow, type PortfolioValuation } from './types'

export function parsePortfolioDate(date: string | Date): Date {
  if (date instanceof Date) return date
  return date.includes('/')
    ? parseISO(date.split('/').reverse().join('-'))
    : parseISO(date)
}

export function* iterateMonths(
  startDate: Date,
  numberOfMonths: number
): Generator<Date> {
  for (let i = 1; i <= numberOfMonths; i++) {
    yield startOfMonth(addMonths(startDate, i))
  }
}

export function findPriceData(
  date: Date,
  priceData: PriceData[]
): PriceData | null {
  const result = priceData.find((p) =>
    isSameDay(parsePortfolioDate(p.date), date)
  )
  return result ?? null
}

export function calculateInflow(
  annuity: Annuity,
  priceData: PriceData[]
): CashFlow | null {
  const creationDate = parsePortfolioDate(annuity.createdAt)
  const creationPrice = findPriceData(creationDate, priceData)
  if (!creationPrice) return null

  return {
    usdAmount:
      annuity.principalCurrency === 'USD'
        ? annuity.principal
        : annuity.principal * creationPrice.price,
    btcAmount:
      annuity.principalCurrency === 'BTC'
        ? annuity.principal
        : annuity.principal / creationPrice.price,
    date: format(creationDate, 'yyyy-MM-dd'),
    annuityId: annuity.id,
    type: 'inflow',
  }
}

export function calculateOutflows(
  annuity: Annuity,
  priceData: PriceData[]
): CashFlow[] {
  const monthlyRate = annuity.amortizationRate / 12
  const creationDate = parsePortfolioDate(annuity.createdAt)
  const creationPrice = findPriceData(creationDate, priceData)
  if (!creationPrice) return []

  const principalUSD =
    annuity.principalCurrency === 'USD'
      ? annuity.principal
      : annuity.principal * creationPrice.price

  const monthlyPaymentUSD =
    principalUSD *
    (monthlyRate / (1 - (1 + monthlyRate) ** -annuity.termMonths))

  const outflows: CashFlow[] = []

  for (const amortizationDate of iterateMonths(
    creationDate,
    annuity.termMonths
  )) {
    const amortizationDatePrice = findPriceData(amortizationDate, priceData)
    if (!amortizationDatePrice) continue

    outflows.push({
      date: format(amortizationDate, 'yyyy-MM-dd'),
      annuityId: annuity.id,
      type: 'outflow',
      usdAmount: monthlyPaymentUSD,
      btcAmount: monthlyPaymentUSD / amortizationDatePrice.price,
    })
  }

  return outflows
}

export function performCalculations(
  priceData: PriceData[],
  annuities: Annuity[],
  monteCarloData?: MonteCarloResult
) {
  const cashFlows = annuities
    .flatMap((annuity) => {
      const inflow = calculateInflow(annuity, priceData)
      const outflows = calculateOutflows(annuity, priceData)
      return [inflow, ...outflows].filter(
        (flow): flow is CashFlow => flow !== null
      )
    })
    .sort(
      (a, b) =>
        parsePortfolioDate(a.date).getTime() -
        parsePortfolioDate(b.date).getTime()
    )

  let currentBalance = 0
  const valuations: PortfolioValuation[] = []

  // Process historical cash flows and valuations
  for (const cashFlow of cashFlows) {
    currentBalance +=
      cashFlow.type === 'inflow' ? cashFlow.btcAmount : -cashFlow.btcAmount
    currentBalance = Math.max(0, currentBalance)

    const price = findPriceData(parsePortfolioDate(cashFlow.date), priceData)
    if (!price) continue

    valuations.push({
      date: cashFlow.date,
      btcValue: currentBalance,
      usdValue: currentBalance * price.price,
    })
  }

  // Add a valuation for the final historical data point
  const lastPriceData = priceData.at(-1)
  const lastPriceNotInValuations = valuations.find(
    (valuation) => valuation.date === lastPriceData?.date
  )
  if (!lastPriceNotInValuations && lastPriceData) {
    valuations.push({
      date: lastPriceData.date,
      btcValue: currentBalance,
      usdValue: currentBalance * lastPriceData.price,
    })
  }

  // Add future valuations using Monte Carlo data if available
  if (monteCarloData?.chartData && lastPriceData) {
    // Initialize scenario balances with current balance
    let bestBalance = currentBalance
    let worstBalance = currentBalance

    // Get monthly samples from Monte Carlo data
    const monthlyProjections = monteCarloData.chartData.filter(
      (point, index) =>
        index === 0 || // Include first point
        index === monteCarloData.chartData.length - 1 || // Include last point
        new Date(point.date).getDate() === 1 // Include first day of each month
    )

    // Get the most recent monthly outflow amount
    const lastOutflow = cashFlows
      .filter((cf) => cf.type === 'outflow')
      .sort((a, b) => b.date.localeCompare(a.date))[0]

    const monthlyOutflowUSD = lastOutflow?.usdAmount ?? 0

    // Add valuations for each monthly projection
    for (const projection of monthlyProjections) {
      if (new Date(projection.date) <= new Date(lastPriceData.date)) continue

      // Calculate BTC needed to sell for each scenario
      const bestBTCNeeded = monthlyOutflowUSD / projection.bestPrice
      const avgBTCNeeded = monthlyOutflowUSD / projection.averagePrice
      const worstBTCNeeded = monthlyOutflowUSD / projection.worstPrice

      // Update balances
      bestBalance = Math.max(0, bestBalance - bestBTCNeeded)
      currentBalance = Math.max(0, currentBalance - avgBTCNeeded)
      worstBalance = Math.max(0, worstBalance - worstBTCNeeded)

      valuations.push({
        date: projection.date,
        btcValue: currentBalance,
        btcValueBest: bestBalance,
        btcValueWorst: worstBalance,
        usdValue: currentBalance * projection.averagePrice,
        usdValueBest: bestBalance * projection.bestPrice,
        usdValueWorst: worstBalance * projection.worstPrice,
      })
    }
  }

  return { cashFlows, valuations }
}
