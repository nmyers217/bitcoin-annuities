import { format } from 'date-fns'
import { Banknote, Copy, Minus, Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { parsePortfolioDate } from '@/lib/calculations'
import { type Annuity } from '@/lib/types'
import { RemainingMonths } from './remaining-months'

interface AnnuityItemProps {
  annuity: Annuity
  creationPrice: {
    usd: number
    btc: number
  }
  monthlyPayment: number
  onDelete: (id: string) => void
  onDuplicate: (annuity: Annuity) => void
  onAdjustDate: (annuity: Annuity, months: number) => void
  onEdit: (annuity: Annuity) => void
}

export function AnnuityItem({
  annuity,
  creationPrice,
  monthlyPayment,
  onDelete,
  onDuplicate,
  onAdjustDate,
  onEdit,
}: AnnuityItemProps) {
  const startDate = parsePortfolioDate(annuity.createdAt)
  const isStarted = Date.now() > startDate.getTime()

  return (
    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
      <div className="space-y-1">
        <p className="flex items-center gap-3 font-medium">
          <span className="flex items-center gap-1">
            <span className="text-sm">₿</span>
            {creationPrice.btc.toFixed(8)}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="flex items-center gap-1">
            <span className="text-sm">$</span>
            {creationPrice.usd.toLocaleString()}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="flex items-center gap-1">
            <Banknote className="h-4 w-4 text-muted-foreground" />
            {monthlyPayment.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            <span className="text-sm text-muted-foreground">/mo</span>
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          {isStarted ? 'Started' : 'Starts on'} {format(startDate, 'PP')} •{' '}
          {annuity.termMonths} months •{' '}
          {(annuity.amortizationRate * 100).toFixed(1)}% APR
          <RemainingMonths annuity={annuity} />
        </p>
      </div>
      <AnnuityItemActions
        annuity={annuity}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onAdjustDate={onAdjustDate}
        onEdit={onEdit}
      />
    </div>
  )
}

function AnnuityItemActions({
  annuity,
  onDelete,
  onDuplicate,
  onAdjustDate,
  onEdit,
}: Omit<AnnuityItemProps, 'creationPrice' | 'monthlyPayment'>) {
  return (
    <div className="flex gap-2">
      <Button variant="ghost" size="icon" onClick={() => onDuplicate(annuity)}>
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAdjustDate(annuity, -1)}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAdjustDate(annuity, 1)}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onEdit(annuity)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onDelete(annuity.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
