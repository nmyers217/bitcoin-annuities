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
import { BaseLineChart } from './base-line-chart'
import { AsyncChart } from './shared'

function PortfolioChart({
  data,
  dataKey,
  valuePrefix,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  dataKey: string
  valuePrefix: string
}) {
  return (
    <BaseLineChart
      data={data}
      dataKey={dataKey}
      label={dataKey === 'usdValue' ? 'USD Value' : 'BTC Value'}
      valuePrefix={valuePrefix}
    />
  )
}

function ChartCard({
  title,
  description,
  children,
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
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
          <CardTitle>{title}</CardTitle>
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

  const usdData = state.valuations.map(({ date, usdValue }) => ({
    date,
    usdValue,
  }))
  const btcData = state.valuations.map(({ date, btcValue }) => ({
    date,
    btcValue,
  }))

  // Aggregate outflows by month
  const monthlyIncomeData = state.cashFlows
    .filter((cf) => cf.type === 'outflow')
    .reduce((acc: Record<string, number>, cf) => {
      const month = cf.date.substring(0, 7) // Get YYYY-MM
      acc[month] = (acc[month] ?? 0) + cf.usdAmount
      return acc
    }, {})

  // Convert to array and format for chart
  const monthlyIncomeChartData = Object.entries(monthlyIncomeData)
    .map(([month, total]) => ({
      date: month + '-01', // Convert YYYY-MM to YYYY-MM-DD
      usdValue: total,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <ChartCard
        title="Portfolio Value in USD"
        description="Projected value based on current parameters"
        isLoading={isCalculating}
        icon={BanknoteIcon}
      >
        <AsyncChart isLoading={isPriceLoading} error={error} onRetry={refetch}>
          <PortfolioChart data={usdData} dataKey="usdValue" valuePrefix="$" />
        </AsyncChart>
      </ChartCard>

      <ChartCard
        title="Portfolio Value in BTC"
        description="Bitcoin holdings over time"
        isLoading={isCalculating}
        icon={Bitcoin}
      >
        <AsyncChart isLoading={isPriceLoading} error={error} onRetry={refetch}>
          <PortfolioChart data={btcData} dataKey="btcValue" valuePrefix="₿" />
        </AsyncChart>
      </ChartCard>

      <ChartCard
        title="Monthly Income"
        description="Monthly USD payments"
        isLoading={isCalculating}
        icon={CreditCard}
      >
        <AsyncChart isLoading={isPriceLoading} error={error} onRetry={refetch}>
          <PortfolioChart
            data={monthlyIncomeChartData}
            dataKey="usdValue"
            valuePrefix="$"
          />
        </AsyncChart>
      </ChartCard>
    </div>
  )
}
