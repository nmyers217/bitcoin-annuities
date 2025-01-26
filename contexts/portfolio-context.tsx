import { createContext, useContext, useEffect, useReducer } from 'react'

import { useBitcoinPrice } from '@/hooks/use-bitcoin-price'
import {
  portfolioReducer,
  type PortfolioAction,
  type PortfolioState,
} from '@/lib/portfolio'

const initialState: PortfolioState = {
  priceData: [],
  annuities: [],
  cashFlows: [],
  valuations: [],
}

const PortfolioContext = createContext<{
  state: PortfolioState
  dispatch: React.Dispatch<PortfolioAction>
} | null>(null)

function serializeState(state: PortfolioState): string {
  return JSON.stringify(state)
}

function deserializeState(jsonStr: string): PortfolioState {
  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    console.error('Error deserializing state:', e)
    return initialState
  }
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(portfolioReducer, initialState)

  // Sync with localStorage
  useEffect(() => {
    const saved = localStorage.getItem('portfolio')
    if (saved) {
      dispatch({ type: 'RESTORE', state: deserializeState(saved) })
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('portfolio', serializeState(state))
  }, [state])

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

  const { data: priceData } = useBitcoinPrice()

  useEffect(() => {
    context.dispatch({ type: 'INITIALIZE', priceData: priceData ?? [] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceData])

  return {
    ...context,
  }
}
