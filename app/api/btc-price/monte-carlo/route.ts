import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'
import { isAfter, parseISO, subYears } from 'date-fns'

import { getCachedBitcoinPrice } from '@/lib/bitcoin-price'
import { generateMonteCarloPaths } from '@/lib/monte-carlo'

// Use consistent naming for cache keys and tags
const MONTE_CARLO_CACHE_KEY = ['btc-monte-carlo-v1']
const MONTE_CARLO_CACHE_TAGS = ['btc-monte-carlo-v1', 'btc-price-v2'] // Include both tags since it depends on price data

// Configure the historical data window
const HISTORICAL_YEARS = 13

async function generateMonteCarloSimulation() {
  // Use the shared cached Bitcoin price data
  const historicalPrices = await getCachedBitcoinPrice()

  // Calculate the cutoff date
  const cutoffDate = subYears(new Date(), HISTORICAL_YEARS)

  // Clean the data by removing any entries with zero or invalid prices
  // and filter to only include recent history
  const validPrices = historicalPrices.filter(
    (point) =>
      point.price > 0 &&
      !isNaN(point.price) &&
      isAfter(parseISO(point.date), cutoffDate)
  )

  // Log data range information
  const dataRangeInfo = {
    totalDataPoints: historicalPrices.length,
    validDataPoints: validPrices.length,
    filteredDataPoints: historicalPrices.length - validPrices.length,
    startDate: validPrices[0].date,
    startPrice: validPrices[0].price,
    endDate: validPrices[validPrices.length - 1].date,
    endPrice: validPrices[validPrices.length - 1].price,
    yearsOfHistory: HISTORICAL_YEARS,
  }

  console.log('Data range information:', dataRangeInfo)

  // Generate Monte Carlo paths using only valid prices
  const results = generateMonteCarloPaths(validPrices, 100, 365)

  // Add data range information to metadata
  return {
    ...results,
    metadata: {
      ...results.metadata,
      dataRange: dataRangeInfo,
    },
  }
}

const getCachedMonteCarloResults = unstable_cache(
  async () => {
    return await generateMonteCarloSimulation()
  },
  MONTE_CARLO_CACHE_KEY,
  {
    // revalidate: 43200, // 12 hours
    revalidate: 1, // 1 second for testing
    tags: MONTE_CARLO_CACHE_TAGS,
  }
)

export async function GET() {
  try {
    const results = await getCachedMonteCarloResults()
    return NextResponse.json(results)
  } catch (error) {
    console.error('Monte Carlo simulation failed:', error)
    console.error(
      'Error details:',
      error instanceof Error ? error.message : error
    )
    return NextResponse.json(
      { error: 'Failed to generate Monte Carlo simulation' },
      { status: 500 }
    )
  }
}
