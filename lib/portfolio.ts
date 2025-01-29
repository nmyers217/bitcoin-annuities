import * as Comlink from 'comlink'
import { addMonths, differenceInMonths, format } from 'date-fns'

import { type MonteCarloResult, type PriceData } from '@/lib/api'
import { parsePortfolioDate, performCalculations } from '@/lib/calculations'
import {
  type Annuity,
  type PortfolioAction,
  type PortfolioState,
  type ScenarioResults,
  type WorkerAPI,
  type WorkerInstance,
} from '@/lib/types'

let currentWorker: {
  worker: WorkerInstance
  promise: Promise<ScenarioResults>
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
    const wrapped = Comlink.wrap<WorkerAPI>(rawWorker)

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

// Simple cache for memoization
const calculationCache = new Map<string, ScenarioResults>()

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
          scenarios: action.scenarios,
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
    case 'SET_PORTFOLIO_START_DATE': {
      if (!state.portfolioStartDate || !state.annuities.length) return state

      const oldStartDate = parsePortfolioDate(state.portfolioStartDate)
      const newStartDate = parsePortfolioDate(action.date)
      const diffInMillis = newStartDate.getTime() - oldStartDate.getTime()

      return {
        ...state,
        portfolioStartDate: action.date,
        annuities: state.annuities.map((annuity) => ({
          ...annuity,
          createdAt: format(
            new Date(
              parsePortfolioDate(annuity.createdAt).getTime() + diffInMillis
            ),
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

export async function recalculatePortfolio(
  state: PortfolioState,
  dispatch: (action: PortfolioAction) => void,
  monteCarloData?: MonteCarloResult
): Promise<void> {
  const inputHash = calculateInputHash(state.priceData, state.annuities)

  if (inputHash === state.lastCalculationInputHash) {
    return
  }

  dispatch({ type: 'START_CALCULATION', inputHash })

  const cached = calculationCache.get(inputHash)
  if (cached) {
    dispatch({
      type: 'CALCULATION_COMPLETE',
      scenarios: cached,
      inputHash,
    })
    return
  }

  // Terminate any existing worker
  if (currentWorker) {
    terminateCurrentWorker()
  }

  // Create new worker and calculation promise
  const worker = createWorker()
  if (!worker) {
    console.warn('No worker support, falling back to sync calculation')
    const scenarios = performCalculations(
      state.priceData,
      state.annuities,
      monteCarloData
    )
    calculationCache.set(inputHash, scenarios)
    dispatch({
      type: 'CALCULATION_COMPLETE',
      scenarios,
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

    const scenarios = await promise
    console.log('Worker calculation complete')

    // Only process result if this is still the current worker
    if (currentWorker?.promise === promise) {
      calculationCache.set(inputHash, scenarios)
      dispatch({
        type: 'CALCULATION_COMPLETE',
        scenarios,
        inputHash,
      })
    }
  } catch (error) {
    console.error('Calculation failed:', error)
  } finally {
    if (currentWorker?.worker === worker) {
      terminateCurrentWorker()
    }
  }
}

// Helper function to ensure state has all required fields
export function sanitizePortfolioState(
  state: Partial<PortfolioState>
): PortfolioState {
  return {
    priceData: state.priceData ?? [],
    annuities: state.annuities ?? [],
    scenarios: state.scenarios ?? {},
    calculationStatus: state.calculationStatus ?? 'idle',
    lastCalculationInputHash: state.lastCalculationInputHash,
    portfolioStartDate: state.portfolioStartDate ?? null,
  }
}
