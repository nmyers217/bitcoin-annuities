import { addDays, format } from 'date-fns'

interface PricePoint {
  date: string
  price: number
}

interface MonteCarloResult {
  paths: PricePoint[][]
  metadata: {
    generatedAt: string
    numberOfPaths: number
    projectionDays: number
    lastHistoricalDate: string
    lastHistoricalPrice: number
  }
}

function calculateDailyReturns(prices: PricePoint[]): number[] {
  const returns: number[] = []
  for (let i = 1; i < prices.length; i++) {
    const prevPrice = prices[i - 1].price
    const currentPrice = prices[i].price
    if (prevPrice <= 0 || currentPrice <= 0) {
      console.warn('Invalid price detected:', { prevPrice, currentPrice })
      continue
    }
    returns.push(Math.log(currentPrice / prevPrice))
  }
  return returns
}

function calculateStatistics(returns: number[]): {
  mean: number
  stdDev: number
} {
  if (returns.length === 0) {
    throw new Error('No valid returns to calculate statistics')
  }

  const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length
  const variance =
    returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    (returns.length - 1)

  if (isNaN(mean) || isNaN(variance)) {
    throw new Error('Invalid statistics calculation')
  }

  return { mean, stdDev: Math.sqrt(variance) }
}

export function generateMonteCarloPaths(
  historicalPrices: PricePoint[],
  numberOfPaths: number = 100,
  projectionDays: number = 365
): MonteCarloResult {
  if (!historicalPrices || historicalPrices.length < 2) {
    throw new Error('Insufficient historical price data')
  }

  const dailyReturns = calculateDailyReturns(historicalPrices)
  const { mean, stdDev } = calculateStatistics(dailyReturns)

  const lastHistoricalPrice =
    historicalPrices[historicalPrices.length - 1].price
  const lastHistoricalDate = historicalPrices[historicalPrices.length - 1].date

  if (lastHistoricalPrice <= 0) {
    throw new Error('Invalid last historical price')
  }

  const paths: PricePoint[][] = []

  for (let path = 0; path < numberOfPaths; path++) {
    const pathPrices: PricePoint[] = []
    let currentPrice = lastHistoricalPrice

    for (let day = 1; day <= projectionDays; day++) {
      // Generate random daily return using Box-Muller transform
      const u1 = Math.random()
      const u2 = Math.random()
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      const dailyReturn = mean + stdDev * z

      // Calculate new price
      currentPrice *= Math.exp(dailyReturn)

      // Ensure price doesn't go negative or NaN
      if (currentPrice <= 0 || isNaN(currentPrice)) {
        console.warn('Invalid price generated, resetting to last valid price')
        currentPrice = lastHistoricalPrice
      }

      // Add price point to path
      pathPrices.push({
        date: format(addDays(new Date(lastHistoricalDate), day), 'yyyy-MM-dd'),
        price: currentPrice,
      })
    }

    paths.push(pathPrices)
  }

  return {
    paths,
    metadata: {
      generatedAt: new Date().toISOString(),
      numberOfPaths,
      projectionDays,
      lastHistoricalDate,
      lastHistoricalPrice,
    },
  }
}
