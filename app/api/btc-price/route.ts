import { NextResponse } from 'next/server'

import { getCachedBitcoinPrice } from '@/lib/bitcoin-price'

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
