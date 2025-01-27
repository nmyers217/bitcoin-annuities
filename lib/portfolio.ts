import * as Comlink from 'comlink'
import type { Remote } from 'comlink'
import { addMonths, isSameDay, parseISO, startOfMonth } from 'date-fns'

import { type PriceData } from '@/lib/api'

export type Annuity = {
  id: string
  createdAt: string
  principal: number
  principalCurrency: 'BTC' | 'USD'
  amortizationRate: number
  termMonths: number
}

export interface CashFlow {
  date: string
  annuityId: string
  type: 'inflow' | 'outflow'
  usdAmount: number
  btcAmount: number
}

export interface PortfolioValuation {
  date: string
  btcValue: number
  usdValue: number
}

type CalculationStatus = 'idle' | 'calculating'

export type PortfolioState = {
  // First the price data is fetched from the API
  priceData: PriceData[]
  // Then the annuities are added
  annuities: Annuity[]
  // Then the cash flows are calculated
  cashFlows: CashFlow[]
  // Then the valuations are calculated
  valuations: PortfolioValuation[]
  calculationStatus: CalculationStatus
  lastCalculationInputHash?: string
}

type Worker = {
  calculate: (
    priceData: PriceData[],
    annuities: Annuity[]
  ) => Promise<{
    cashFlows: CashFlow[]
    valuations: PortfolioValuation[]
  }>
}

let workerApi: Remote<Worker> | null = null

function getWorker() {
  if (!workerApi && typeof Worker !== 'undefined') {
    const worker = new Worker(new URL('./portfolio.worker.ts', import.meta.url))
    workerApi = Comlink.wrap<Worker>(worker)
  }
  return workerApi
}

export type PortfolioAction =
  | { type: 'INITIALIZE'; priceData: PriceData[] }
  | { type: 'ADD_ANNUITY'; annuity: Annuity }
  | { type: 'REMOVE_ANNUITY'; id: string }
  | { type: 'UPDATE_ANNUITY'; annuity: Annuity }
  | { type: 'START_CALCULATION'; inputHash: string }
  | {
      type: 'CALCULATION_COMPLETE'
      cashFlows: CashFlow[]
      valuations: PortfolioValuation[]
      inputHash: string
    }
  | { type: 'RESTORE'; state: PortfolioState }

// Simple cache for memoization
const calculationCache = new Map<
  string,
  { cashFlows: CashFlow[]; valuations: PortfolioValuation[] }
>()

function calculateInputHash(
  priceData: PriceData[],
  annuities: Annuity[]
): string {
  return JSON.stringify({
    priceData: priceData.map((p) => ({ date: p.date, price: p.price })),
    annuities: annuities.map((a) => ({ ...a })),
  })
}

export function portfolioReducer(
  state: PortfolioState,
  action: PortfolioAction
): PortfolioState {
  console.log('Portfolio reducer:', action.type, {
    priceDataLength: state.priceData.length,
    annuitiesLength: state.annuities.length,
    status: state.calculationStatus,
  })

  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        priceData: action.priceData,
        // Only trigger calculation if we have both price data and annuities
        calculationStatus:
          action.priceData.length > 0 && state.annuities.length > 0
            ? 'calculating'
            : 'idle',
      }
    case 'ADD_ANNUITY':
      return {
        ...state,
        annuities: [...state.annuities, action.annuity],
        calculationStatus: 'calculating',
      }
    case 'REMOVE_ANNUITY':
      return {
        ...state,
        annuities: state.annuities.filter(
          (annuity) => annuity.id !== action.id
        ),
        calculationStatus: 'calculating',
      }
    case 'UPDATE_ANNUITY':
      return {
        ...state,
        annuities: state.annuities.map((annuity) =>
          annuity.id === action.annuity.id ? action.annuity : annuity
        ),
        calculationStatus: 'calculating',
      }
    case 'START_CALCULATION':
      return {
        ...state,
        lastCalculationInputHash: action.inputHash,
        calculationStatus: 'calculating',
      }
    case 'CALCULATION_COMPLETE':
      // Only update if this is the most recent calculation
      if (action.inputHash === state.lastCalculationInputHash) {
        return {
          ...state,
          cashFlows: action.cashFlows,
          valuations: action.valuations,
          calculationStatus: 'idle',
        }
      }
      return state
    case 'RESTORE':
      return {
        ...sanitizePortfolioState(action.state),
        // Don't trigger calculation until we have price data
        calculationStatus: state.priceData.length > 0 ? 'calculating' : 'idle',
        lastCalculationInputHash: undefined,
      }
    default:
      return state
  }
}

