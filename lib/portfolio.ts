import { addMonths, isSameDay, parseISO, startOfMonth } from 'date-fns'

import { type PriceData } from '@/lib/api'

export type Annuity = {
  id: string
  createdAt: string
  principal: number
  principalCurrency: 'BTC' | 'USD'
  amortizationRate: number
  termMonths: number
}

export interface CashFlow {
  date: string
  annuityId: string
  type: 'inflow' | 'outflow'
  usdAmount: number
  btcAmount: number
}

export interface PortfolioValuation {
  date: string
  btcValue: number
  usdValue: number
}

export type PortfolioState = {
  // First the price data is fetched from the API
  priceData: PriceData[]
  // Then the annuities are added
  annuities: Annuity[]
  // Then the cash flows are calculated
  cashFlows: CashFlow[]
  // Then the valuations are calculated
  valuations: PortfolioValuation[]
}

export type PortfolioAction =
  | { type: 'INITIALIZE'; priceData: PriceData[] }
  | { type: 'ADD_ANNUITY'; annuity: Annuity }
  | { type: 'REMOVE_ANNUITY'; id: string }
  | { type: 'UPDATE_ANNUITY'; annuity: Annuity }
  | { type: 'RECALCULATE' }
  | { type: 'RESTORE'; state: PortfolioState }

export function portfolioReducer(
  state: PortfolioState,
  action: PortfolioAction
): PortfolioState {
  switch (action.type) {
    case 'INITIALIZE':
      return recalculatePortfolio({
        ...state,
        priceData: action.priceData,
      })
    case 'ADD_ANNUITY':
      return recalculatePortfolio({
        ...state,
        annuities: [...state.annuities, action.annuity],
      })
    case 'REMOVE_ANNUITY':
      return recalculatePortfolio({
        ...state,
        annuities: state.annuities.filter(
          (annuity) => annuity.id !== action.id
        ),
      })
    case 'UPDATE_ANNUITY':
      return recalculatePortfolio({
        ...state,
        annuities: state.annuities.map((annuity) =>
          annuity.id === action.annuity.id ? action.annuity : annuity
        ),
      })
    case 'RECALCULATE':
      return recalculatePortfolio(state)
    case 'RESTORE':
      return action.state
    default:
      return state
  }
}

export function recalculatePortfolio(state: PortfolioState): PortfolioState {
  const cashFlows = state.annuities
    .flatMap((annuity) => calculateCashFlows(annuity, state.priceData))
    .sort(
      (a, b) =>
        parsePortfolioDate(a.date).getTime() -
        parsePortfolioDate(b.date).getTime()
    )

  const valuations = calculateValuations(state.priceData, cashFlows)

  return { ...state, cashFlows, valuations }
}

export function parsePortfolioDate(date: string | Date): Date {
  if (date instanceof Date) return date

  // Handle MM/DD/YYYY format from API
  if (date.includes('/')) {
    const [month, day, year] = date.split('/')
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  // Handle YYYY-MM-DD format
  return parseISO(date)
}

export function* iterateMonths(
  startDate: Date,
  numberOfMonths: number
): Generator<Date> {
  for (let i = 1; i <= numberOfMonths; i++) {
    yield startOfMonth(addMonths(startDate, i))
  }
}

export function findPriceData(
  date: Date,
  priceData: PriceData[]
): PriceData | null {
  const result = priceData.find((p) =>
    isSameDay(parsePortfolioDate(p.date), date)
  )
  // if (!result) {
  //   console.warn(`No price data found for date ${date}`)
  // }
  return result ?? null
}

export function calculateInflow(
  annuity: Annuity,
  priceData: PriceData[]
): CashFlow | null {
  const creationDate = parsePortfolioDate(annuity.createdAt)
  const creationPrice = findPriceData(creationDate, priceData)
  if (!creationPrice) return null

  return {
    usdAmount:
      annuity.principalCurrency === 'USD'
        ? annuity.principal
        : annuity.principal * creationPrice.price,
    btcAmount:
      annuity.principalCurrency === 'BTC'
        ? annuity.principal
        : annuity.principal / creationPrice.price,
    date: creationDate.toISOString().split('T')[0],
    annuityId: annuity.id,
    type: 'inflow',
  }
}

export function calculateOutflows(
  annuity: Annuity,
  priceData: PriceData[]
): CashFlow[] {
  const monthlyRate = annuity.amortizationRate / 12
  const creationDate = parsePortfolioDate(annuity.createdAt)
  const creationPrice = findPriceData(creationDate, priceData)
  if (!creationPrice) return []

  const principalUSD =
    annuity.principalCurrency === 'USD'
      ? annuity.principal
      : annuity.principal * creationPrice.price

  const monthlyPaymentUSD =
    principalUSD *
    (monthlyRate / (1 - (1 + monthlyRate) ** -annuity.termMonths))

  const outflows: CashFlow[] = []

  for (const amortizationDate of iterateMonths(
    creationDate,
    annuity.termMonths
  )) {
    const amortizationDatePrice = findPriceData(amortizationDate, priceData)
    if (!amortizationDatePrice) continue

    outflows.push({
      date: amortizationDate.toISOString().split('T')[0],
      annuityId: annuity.id,
      type: 'outflow',
      usdAmount: monthlyPaymentUSD,
      btcAmount: monthlyPaymentUSD / amortizationDatePrice.price,
    })
  }

  return outflows
}

function calculateCashFlows(
  annuity: Annuity,
  priceData: PriceData[]
): CashFlow[] {
  const inflow = calculateInflow(annuity, priceData)
  const outflows = calculateOutflows(annuity, priceData)
  return [inflow, ...outflows].filter((flow) => flow !== null)
}

function calculateValuations(
  priceData: PriceData[],
  cashFlows: CashFlow[]
): PortfolioValuation[] {
  const valuations: PortfolioValuation[] = []
  let currentBalance = 0

  for (const cashFlow of cashFlows) {
    currentBalance +=
      cashFlow.type === 'inflow' ? cashFlow.btcAmount : -cashFlow.btcAmount

    const price = findPriceData(parsePortfolioDate(cashFlow.date), priceData)
    if (!price) continue

    valuations.push({
      date: cashFlow.date,
      btcValue: currentBalance,
      usdValue: currentBalance * price.price,
    })
  }

  return valuations
}
