import { addMonths, isSameDay } from 'date-fns'

import { type PriceData } from '@/lib/api'

export interface VirtualWallet {
  id: string
  type: 'virtual'
  createdAt: string
  principal: number
  principalCurrency: 'BTC' | 'USD'
  amortizationRate: number
  termMonths: number
}

export interface RealWallet {
  id: string
  type: 'real'
  publicKey: string
}

export type Wallet = VirtualWallet | RealWallet

export interface CashFlow {
  date: string
  walletId: string
  type: 'inflow' | 'outflow'
  usdAmount: number
  btcAmount: number
}

export interface PortfolioValuation {
  date: string
  btcValue: number
  usdValue: number
}

export type PortfolioState = {
  priceData: PriceData[]
  wallets: Wallet[]
  cashFlows: CashFlow[]
  valuations: PortfolioValuation[]
}

export type PortfolioAction =
  | { type: 'INITIALIZE'; priceData: PriceData[] }
  | { type: 'ADD_WALLET'; wallet: Wallet }
  | { type: 'REMOVE_WALLET'; id: string }
  | { type: 'UPDATE_WALLET'; wallet: Wallet }
  | { type: 'RECALCULATE' }
  | { type: 'RESTORE'; state: PortfolioState }

export function recalculatePortfolio(state: PortfolioState): PortfolioState {
  const cashFlows = state.wallets
    .flatMap((wallet) => calculateWalletCashFlows(wallet, state.priceData))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const valuations = state.wallets
    .flatMap((wallet) =>
      calculateWalletValuations(wallet, state.priceData, cashFlows)
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return { ...state, cashFlows, valuations }
}

export function portfolioReducer(
  state: PortfolioState,
  action: PortfolioAction
): PortfolioState {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        priceData: action.priceData,
      }
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
    case 'UPDATE_WALLET':
      return {
        ...state,
        wallets: state.wallets.map((wallet) =>
          wallet.id === action.wallet.id ? action.wallet : wallet
        ),
      }
    case 'RECALCULATE':
      return recalculatePortfolio(state)
    case 'RESTORE':
      return action.state
    default:
      return state
  }
}

function calculateWalletCashFlows(
  wallet: Wallet,
  priceData: PriceData[]
): CashFlow[] {
  if (wallet.type === 'real') {
    // TODO: we need to figure out how to get the transactions for a real wallet from a blockhain explorer API
    return []
  }

  const cashFlows: CashFlow[] = []
  const walletCreationDate = new Date(wallet.createdAt)
  const walletCreationDatePrice = priceData.find((p) =>
    isSameDay(new Date(p.date), walletCreationDate)
  )

  if (!walletCreationDatePrice) {
    console.warn(
      `No price data found for wallet creation date ${walletCreationDate}`
    )
    return cashFlows
  }

  const bitcoinPrice = walletCreationDatePrice.price
  const usdAmount =
    wallet.principalCurrency === 'USD'
      ? wallet.principal
      : wallet.principal * bitcoinPrice
  const btcAmount =
    wallet.principalCurrency === 'BTC'
      ? wallet.principal
      : wallet.principal / bitcoinPrice
  cashFlows.push({
    date: walletCreationDate.toISOString(),
    walletId: wallet.id,
    type: 'inflow',
    usdAmount,
    btcAmount,
  })

  const monthlyRate = wallet.amortizationRate / 12
  const monthlyPayment =
    wallet.principal *
    (monthlyRate / (1 - (1 + monthlyRate) ** -wallet.termMonths))

  for (let i = 1; i < wallet.termMonths; i++) {
    const amortizationDate = addMonths(walletCreationDate, i)
    const amortizationDatePrice = priceData.find((p) =>
      isSameDay(new Date(p.date), amortizationDate)
    )

    if (!amortizationDatePrice) {
      console.warn(
        `No price data found for amortization date ${amortizationDate}`
      )
      continue
    }

    const bitcoinPrice = amortizationDatePrice.price
    const usdAmount =
      wallet.principalCurrency === 'USD'
        ? monthlyPayment
        : monthlyPayment * bitcoinPrice
    const btcAmount =
      wallet.principalCurrency === 'BTC'
        ? monthlyPayment
        : monthlyPayment / bitcoinPrice
    cashFlows.push({
      date: amortizationDate.toISOString(),
      walletId: wallet.id,
      type: 'outflow',
      usdAmount,
      btcAmount,
    })
  }

  return cashFlows
}

function calculateWalletValuations(
  wallet: Wallet,
  priceData: PriceData[],
  cashFlows: CashFlow[]
): PortfolioValuation[] {
  const valuations: PortfolioValuation[] = []

  let currentBalance = 0

  for (const cashFlow of cashFlows) {
    if (cashFlow.walletId !== wallet.id) {
      continue
    }

    currentBalance =
      cashFlow.type === 'inflow'
        ? currentBalance + cashFlow.btcAmount
        : currentBalance - cashFlow.btcAmount

    const flowDate = new Date(cashFlow.date)
    const flowDatePrice = priceData.find((p) =>
      isSameDay(new Date(p.date), flowDate)
    )

    if (!flowDatePrice) {
      console.warn(`No price data found for flow date ${flowDate}`)
      continue
    }

    valuations.push({
      date: flowDate.toISOString(),
      btcValue: currentBalance,
      usdValue: currentBalance * flowDatePrice.price,
    })
  }

  return valuations
}
