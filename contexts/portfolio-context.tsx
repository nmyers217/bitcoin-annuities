import { createContext, useContext, useEffect, useReducer } from 'react'

interface VirtualWallet {
  id: string
  type: 'virtual'
  createdAt: string
  principal: number
  principalCurrency: 'BTC' | 'USD'
  amortizationRate: number
  termMonths: number
}

interface RealWallet {
  id: string
  type: 'real'
  publicKey: string
}

type Wallet = VirtualWallet | RealWallet

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
  return context
}
