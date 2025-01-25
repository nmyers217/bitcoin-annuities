import { useQuery } from '@tanstack/react-query'

import { fetchBitcoinPrice, type PriceData } from '@/lib/api'

export function useBitcoinPrice() {
  return useQuery<PriceData[]>({
    queryKey: ['bitcoin-price'],
    queryFn: fetchBitcoinPrice,
  })
}
