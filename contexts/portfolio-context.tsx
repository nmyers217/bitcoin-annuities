import { createContext, useContext, useEffect, useReducer } from 'react'

import { useBitcoinPrice } from '@/hooks/use-bitcoin-price'
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

  useEffect(() => {
    localStorage.setItem('portfolioState', serializeState(state))
  }, [state])

  useEffect(() => {
    if (state.calculationStatus === 'calculating') {
      recalculatePortfolio(state, dispatch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.calculationStatus])

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

  const { data: priceData, isLoading } = useBitcoinPrice()

  useEffect(() => {
    context.dispatch({ type: 'INITIALIZE', priceData: priceData ?? [] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceData])

  return {
    ...context,
    isLoading,
  }
}
