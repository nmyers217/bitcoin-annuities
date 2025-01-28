export type PriceData = {
  date: string
  price: number
}

export interface ChartPoint {
  date: string
  bestPrice: number
  worstPrice: number
  averagePrice: number
  [key: `path${number}`]: number
}

export interface MonteCarloMetadata {
  generatedAt: string
  numberOfPaths: number
  projectionDays: number
  lastHistoricalDate: string
  lastHistoricalPrice: number
  dataRange: {
    totalDataPoints: number
    validDataPoints: number
    filteredDataPoints: number
    startDate: string
    startPrice: number
    endDate: string
    endPrice: number
    yearsOfHistory: number
  }
  yAxisDomain: {
    min: number
    max: number
  }
}

export interface MonteCarloResult {
  chartData: ChartPoint[]
  metadata: MonteCarloMetadata
}

export async function fetchBitcoinPrice(): Promise<PriceData[]> {
  const response = await fetch('/api/btc-price')
  if (!response.ok) {
    throw new Error('Failed to fetch Bitcoin price data')
  }
  return response.json()
}

export async function fetchMonteCarlo(): Promise<MonteCarloResult> {
  const response = await fetch('/api/btc-price/monte-carlo')
  if (!response.ok) {
    throw new Error('Failed to fetch Monte Carlo simulation')
  }
  return response.json()
}
