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

export type CalculationStatus = 'idle' | 'calculating'

export interface PortfolioState {
  priceData: PriceData[]
  annuities: Annuity[]
  cashFlows: CashFlow[]
  valuations: PortfolioValuation[]
  calculationStatus: CalculationStatus
  lastCalculationInputHash?: string
  portfolioStartDate: string | null
}
