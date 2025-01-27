import { unstable_cache } from 'next/cache'
import { format, fromUnixTime } from 'date-fns'

export interface BitcoinPricePoint {
  date: string
  price: number
}

async function fetchBitcoinPriceData(): Promise<BitcoinPricePoint[]> {
  const response = await fetch(
    'https://api.blockchain.info/charts/market-price?timespan=all&sampled=false&format=json'
  )

  const data = await response.json()

  if (!data.values) {
    throw new Error('Failed to fetch Bitcoin price data')
  }

  return data.values.map(({ x, y }: { x: number; y: number }) => ({
    date: format(fromUnixTime(x), 'yyyy-MM-dd'),
    price: y,
  }))
}

export const getCachedBitcoinPrice = unstable_cache(
  async () => {
    return await fetchBitcoinPriceData()
  },
  ['bitcoin-price-v2'],
  {
    revalidate: 43200, // 12 hours
    tags: ['bitcoin-price-v2'],
  }
)
