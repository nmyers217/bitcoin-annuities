import * as Comlink from 'comlink'
import {
  addMonths,
  differenceInMonths,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
} from 'date-fns'

import { type MonteCarloResult } from '@/hooks/use-monte-carlo'
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
  btcValueBest?: number
  btcValueWorst?: number
  usdValue: number
  usdValueBest?: number
  usdValueWorst?: number
}

type CalculationStatus = 'idle' | 'calculating'

export interface PortfolioState {
  priceData: PriceData[]
  annuities: Annuity[]
  cashFlows: CashFlow[]
  valuations: PortfolioValuation[]
  calculationStatus: CalculationStatus
  lastCalculationInputHash?: string
  portfolioStartDate: string | null
}

type WorkerAPI = {
  calculate: (
    priceData: PriceData[],
    annuities: Annuity[],
    monteCarloData?: MonteCarloResult
  ) => Promise<{
    cashFlows: CashFlow[]
    valuations: PortfolioValuation[]
  }>
}

type WorkerInstance = {
  calculate: (
    priceData: PriceData[],
    annuities: Annuity[],
    monteCarloData?: MonteCarloResult
  ) => Promise<{
    cashFlows: CashFlow[]
    valuations: PortfolioValuation[]
  }>
  terminate: () => void
}

let currentWorker: {
  worker: WorkerInstance
  promise: Promise<{ cashFlows: CashFlow[]; valuations: PortfolioValuation[] }>
} | null = null

function terminateCurrentWorker() {
  if (currentWorker) {
    currentWorker.worker.terminate()
    currentWorker = null
  }
}

function createWorker(): WorkerInstance | null {
  if (typeof Worker === 'undefined') {
    console.warn('Web Workers are not supported in this environment')
    return null
  }

  let rawWorker: Worker
  try {
    console.log('Creating worker in', process.env.NODE_ENV, 'mode')
    if (process.env.NODE_ENV === 'production') {
      console.log('Using production worker path: /portfolio.worker.js')
      rawWorker = new Worker('/portfolio.worker.js')
    } else {
      console.log('Using development worker path')
      rawWorker = new Worker(new URL('./portfolio.worker.ts', import.meta.url))
    }
    console.log('Worker created successfully')

    console.log('Wrapping worker with Comlink...')
    const wrapped = Comlink.wrap<WorkerAPI>(rawWorker)
    console.log('Worker wrapped successfully')

    return {
      calculate: wrapped.calculate.bind(wrapped),
      terminate: () => {
        console.log('Terminating worker')
        rawWorker.terminate()
        console.log('Worker terminated')
      },
    }
  } catch (error) {
    console.error('Failed to create worker:', error)
    return null
  }
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
  | { type: 'RESTORE'; state: Partial<PortfolioState> }
  | { type: 'SET_PORTFOLIO_START_DATE'; date: string }
  | { type: 'RECALCULATE' }
  | { type: 'SET_CASH_FLOWS'; cashFlows: CashFlow[] }
  | { type: 'SET_VALUATIONS'; valuations: PortfolioValuation[] }

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
        calculationStatus: 'calculating',
      }
    case 'ADD_ANNUITY': {
      const newAnnuities = [...state.annuities, action.annuity]
      const oldestDate = newAnnuities.reduce(
        (oldest, annuity) =>
          annuity.createdAt < oldest ? annuity.createdAt : oldest,
        newAnnuities[0].createdAt
      )
      return {
        ...state,
        annuities: newAnnuities,
        portfolioStartDate: state.portfolioStartDate || oldestDate,
        calculationStatus: 'calculating',
      }
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
    case 'RESTORE': {
      const sanitizedState = sanitizePortfolioState(action.state)
      const oldestDate = sanitizedState.annuities.length
        ? sanitizedState.annuities.reduce(
            (oldest, annuity) =>
              annuity.createdAt < oldest ? annuity.createdAt : oldest,
            sanitizedState.annuities[0].createdAt
          )
        : null

      return {
        ...sanitizedState,
        portfolioStartDate: oldestDate,
        calculationStatus: state.priceData.length > 0 ? 'calculating' : 'idle',
        lastCalculationInputHash: undefined,
      }
    }
    case 'RECALCULATE':
      return {
        ...state,
        calculationStatus: 'calculating',
      }
    case 'SET_CASH_FLOWS':
      return {
        ...state,
        cashFlows: action.cashFlows,
        calculationStatus: 'calculating',
      }
    case 'SET_VALUATIONS':
      return {
        ...state,
        valuations: action.valuations,
        calculationStatus: 'calculating',
      }
    case 'SET_PORTFOLIO_START_DATE': {
      if (!state.portfolioStartDate || !state.annuities.length) return state

      const monthsDiff = differenceInMonths(
        parsePortfolioDate(action.date),
        parsePortfolioDate(state.portfolioStartDate)
      )

      return {
        ...state,
        portfolioStartDate: action.date,
        annuities: state.annuities.map((annuity) => ({
          ...annuity,
          createdAt: format(
            addMonths(parsePortfolioDate(annuity.createdAt), monthsDiff),
            'yyyy-MM-dd'
          ),
        })),
        calculationStatus: 'calculating',
      }
    }
    default:
      return state
  }
}

export function performCalculations(
  priceData: PriceData[],
  annuities: Annuity[],
  monteCarloData?: MonteCarloResult
) {
  const cashFlows = annuities
    .flatMap((annuity) => calculateCashFlows(annuity, priceData))
    .sort(
      (a, b) =>
        parsePortfolioDate(a.date).getTime() -
        parsePortfolioDate(b.date).getTime()
    )

  const valuations = calculateValuations(priceData, cashFlows, monteCarloData)
  return { cashFlows, valuations }
}

// Update recalculatePortfolio to use performCalculations
export async function recalculatePortfolio(
  state: PortfolioState,
  dispatch: (action: PortfolioAction) => void,
  monteCarloData?: MonteCarloResult
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

  // Terminate any existing worker
  if (currentWorker) {
    console.log('Terminating existing worker')
    terminateCurrentWorker()
  }

  // Create new worker and calculation promise
  console.log('Creating new worker')
  const worker = createWorker()
  if (!worker) {
    console.warn('No worker support, falling back to sync calculation')
    // Fallback to sync calculation if no worker support
    const result = performCalculations(
      state.priceData,
      state.annuities,
      monteCarloData
    )
    calculationCache.set(inputHash, result)
    dispatch({
      type: 'CALCULATION_COMPLETE',
      ...result,
      inputHash,
    })
    return
  }

  try {
    console.log('Starting worker calculation')
    const promise = worker.calculate(
      state.priceData,
      state.annuities,
      monteCarloData
    )
    currentWorker = { worker, promise }

    const result = await promise
    console.log('Worker calculation complete')

    // Only process result if this is still the current worker
    if (currentWorker?.promise === promise) {
      console.log('Caching and dispatching result')
      calculationCache.set(inputHash, result)
      dispatch({
        type: 'CALCULATION_COMPLETE',
        ...result,
        inputHash,
      })
    } else {
      console.log('Discarding outdated worker result')
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Calculation failed:', {
        error: error.message,
        stack: error.stack,
      })
    }
  } finally {
    if (currentWorker?.worker === worker) {
      console.log('Cleaning up worker')
      terminateCurrentWorker()
    }
  }
}

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
  cashFlows: CashFlow[],
  monteCarloData?: MonteCarloResult
): PortfolioValuation[] {
  const valuations: PortfolioValuation[] = []
  let currentBalance = 0

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
    portfolioStartDate: state.portfolioStartDate ?? null,
  }
}
