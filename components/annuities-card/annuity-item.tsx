import { format } from 'date-fns'
import {
  ArrowRight,
  AtSign,
  Banknote,
  CalendarIcon,
  Clock,
  Copy,
  Info,
  Minus,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
        <div className="flex items-center gap-3">
          <p className="inline-flex items-center gap-2 font-medium">
            <span className="inline-flex items-center gap-1">
              <span className="text-base">₿</span>
              {creationPrice.btc.toFixed(8)}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="inline-flex items-center gap-1">
              <span className="text-base">$</span>
              {creationPrice.usd.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="inline-flex items-center gap-1">
              <Banknote
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="text-base">$</span>
              {monthlyPayment.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
              <span className="text-sm text-muted-foreground">/mo</span>
            </span>
          </p>
          {!isStarted && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 px-2 py-1 text-sm"
                  >
                    Projected
                    <Info className="h-4 w-4 cursor-help" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[250px]">
                    Values shown are based on the average price projection from
                    Monte Carlo simulation
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            {format(startDate, 'PP')}
          </span>
          <span className="text-muted-foreground/50">•</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {annuity.termMonths} months
          </span>
          <span className="text-muted-foreground/50">•</span>
          <span className="inline-flex items-center gap-1">
            <AtSign className="h-4 w-4" />
            {(annuity.amortizationRate * 100).toFixed(1)}% APY
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
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
