import { format, fromUnixTime } from 'date-fns'

import { CACHE_DURATION_SECONDS } from '@/config'

export interface BitcoinPricePoint {
  date: string
  price: number
}

export async function fetchBitcoinPriceData(): Promise<BitcoinPricePoint[]> {
  console.log('Attempting to fetch Bitcoin price data...')

  const response = await fetch(
    'https://api.blockchain.info/charts/market-price?timespan=all&sampled=false&format=json',
    {
      cache: 'force-cache', // This should work in both dev and prod
      next: {
        revalidate: CACHE_DURATION_SECONDS,
      },
    }
  )

  console.log('Response Status:', response.status)
  console.log('Response Cache Status:', response.headers.get('x-vercel-cache'))
  console.log('Response Cache-Control:', response.headers.get('cache-control'))

  const data = await response.json()

  if (!data.values) {
    throw new Error('Failed to fetch Bitcoin price data')
  }

  return data.values.map(({ x, y }: { x: number; y: number }) => ({
    date: format(fromUnixTime(x), 'yyyy-MM-dd'),
    price: y,
  }))
}
