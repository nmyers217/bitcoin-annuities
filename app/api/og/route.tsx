import { ImageResponse } from '@vercel/og'
import { differenceInMonths, parseISO } from 'date-fns'

import {
  calculateMonthlyPaymentUSD,
  convertAmount,
  performCalculations,
} from '@/lib/calculations'
import { deserializeAnnuities } from '@/lib/url-state'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const annuitiesParam = searchParams.get('annuities')

  if (!annuitiesParam) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            padding: '40px',
            background: '#1a1b1e',
          }}
        >
          <h1 style={{ color: 'white' }}>Annuity Portfolio Tracker</h1>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  const annuities = deserializeAnnuities(annuitiesParam)

  // Get both historical and Monte Carlo data
  const [priceData, monteCarloRes] = await Promise.all([
    fetch(new URL('/api/btc-price', request.url)).then((r) => r.json()),
    fetch(new URL('/api/btc-price/monte-carlo', request.url)).then((r) =>
      r.json()
    ),
  ])

  // Calculate scenarios using the full calculation engine
  const results = performCalculations(priceData, annuities, monteCarloRes)
  const averageScenario = results.average

  // Calculate total monthly income by summing each annuity's monthly payment
  const totalMonthlyIncome = annuities.reduce((sum, a) => {
    const annuityCashFlows = averageScenario.cashFlows.filter(
      (cf) => cf.annuityId === a.id
    )
    const creationInflow = annuityCashFlows.find((cf) => cf.type === 'inflow')
    const creationPrice = creationInflow
      ? creationInflow.usdAmount / creationInflow.btcAmount
      : priceData[priceData.length - 1].price

    return sum + calculateMonthlyPaymentUSD(a, creationPrice)
  }, 0)

  // Get the latest historical price and portfolio valuation
  const currentPrice = priceData[priceData.length - 1].price

  // Find the last non-projected valuation
  const currentValuation = averageScenario.valuations
    .filter((v) => !v.isProjection)
    .pop()

  if (!currentValuation) {
    throw new Error(`Could not find non-projected valuation`)
  }
  const currentPortfolioValue = currentValuation.btcValue * currentPrice

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: '40px',
          background: '#1a1b1e',
          gap: '32px',
        }}
      >
        {/* Header Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            width: '100%',
          }}
        >
          <h1
            style={{
              color: 'white',
              margin: 0,
              fontSize: '32px',
              display: 'flex',
            }}
          >
            My BTC Annuity Portfolio
          </h1>

          {/* Metrics Row */}
          <div
            style={{
              display: 'flex',
              gap: '24px',
              width: '100%',
            }}
          >
            {/* Monthly Income Card */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '20px',
                borderRadius: '12px',
              }}
            >
              <p
                style={{
                  color: '#6b7280',
                  fontSize: '18px',
                  margin: 0,
                  marginBottom: '8px',
                  display: 'flex',
                }}
              >
                Monthly Income
              </p>
              <p
                style={{
                  color: '#10b981',
                  fontSize: '32px',
                  margin: 0,
                  fontWeight: 600,
                  display: 'flex',
                }}
              >
                $
                {totalMonthlyIncome.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            {/* Portfolio Value Card */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '20px',
                borderRadius: '12px',
              }}
            >
              <p
                style={{
                  color: '#6b7280',
                  fontSize: '18px',
                  margin: 0,
                  marginBottom: '8px',
                  display: 'flex',
                }}
              >
                Portfolio Value
              </p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <p
                  style={{
                    color: '#10b981',
                    fontSize: '32px',
                    margin: 0,
                    fontWeight: 600,
                    display: 'flex',
                  }}
                >
                  $
                  {currentPortfolioValue.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p
                  style={{
                    color: '#6b7280',
                    fontSize: '18px',
                    margin: 0,
                    display: 'flex',
                  }}
                >
                  {currentValuation.btcValue.toLocaleString(undefined, {
                    maximumFractionDigits: 8,
                  })}{' '}
                  BTC
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Annuities List */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            width: '100%',
          }}
        >
          {annuities.slice(0, 2).map((a, i) => {
            // Find the cash flows for this annuity
            const annuityCashFlows = averageScenario.cashFlows.filter(
              (cf) => cf.annuityId === a.id
            )

            // Get the creation inflow to find the creation price
            const creationInflow = annuityCashFlows.find(
              (cf) => cf.type === 'inflow'
            )
            const creationPrice = creationInflow
              ? creationInflow.usdAmount / creationInflow.btcAmount
              : priceData[priceData.length - 1].price

            // Calculate monthly payment using creation price
            const monthlyPayment = calculateMonthlyPaymentUSD(a, creationPrice)

            const now = new Date()
            const startDate = parseISO(a.createdAt)
            const monthsElapsed =
              startDate > now ? 0 : differenceInMonths(now, startDate)
            const monthsRemaining = Math.max(0, a.termMonths - monthsElapsed)

            // Convert amounts using creation price for display
            const amounts = convertAmount(
              a.principal,
              a.principalCurrency,
              creationPrice
            )

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '16px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                }}
              >
                {/* Top line: Principal and Monthly Payment */}
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    color: 'white',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'baseline',
                    }}
                  >
                    {/* Always show BTC amount first */}
                    <span style={{ fontSize: '20px' }}>
                      BTC{' '}
                      {(a.principalCurrency === 'BTC'
                        ? a.principal
                        : amounts.btcAmount
                      ).toLocaleString(undefined, {
                        maximumFractionDigits: 8,
                      })}
                    </span>
                    <span style={{ color: '#6b7280' }}>•</span>
                    <span style={{ fontSize: '20px' }}>
                      $
                      {(a.principalCurrency === 'BTC'
                        ? amounts.usdAmount
                        : a.principal
                      ).toLocaleString(undefined, {
                        maximumFractionDigits:
                          a.principalCurrency === 'BTC' ? 0 : 2,
                      })}
                    </span>
                  </div>
                  <span style={{ color: '#6b7280' }}>•</span>
                  <span style={{ fontSize: '20px', color: '#10b981' }}>
                    $
                    {monthlyPayment.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                    /mo
                  </span>
                </div>

                {/* Bottom line: Terms and Status */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    color: '#6b7280',
                    fontSize: '16px',
                    alignItems: 'center',
                  }}
                >
                  <span>{a.createdAt}</span>
                  <span>•</span>
                  <span>{a.termMonths} months</span>
                  <span>•</span>
                  <span>{(a.amortizationRate * 100).toFixed(1)}% APY</span>
                  <span>•</span>
                  <span
                    style={{
                      color:
                        monthsRemaining > a.termMonths * 0.66
                          ? '#10b981'
                          : monthsRemaining > a.termMonths * 0.33
                            ? '#eab308'
                            : '#ef4444',
                    }}
                  >
                    {monthsRemaining} payments remaining
                  </span>
                </div>
              </div>
            )
          })}
          {annuities.length > 2 && (
            <div
              style={{
                display: 'flex',
                padding: '16px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                color: '#6b7280',
                fontSize: '16px',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>+{annuities.length - 2} more annuities</span>
              <span style={{ color: '#4b5563' }}>•</span>
              <span>
                $
                {(
                  totalMonthlyIncome -
                  annuities.slice(0, 2).reduce((sum, a) => {
                    const annuityCashFlows = averageScenario.cashFlows.filter(
                      (cf) => cf.annuityId === a.id
                    )
                    const creationInflow = annuityCashFlows.find(
                      (cf) => cf.type === 'inflow'
                    )
                    const creationPrice = creationInflow
                      ? creationInflow.usdAmount / creationInflow.btcAmount
                      : priceData[priceData.length - 1].price

                    return sum + calculateMonthlyPaymentUSD(a, creationPrice)
                  }, 0)
                ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                /mo additional income
              </span>
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