export function performCalculations(
  priceData: PriceData[],
  annuities: Annuity[]
) {
  const cashFlows = annuities
    .flatMap((annuity) => calculateCashFlows(annuity, priceData))
    .sort(
      (a, b) =>
        parsePortfolioDate(a.date).getTime() -
        parsePortfolioDate(b.date).getTime()
    )

  const valuations = calculateValuations(priceData, cashFlows)
  return { cashFlows, valuations }
}

// Update recalculatePortfolio to use performCalculations
export async function recalculatePortfolio(
  state: PortfolioState,
  dispatch: (action: PortfolioAction) => void
): Promise<void> {
  console.log('Recalculate portfolio:', {
    priceDataLength: state.priceData.length,
    annuitiesLength: state.annuities.length,
    status: state.calculationStatus,
  })

  const inputHash = calculateInputHash(state.priceData, state.annuities)

  if (inputHash === state.lastCalculationInputHash) {
    return
  }

  dispatch({ type: 'START_CALCULATION', inputHash })

  const cached = calculationCache.get(inputHash)
  if (cached) {
    dispatch({
      type: 'CALCULATION_COMPLETE',
      ...cached,
      inputHash,
    })
    return
  }

  const worker = getWorker()

  try {
    const result = worker
      ? await worker.calculate(state.priceData, state.annuities)
      : performCalculations(state.priceData, state.annuities)

    calculationCache.set(inputHash, result)
    dispatch({
      type: 'CALCULATION_COMPLETE',
      ...result,
      inputHash,
    })
  } catch (error) {
    console.error('Calculation failed:', error)
    // Optionally dispatch an error action here
  }
}

export function parsePortfolioDate(date: string | Date): Date {
  if (date instanceof Date) return date

  // Handle MM/DD/YYYY format from API
  if (date.includes('/')) {
    const [month, day, year] = date.split('/')
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  // Handle YYYY-MM-DD format
  return parseISO(date)
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
  // if (!result) {
  //   console.warn(`No price data found for date ${date}`)
  // }
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
    date: creationDate.toISOString().split('T')[0],
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
      date: amortizationDate.toISOString().split('T')[0],
      annuityId: annuity.id,
      type: 'outflow',
      usdAmount: monthlyPaymentUSD,
      btcAmount: monthlyPaymentUSD / amortizationDatePrice.price,
    })
  }

  return outflows
}

function calculateCashFlows(
  annuity: Annuity,
  priceData: PriceData[]
): CashFlow[] {
  const inflow = calculateInflow(annuity, priceData)
  const outflows = calculateOutflows(annuity, priceData)
  return [inflow, ...outflows].filter((flow) => flow !== null)
}

function calculateValuations(
  priceData: PriceData[],
  cashFlows: CashFlow[]
): PortfolioValuation[] {
  const valuations: PortfolioValuation[] = []
  let currentBalance = 0

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

  return valuations
}

// Helper function to ensure state has all required fields
export function sanitizePortfolioState(
  state: Partial<PortfolioState>
): PortfolioState {
  return {
    priceData: state.priceData ?? [],
    annuities: state.annuities ?? [],
    cashFlows: state.cashFlows ?? [],
    valuations: state.valuations ?? [],
    calculationStatus: state.calculationStatus ?? 'idle',
    lastCalculationInputHash: state.lastCalculationInputHash,
  }
}
