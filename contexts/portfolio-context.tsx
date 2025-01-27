import { createContext, useContext, useEffect, useReducer } from 'react'

import { useBitcoinPrice } from '@/hooks/use-bitcoin-price'
import { useMonteCarlo } from '@/hooks/use-monte-carlo'
import {
  portfolioReducer,
  recalculatePortfolio,
  sanitizePortfolioState,
  type PortfolioAction,
  type PortfolioState,
} from '@/lib/portfolio'
import { deserializeAnnuities } from '@/lib/url-state'

const initialState: PortfolioState = {
  priceData: [],
  annuities: [],
  cashFlows: [],
  valuations: [],
  calculationStatus: 'idle',
  portfolioStartDate: null,
  lastCalculationInputHash: undefined,
}

const PortfolioContext = createContext<{
  state: PortfolioState
  dispatch: React.Dispatch<PortfolioAction>
} | null>(null)

function serializeState(state: PortfolioState): string {
  return JSON.stringify(state)
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(portfolioReducer, initialState)
  const { data: priceData } = useBitcoinPrice()
  const { data: monteCarloData } = useMonteCarlo()

  // Handle initial state restoration
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const annuitiesParam = params.get('annuities')

    if (annuitiesParam) {
      const annuities = deserializeAnnuities(annuitiesParam)
      dispatch({
        type: 'RESTORE',
        state: { ...initialState, annuities },
      })
    } else {
      const savedState = localStorage.getItem('portfolioState')
      const initialState = savedState
        ? sanitizePortfolioState(JSON.parse(savedState))
        : sanitizePortfolioState({})
      dispatch({ type: 'RESTORE', state: initialState })
    }
  }, [])

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('portfolioState', serializeState(state))
  }, [state])

  // Handle price data initialization and calculations
  useEffect(() => {
    if (!priceData?.length) return

    // Initialize price data if needed
    if (
      !state.priceData.length ||
      state.priceData[0].date !== priceData[0].date
    ) {
      dispatch({ type: 'INITIALIZE', priceData })
      return
    }

    // Only recalculate if we have all required data and are in calculating state
    if (
      state.calculationStatus === 'calculating' &&
      monteCarloData?.chartData?.length
    ) {
      recalculatePortfolio(state, dispatch, monteCarloData)
    }
  }, [state, priceData, monteCarloData])

  return (
    <PortfolioContext.Provider value={{ state, dispatch }}>
      {children}
    </PortfolioContext.Provider>
  )
}

export function usePortfolio() {
  const context = useContext(PortfolioContext)
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider')
  }

  const { isLoading: isPriceLoading } = useBitcoinPrice()
  const { isLoading: isMonteCarloLoading } = useMonteCarlo()

  return {
    ...context,
    isLoading: isPriceLoading || isMonteCarloLoading,
  }
}
