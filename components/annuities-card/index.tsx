'use client'

import { useState } from 'react'
import { addMonths, format, subMonths } from 'date-fns'

import { AddAnnuityDialog } from '@/components/add-annuity-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { usePortfolio } from '@/contexts/portfolio-context'
import { Annuity, findPriceData, parsePortfolioDate } from '@/lib/portfolio'
import { AnnuitiesList } from './annuities-list'
import { AnnuitiesCardHeader } from './card-header'

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

  const getCreationPrice = (annuity: Annuity) => {
    const price = findPriceData(
      parsePortfolioDate(annuity.createdAt),
      state.priceData
    )
    return price?.price ?? 0
  }

  const handlers = {
    onDelete: (id: string) => {
      dispatch({ type: 'REMOVE_ANNUITY', id })
    },
    onDuplicate: (annuity: Annuity) => {
      dispatch({
        type: 'ADD_ANNUITY',
        annuity: { ...annuity, id: crypto.randomUUID() },
      })
    },
    onAdjustDate: (annuity: Annuity, months: number) => {
      const currentDate = parsePortfolioDate(annuity.createdAt)
      const newDate =
        months > 0
          ? addMonths(currentDate, months)
          : subMonths(currentDate, Math.abs(months))
      dispatch({
        type: 'UPDATE_ANNUITY',
        annuity: { ...annuity, createdAt: format(newDate, 'yyyy-MM-dd') },
      })
    },
    onPortfolioStartDateChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value
      if (!newDate) return
      dispatch({ type: 'SET_PORTFOLIO_START_DATE', date: newDate })
    },
  }

  return (
    <>
      <Card>
        <AnnuitiesCardHeader
          portfolioStartDate={state.portfolioStartDate}
          onPortfolioStartDateChange={handlers.onPortfolioStartDateChange}
        />
        <CardContent>
          <AnnuitiesList
            annuities={state.annuities}
            getCreationPrice={getCreationPrice}
            calculateMonthlyPayment={calculateMonthlyPayment}
            onDelete={handlers.onDelete}
            onDuplicate={handlers.onDuplicate}
            onAdjustDate={handlers.onAdjustDate}
            onEdit={setEditingAnnuity}
          />
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
