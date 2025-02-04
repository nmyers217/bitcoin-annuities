import { NextResponse } from 'next/server'
import { isAfter, parseISO, subYears } from 'date-fns'

import { CACHE_DURATION_SECONDS } from '@/config'
import { fetchBitcoinPriceData } from '@/lib/bitcoin-price'
import { generateMonteCarloPaths } from '@/lib/monte-carlo'

// Configure the historical data window and visible paths
const HISTORICAL_YEARS = 13
const VISIBLE_PATHS = 33

interface ProcessedChartPoint {
  date: string
  bestPrice: number
  worstPrice: number
  averagePrice: number
  [key: `path${number}`]: number
}

async function generateMonteCarloSimulation() {
  // Use the shared cached Bitcoin price data
  const historicalPrices = await fetchBitcoinPriceData()

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

  // Sample paths evenly across the range for better performance
  const sampledPaths = results.paths.filter(
    (_, i) => i % Math.ceil(results.paths.length / VISIBLE_PATHS) === 0
  )

  // Process the data for the chart
  const processedData: ProcessedChartPoint[] =
    sampledPaths[0]?.map((_, timeIndex) => {
      // Get all prices for this time point
      const prices = sampledPaths.map((path) => path[timeIndex].price)

      const point: ProcessedChartPoint = {
        date: sampledPaths[0][timeIndex].date,
        bestPrice: Math.max(...prices),
        worstPrice: Math.min(...prices),
        averagePrice:
          prices.reduce((sum, price) => sum + price, 0) / prices.length,
      }

      // Add each path's price to the point
      sampledPaths.forEach((path, pathIndex) => {
        point[`path${pathIndex}`] = path[timeIndex].price
      })

      return point
    }) || []

  // Calculate min and max values for domain scaling
  const allPrices = processedData.flatMap((point) =>
    Object.entries(point)
      .filter(([key]) => key.startsWith('path'))
      .map(([, value]) => value)
  )
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)

  return {
    chartData: processedData,
    metadata: {
      ...results.metadata,
      dataRange: dataRangeInfo,
      yAxisDomain: {
        min: minPrice * 0.9,
        max: maxPrice * 1.1,
      },
    },
  }
}

export async function GET() {
  try {
    const results = await generateMonteCarloSimulation()

    return NextResponse.json(results, {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_DURATION_SECONDS}`,
      },
    })
  } catch (error) {
    console.error('Monte Carlo simulation failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate Monte Carlo simulation' },
      { status: 500 }
    )
  }
}
