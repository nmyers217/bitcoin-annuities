import { Landmark } from 'lucide-react'

import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface AnnuitiesCardHeaderProps {
  portfolioStartDate: string | null
  onPortfolioStartDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function AnnuitiesCardHeader({
  portfolioStartDate,
  onPortfolioStartDateChange,
}: AnnuitiesCardHeaderProps) {
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Active Annuities</CardTitle>
        </div>
        {portfolioStartDate && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Portfolio Start:
            </span>
            <Input
              type="date"
              value={portfolioStartDate}
              onChange={onPortfolioStartDateChange}
              className="w-auto"
            />
          </div>
        )}
      </div>
      <CardDescription>Manage your current annuity contracts</CardDescription>
    </CardHeader>
  )
}
