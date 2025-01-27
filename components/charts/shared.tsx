import { AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function LoadingState() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-[300px] w-full" />
    </div>
  )
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p>Failed to load price data</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      </div>
    </div>
  )
}

export function AsyncChart({
  isLoading,
  error,
  onRetry,
  children,
}: {
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  children: React.ReactNode
}) {
  if (isLoading) return <LoadingState />
  if (error) return <ErrorState onRetry={onRetry} />
  return children
}
