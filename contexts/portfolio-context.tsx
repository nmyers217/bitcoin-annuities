import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'

import { useBitcoinPrice } from '@/hooks/use-bitcoin-price'
import { calculatePortfolioValue } from '@/lib/portfolio'
import type { Wallet } from '@/lib/portfolio'

type PortfolioState = {
  wallets: Wallet[]
}

type PortfolioAction =
  | { type: 'ADD_WALLET'; wallet: Wallet }
  | { type: 'REMOVE_WALLET'; id: string }
  | { type: 'RESTORE'; state: PortfolioState }

const initialState: PortfolioState = {
  wallets: [],
}

function portfolioReducer(
  state: PortfolioState,
  action: PortfolioAction
): PortfolioState {
  switch (action.type) {
    case 'ADD_WALLET':
      return {
        ...state,
        wallets: [...state.wallets, action.wallet],
      }
    case 'REMOVE_WALLET':
      return {
        ...state,
        wallets: state.wallets.filter((wallet) => wallet.id !== action.id),
      }
    case 'RESTORE':
      return action.state
    default:
      return state
  }
}

const PortfolioContext = createContext<{
  state: PortfolioState
  dispatch: React.Dispatch<PortfolioAction>
} | null>(null)

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(portfolioReducer, initialState)

  // Sync with localStorage
  useEffect(() => {
    const saved = localStorage.getItem('portfolio')
    if (saved) {
      dispatch({ type: 'RESTORE', state: JSON.parse(saved) })
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('portfolio', JSON.stringify(state))
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

  const calculatePortfolioData = useMemo(() => {
    if (!priceData?.length) return []
    return calculatePortfolioValue(context.state.wallets, priceData)
  }, [priceData, context.state.wallets])

  return {
    ...context,
    calculatePortfolioData,
  }
}
