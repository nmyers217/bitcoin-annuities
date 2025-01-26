import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'

async function fetchBitcoinPriceData() {
  // Returns daily price data since 2009
  const response = await fetch(
    'https://api.blockchain.info/charts/market-price?timespan=all&sampled=false&format=json'
  )

  const data = await response.json()

  if (!data.values) {
    return data
  }

  return data.values.map(({ x, y }: { x: number; y: number }) => ({
    date: new Date(x * 1000).toLocaleDateString('en-US'),
    price: y,
  }))
}

const getCachedBitcoinPrice = unstable_cache(
  async () => {
    return await fetchBitcoinPriceData()
  },
  ['bitcoin-price'],
  {
    revalidate: 43200, // 12 hours
    tags: ['bitcoin-price'],
  }
)

export async function GET() {
  try {
    const prices = await getCachedBitcoinPrice()
    return NextResponse.json(prices)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch BTC price' },
      { status: 500 }
    )
  }
}
