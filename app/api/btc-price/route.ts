import { NextResponse } from 'next/server'

// Cache the response for 5 minutes
export const revalidate = 300

export async function GET() {
  try {
    // Using CoinGecko's free API
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily',
      { next: { revalidate } }
    )
    
    const data = await response.json()
    
    // Transform the data into our format
    const prices = data.prices.map(([timestamp, price]: [number, number]) => ({
      date: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      price: price
    }))

    return NextResponse.json(prices)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch BTC price' }, { status: 500 })
  }
} 