import { type MonteCarloResult, type PriceData } from '@/lib/api'

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
  isProjection: boolean
  usdAmountBest?: number
  usdAmountWorst?: number
  btcAmountBest?: number
  btcAmountWorst?: number
}

export interface PortfolioValuation {
  date: string
  btcValue: number
  usdValue: number
  isProjection: boolean
}

export type CalculationStatus = 'idle' | 'calculating'

export interface PortfolioState {
  priceData: PriceData[]
  annuities: Annuity[]
  scenarios: ScenarioResults
  calculationStatus: CalculationStatus
  lastCalculationInputHash?: string
  portfolioStartDate: string | null
}

export type WorkerAPI = {
  calculate: (
    priceData: PriceData[],
    annuities: Annuity[],
    monteCarloData?: MonteCarloResult
  ) => Promise<ScenarioResults>
}

export type WorkerInstance = {
  calculate: (
    priceData: PriceData[],
    annuities: Annuity[],
    monteCarloData?: MonteCarloResult
  ) => Promise<ScenarioResults>
  terminate: () => void
}

export type PortfolioAction =
  | { type: 'INITIALIZE'; priceData: PriceData[] }
  | { type: 'ADD_ANNUITY'; annuity: Annuity }
  | { type: 'REMOVE_ANNUITY'; id: string }
  | { type: 'UPDATE_ANNUITY'; annuity: Annuity }
  | { type: 'START_CALCULATION'; inputHash: string }
  | {
      type: 'CALCULATION_COMPLETE'
      scenarios: ScenarioResults
      inputHash: string
    }
  | { type: 'RESTORE'; state: Partial<PortfolioState> }
  | { type: 'SET_PORTFOLIO_START_DATE'; date: string }
  | { type: 'RECALCULATE' }
  | { type: 'SET_SCENARIOS'; scenarios: ScenarioResults }

export type ProjectedPriceData = {
  date: string
  price: number
  isProjection: true
  bestPrice: number
  worstPrice: number
}

export type HistoricalPriceData = PriceData & {
  isProjection: false
}

export type ExtendedPriceData = ProjectedPriceData | HistoricalPriceData

export interface MonthlyIncome {
  date: string
  usdAmount: number
  isProjection: boolean
}

export interface Scenario {
  name: string
  valuations: PortfolioValuation[]
  cashFlows: CashFlow[]
  monthlyIncome: MonthlyIncome[]
  currentState: {
    btcBalance: number
    usdBalance: number
  }
}

export interface SimulationState {
  date: Date
  scenarios: Scenario[]
  activeAnnuities: {
    annuity: Annuity
    remainingTermMonths: number
  }[]
}

export interface PricePoint {
  date: Date
  price: number
  isProjection: boolean
  scenarioPrices: Record<string, number>
}

export interface ScenarioResults {
  [scenarioName: string]: {
    cashFlows: CashFlow[]
    valuations: PortfolioValuation[]
    monthlyIncome: MonthlyIncome[]
  }
}
