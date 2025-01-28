import { differenceInMonths } from 'date-fns'

import { parsePortfolioDate } from '@/lib/calculations'
import { type Annuity } from '@/lib/types'

interface RemainingMonthsProps {
  annuity: Annuity
}

export function RemainingMonths({ annuity }: RemainingMonthsProps) {
  const startDate = parsePortfolioDate(annuity.createdAt)
  const monthsElapsed = Math.abs(differenceInMonths(new Date(), startDate))
  const monthsRemaining = Math.max(0, annuity.termMonths - monthsElapsed)
  const percentRemaining = monthsRemaining / annuity.termMonths

  let color = 'text-red-500'
  if (percentRemaining > 0.66) {
    color = 'text-green-500'
  } else if (percentRemaining > 0.33) {
    color = 'text-yellow-500'
  }

  return (
    <span className="ml-2 inline-flex items-center">
      <span className={`font-medium ${color}`}>
        • {monthsRemaining} months remaining
      </span>
    </span>
  )
}
