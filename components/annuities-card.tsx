'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'

import { AddAnnuityDialog } from '@/components/add-annuity-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { usePortfolio } from '@/contexts/portfolio-context'
import { Annuity, findPriceData, parsePortfolioDate } from '@/lib/portfolio'

export function AnnuitiesCard() {
  const { state, dispatch } = usePortfolio()
  const [editingAnnuity, setEditingAnnuity] = useState<Annuity | undefined>()

  const handleDelete = (id: string) => {
    dispatch({ type: 'REMOVE_ANNUITY', id })
  }

  const getCreationPrice = (annuity: Annuity) => {
    const price = findPriceData(
      parsePortfolioDate(annuity.createdAt),
      state.priceData
    )
    return price?.price ?? 0
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Active Annuities</CardTitle>
          <CardDescription>
            Manage your current annuity contracts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {state.annuities
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
              .map((annuity) => {
                const creationPrice = getCreationPrice(annuity)
                return (
                  <div
                    key={annuity.id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <p className="flex items-center gap-3 font-medium">
                        <span className="flex items-center gap-1">
                          <span className="text-sm">₿</span>
                          {annuity.principalCurrency === 'BTC'
                            ? annuity.principal.toFixed(8)
                            : (annuity.principal / creationPrice).toFixed(8)}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="flex items-center gap-1">
                          <span className="text-sm">$</span>
                          {annuity.principalCurrency === 'USD'
                            ? annuity.principal.toLocaleString()
                            : (
                                annuity.principal * creationPrice
                              ).toLocaleString()}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Started{' '}
                        {new Date(annuity.createdAt).toLocaleDateString()} •{' '}
                        {annuity.termMonths} months •{' '}
                        {(annuity.amortizationRate * 100).toFixed(1)}% APR
                        <span className="ml-2 inline-flex items-center">
                          {(() => {
                            const startDate = parsePortfolioDate(
                              annuity.createdAt
                            )
                            const monthsElapsed = Math.floor(
                              (new Date().getTime() - startDate.getTime()) /
                                (1000 * 60 * 60 * 24 * 30)
                            )
                            const monthsRemaining = Math.max(
                              0,
                              annuity.termMonths - monthsElapsed
                            )
                            const percentRemaining =
                              monthsRemaining / annuity.termMonths

                            let color = 'text-red-500'
                            if (percentRemaining > 0.66) {
                              color = 'text-green-500'
                            } else if (percentRemaining > 0.33) {
                              color = 'text-yellow-500'
                            }

                            return (
                              <span className={`font-medium ${color}`}>
                                • {monthsRemaining} months remaining
                              </span>
                            )
                          })()}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingAnnuity(annuity)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(annuity.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            {state.annuities.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No annuities added yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      <AddAnnuityDialog
        open={!!editingAnnuity}
        onOpenChange={(open) => !open && setEditingAnnuity(undefined)}
        editAnnuity={editingAnnuity}
      />
    </>
  )
}
