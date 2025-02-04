import { NextResponse } from 'next/server'

import { CACHE_DURATION_SECONDS } from '@/config'
import { fetchBitcoinPriceData } from '@/lib/bitcoin-price'

export async function GET() {
  try {
    const prices = await fetchBitcoinPriceData()

    return NextResponse.json(prices, {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_DURATION_SECONDS}`,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch BTC price' },
      { status: 500 }
    )
  }
}
