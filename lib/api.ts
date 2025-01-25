export type PriceData = {
  date: string
  price: number
}

export async function fetchBitcoinPrice(): Promise<PriceData[]> {
  const response = await fetch('/api/btc-price')
  if (!response.ok) {
    throw new Error('Failed to fetch Bitcoin price data')
  }
  return response.json()
}
