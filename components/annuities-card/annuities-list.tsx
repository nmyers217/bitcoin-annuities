import { Annuity } from '@/lib/portfolio'
import { AnnuityItem } from './annuity-item'

interface AnnuitiesListProps {
  annuities: Annuity[]
  getCreationPrice: (annuity: Annuity) => number
  calculateMonthlyPayment: (annuity: Annuity, creationPrice: number) => number
  onDelete: (id: string) => void
  onDuplicate: (annuity: Annuity) => void
  onAdjustDate: (annuity: Annuity, months: number) => void
  onEdit: (annuity: Annuity) => void
}

export function AnnuitiesList({
  annuities,
  getCreationPrice,
  calculateMonthlyPayment,
  ...actions
}: AnnuitiesListProps) {
  if (annuities.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No annuities added yet
      </p>
    )
  }

  return (
    <div className="divide-y">
      {annuities
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((annuity) => {
          const creationPrice = getCreationPrice(annuity)
          const monthlyPayment = calculateMonthlyPayment(annuity, creationPrice)
          return (
            <AnnuityItem
              key={annuity.id}
              annuity={annuity}
              creationPrice={creationPrice}
              monthlyPayment={monthlyPayment}
              {...actions}
            />
          )
        })}
    </div>
  )
}
