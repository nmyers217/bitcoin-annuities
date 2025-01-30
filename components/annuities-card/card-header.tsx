import { format } from 'date-fns'
import { CalendarIcon, Landmark } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { parsePortfolioDate } from '@/lib/calculations'

interface AnnuitiesCardHeaderProps {
  portfolioStartDate: string | null
  onPortfolioStartDateChange: (date: string) => void
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[240px] pl-3 text-left font-normal"
                >
                  {portfolioStartDate ? (
                    format(parsePortfolioDate(portfolioStartDate), 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parsePortfolioDate(portfolioStartDate)}
                  defaultMonth={parsePortfolioDate(portfolioStartDate)}
                  onSelect={(date) =>
                    onPortfolioStartDateChange(date ? date.toISOString() : '')
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
      <CardDescription>Manage your current annuity contracts</CardDescription>
    </CardHeader>
  )
}
