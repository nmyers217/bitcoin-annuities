import { BanknoteIcon, Bitcoin, CreditCard } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { usePortfolio } from '@/contexts/portfolio-context'
import { useBitcoinPrice } from '@/hooks/use-bitcoin-price'
import { BaseLineChart, type ChartData } from './base-line-chart'
import { MonteCarloChartCard } from './monte-carlo-chart'
import { AsyncChart } from './shared'

function PortfolioChart({
  data,
  dataKey,
  valuePrefix,
  projectionKeys,
  formatter,
}: {
  data: ChartData[]
  dataKey: string
  valuePrefix: string
  projectionKeys?: {
    best: string
    worst: string
  }
  formatter?: (value: number) => string
}) {
  return (
    <BaseLineChart
      data={data}
      dataKey={dataKey}
      valuePrefix={valuePrefix}
      projectionKeys={projectionKeys}
      formatter={formatter}
    />
  )
}

function ChartCard({
  title,
  description,
  children,
  isLoading,
  icon: Icon,
}: {
  title: string
  description: string
  children: React.ReactNode
  isLoading: boolean
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
            <CardTitle>{title}</CardTitle>
          </div>
          <div
            className={`h-2 w-2 rounded-full ${
              isLoading
                ? 'animate-spin border border-gray-400 border-t-transparent'
                : 'bg-green-500'
            }`}
          />
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function PortfolioChartCard() {
  const { isLoading: isPriceLoading, error, refetch } = useBitcoinPrice()
  const { state } = usePortfolio()
  const isCalculating = state.calculationStatus === 'calculating'

  const aggregatedData = Object.entries(state.scenarios).reduce(
    (acc, [scenarioName, scenario]) => {
      for (const valuation of scenario.valuations) {
        const date = valuation.date
        if (!acc[date]) {
          acc[date] = {
            date,
            usdValue: 0,
            usdValueBest: 0,
            usdValueWorst: 0,
            btcValue: 0,
            btcValueBest: 0,
            btcValueWorst: 0,
          }
        }
        if (scenarioName === 'best') {
          acc[date].usdValueBest = valuation.usdValue
          acc[date].btcValueBest = valuation.btcValue
        } else if (scenarioName === 'worst') {
          acc[date].usdValueWorst = valuation.usdValue
          acc[date].btcValueWorst = valuation.btcValue
        } else {
          acc[date].usdValue = valuation.usdValue
          acc[date].btcValue = valuation.btcValue
        }
      }
      return acc
    },
    {} as Record<string, ChartData>
  )
  const chartData = Object.values(aggregatedData).filter((data) =>
    ['usdValue', 'usdValueBest', 'usdValueWorst'].some((key) => data[key] !== 0)
  )
  const aggregatedMonthlyIncomeData = Object.entries(state.scenarios).reduce(
    (acc, [scenarioName, scenario]) => {
      for (const income of scenario.monthlyIncome) {
        const date = income.date
        if (!acc[date]) {
          acc[date] = {
            date,
            monthlyIncome: 0,
            monthlyIncomeBest: 0,
            monthlyIncomeWorst: 0,
          }
        }
        if (scenarioName === 'best') {
          acc[date].monthlyIncomeBest =
            Number(acc[date].monthlyIncomeBest ?? 0) + income.usdAmount
        } else if (scenarioName === 'worst') {
          acc[date].monthlyIncomeWorst =
            Number(acc[date].monthlyIncomeWorst ?? 0) + income.usdAmount
        } else {
          acc[date].monthlyIncome =
            Number(acc[date].monthlyIncome ?? 0) + income.usdAmount
        }
      }
      return acc
    },
    {} as Record<string, ChartData>
  )
  const monthlyIncomeChartData = Object.values(
    aggregatedMonthlyIncomeData
  ).filter((data) =>
    ['monthlyIncome', 'monthlyIncomeBest', 'monthlyIncomeWorst'].some(
      (key) => data[key] !== 0
    )
  )

  const btcFormatter = (value: number) => {
    // Format with 8 decimal places and remove trailing zeros
    const formatted = value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    })
    return `₿${formatted}`
  }

  return (
    <div className="space-y-6">
      <MonteCarloChartCard />
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          title="Portfolio Value in USD"
          description="Projected value based on current parameters"
          isLoading={isCalculating}
          icon={BanknoteIcon}
        >
          <AsyncChart
            isLoading={isPriceLoading}
            error={error}
            onRetry={refetch}
          >
            <PortfolioChart
              data={chartData}
              dataKey="usdValue"
              valuePrefix="$"
              projectionKeys={{
                best: 'usdValueBest',
                worst: 'usdValueWorst',
              }}
              formatter={(value) =>
                new Intl.NumberFormat('en-US', {
                  notation: 'compact',
                  maximumFractionDigits: 0,
                }).format(value)
              }
            />
          </AsyncChart>
        </ChartCard>

        <ChartCard
          title="Portfolio Value in BTC"
          description="Bitcoin holdings over time"
          isLoading={isCalculating}
          icon={Bitcoin}
        >
          <AsyncChart
            isLoading={isPriceLoading}
            error={error}
            onRetry={refetch}
          >
            <PortfolioChart
              data={chartData}
              dataKey="btcValue"
              valuePrefix=""
              projectionKeys={{
                best: 'btcValueBest',
                worst: 'btcValueWorst',
              }}
              formatter={btcFormatter}
            />
          </AsyncChart>
        </ChartCard>

        <ChartCard
          title="Monthly Income"
          description="Monthly USD payments"
          isLoading={isCalculating}
          icon={CreditCard}
        >
          <AsyncChart
            isLoading={isPriceLoading}
            error={error}
            onRetry={refetch}
          >
            <PortfolioChart
              data={monthlyIncomeChartData}
              dataKey="monthlyIncome"
              valuePrefix="$"
              projectionKeys={{
                best: 'monthlyIncomeBest',
                worst: 'monthlyIncomeWorst',
              }}
              formatter={(value) =>
                new Intl.NumberFormat('en-US', {
                  notation: 'standard',
                  maximumFractionDigits: 0,
                }).format(value)
              }
            />
          </AsyncChart>
        </ChartCard>
      </div>
    </div>
  )
}
