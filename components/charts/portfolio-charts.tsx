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
  isLoading,
}: {
  title: string
  description: string
  children: React.ReactNode
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="h-2 w-2 rounded-full">
          <div
            className={`h-full w-full rounded-full ${
              isLoading
                ? 'animate-spin border-2 border-gray-300 border-t-primary'
                : 'bg-green-500'
            }`}
          />
        </div>
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
      >
        <AsyncChart isLoading={isPriceLoading} error={error} onRetry={refetch}>
          <PortfolioChart data={usdData} dataKey="usdValue" valuePrefix="$" />
        </AsyncChart>
      </ChartCard>

      <ChartCard
        title="Portfolio Value in BTC"
        description="Bitcoin holdings over time"
        isLoading={isCalculating}
      >
        <AsyncChart isLoading={isPriceLoading} error={error} onRetry={refetch}>
          <PortfolioChart data={btcData} dataKey="btcValue" valuePrefix="₿" />
        </AsyncChart>
      </ChartCard>

      <ChartCard
        title="Monthly Income"
        description="Monthly USD payments"
        isLoading={isCalculating}
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
