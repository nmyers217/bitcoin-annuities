import { differenceInMonths } from 'date-fns'

import { parsePortfolioDate } from '@/lib/calculations'
import { type Annuity } from '@/lib/types'

interface RemainingMonthsProps {
  annuity: Annuity
}

export function RemainingMonths({ annuity }: RemainingMonthsProps) {
  const startDate = parsePortfolioDate(annuity.createdAt)
  const now = new Date()
  // TODO: there is a tiny bug here
  const monthsElapsed = startDate > now ? 0 : differenceInMonths(now, startDate)
  const monthsRemaining = Math.max(0, annuity.termMonths - monthsElapsed)
  const percentRemaining = monthsRemaining / annuity.termMonths

  let color = 'text-red-500'
  if (percentRemaining > 0.66) {
    color = 'text-green-500'
  } else if (percentRemaining > 0.33) {
    color = 'text-yellow-500'
  }

  return (
    <span className="inline-flex items-center">
      <span className={`font-medium ${color}`}>
        {monthsRemaining} payments remaining
      </span>
    </span>
  )
}
