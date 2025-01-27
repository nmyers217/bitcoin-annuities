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
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function PortfolioChartCard() {
  const { isLoading, error, refetch } = useBitcoinPrice()
  const { state } = usePortfolio()

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
      >
        <AsyncChart isLoading={isLoading} error={error} onRetry={refetch}>
          <PortfolioChart data={usdData} dataKey="usdValue" valuePrefix="$" />
        </AsyncChart>
      </ChartCard>

      <ChartCard
        title="Portfolio Value in BTC"
        description="Bitcoin holdings over time"
      >
        <AsyncChart isLoading={isLoading} error={error} onRetry={refetch}>
          <PortfolioChart data={btcData} dataKey="btcValue" valuePrefix="₿" />
        </AsyncChart>
      </ChartCard>

      <ChartCard title="Monthly Income" description="Monthly USD payments">
        <AsyncChart isLoading={isLoading} error={error} onRetry={refetch}>
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
