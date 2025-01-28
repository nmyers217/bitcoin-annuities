import { useQuery } from '@tanstack/react-query'

import { fetchMonteCarlo } from '@/lib/api'

export function useMonteCarlo() {
  return useQuery({
    queryKey: ['monte-carlo'],
    queryFn: fetchMonteCarlo,
    staleTime: 43200000, // 12 hours in milliseconds
    refetchOnWindowFocus: false,
  })
}
