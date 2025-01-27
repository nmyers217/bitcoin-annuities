'use client'

import { useState } from 'react'
import { addMonths, differenceInMonths, format, subMonths } from 'date-fns'
import {
  Banknote,
  Copy,
  Landmark,
  Minus,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'

import { AddAnnuityDialog } from '@/components/add-annuity-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { usePortfolio } from '@/contexts/portfolio-context'
import { Annuity, findPriceData, parsePortfolioDate } from '@/lib/portfolio'

const calculateMonthlyPayment = (annuity: Annuity, creationPrice: number) => {
  const monthlyRate = annuity.amortizationRate / 12
  const principalUSD =
    annuity.principalCurrency === 'USD'
      ? annuity.principal
      : annuity.principal * creationPrice

  return (
    principalUSD *
    (monthlyRate / (1 - (1 + monthlyRate) ** -annuity.termMonths))
  )
}

export function AnnuitiesCard() {
  const { state, dispatch } = usePortfolio()
  const [editingAnnuity, setEditingAnnuity] = useState<Annuity | undefined>()

  const handleDelete = (id: string) => {
    dispatch({ type: 'REMOVE_ANNUITY', id })
  }

  const handleDuplicate = (annuity: Annuity) => {
    dispatch({
      type: 'ADD_ANNUITY',
      annuity: {
        ...annuity,
        id: crypto.randomUUID(),
      },
    })
  }

  const handleAdjustDate = (annuity: Annuity, months: number) => {
    const currentDate = parsePortfolioDate(annuity.createdAt)
    const newDate =
      months > 0
        ? addMonths(currentDate, months)
        : subMonths(currentDate, Math.abs(months))

    dispatch({
      type: 'UPDATE_ANNUITY',
      annuity: {
        ...annuity,
        createdAt: format(newDate, 'yyyy-MM-dd'),
      },
    })
  }

  const handlePortfolioStartDateChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newDate = e.target.value
    if (!newDate) return
    dispatch({ type: 'SET_PORTFOLIO_START_DATE', date: newDate })
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Active Annuities</CardTitle>
            </div>
            {state.portfolioStartDate && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Portfolio Start:
                </span>
                <Input
                  type="date"
                  value={state.portfolioStartDate}
                  onChange={handlePortfolioStartDateChange}
                  className="w-auto"
                />
              </div>
            )}
          </div>
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
                const monthlyPayment = calculateMonthlyPayment(
                  annuity,
                  creationPrice
                )
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
                        <span className="text-muted-foreground">•</span>
                        <span className="flex items-center gap-1">
                          <Banknote className="h-4 w-4 text-muted-foreground" />
                          {monthlyPayment.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          <span className="text-sm text-muted-foreground">
                            /mo
                          </span>
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Started{' '}
                        {format(parsePortfolioDate(annuity.createdAt), 'PP')} •{' '}
                        {annuity.termMonths} months •{' '}
                        {(annuity.amortizationRate * 100).toFixed(1)}% APR
                        <span className="ml-2 inline-flex items-center">
                          {(() => {
                            const startDate = parsePortfolioDate(
                              annuity.createdAt
                            )
                            const monthsElapsed = Math.abs(
                              differenceInMonths(new Date(), startDate)
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
                        onClick={() => handleDuplicate(annuity)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAdjustDate(annuity, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAdjustDate(annuity, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
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
