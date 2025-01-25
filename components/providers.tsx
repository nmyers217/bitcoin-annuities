'use client'

import { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { PortfolioProvider } from '@/contexts/portfolio-context'

const queryClient = new QueryClient()

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PortfolioProvider>{children}</PortfolioProvider>
    </QueryClientProvider>
  )
}
