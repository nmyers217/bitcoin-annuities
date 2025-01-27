import { useQuery } from '@tanstack/react-query'

export interface MonteCarloPath {
  date: string
  price: number
}

interface ChartPoint {
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

async function fetchMonteCarlo(): Promise<MonteCarloResult> {
  const response = await fetch('/api/btc-price/monte-carlo')
  if (!response.ok) {
    throw new Error('Failed to fetch Monte Carlo simulation')
  }
  return response.json()
}

export function useMonteCarlo() {
  return useQuery({
    queryKey: ['monte-carlo'],
    queryFn: fetchMonteCarlo,
    staleTime: 43200000, // 12 hours in milliseconds
    refetchOnWindowFocus: false,
  })
}
