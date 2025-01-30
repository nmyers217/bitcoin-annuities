import { parseISO } from 'date-fns'
import { TrendingUp } from 'lucide-react'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useMonteCarlo } from '@/hooks/use-monte-carlo'
import { AsyncChart } from './shared'

interface ChartPoint {
  date: string
  bestPrice: number
  worstPrice: number
  averagePrice: number
  [key: `path${number}`]: number
}

function MonteCarloChart() {
  const { data } = useMonteCarlo()
  const chartData = data?.chartData || []
  const yAxisDomain = data?.metadata.yAxisDomain

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        {/* Background paths */}
        {Object.keys(chartData[0] || {})
          .filter((key) => key.startsWith('path'))
          .map((pathKey) => (
            <Line
              key={pathKey}
              type="monotone"
              dataKey={pathKey}
              stroke="#e5e7eb"
              strokeWidth={1}
              dot={false}
              activeDot={false}
              opacity={0.5}
              isAnimationActive={false}
            />
          ))}
        {/* Average price line */}
        <Line
          type="monotone"
          dataKey="averagePrice"
          stroke="#f97316"
          strokeWidth={3}
          dot={false}
          activeDot={{ stroke: '#f97316', fill: '#f97316', r: 4 }}
          isAnimationActive={false}
        />
        {/* Best price line */}
        <Line
          type="monotone"
          dataKey="bestPrice"
          stroke="#4ade80"
          strokeWidth={2}
          dot={false}
          activeDot={{ stroke: '#4ade80', fill: '#4ade80', r: 4 }}
          isAnimationActive={false}
        />
        {/* Worst price line */}
        <Line
          type="monotone"
          dataKey="worstPrice"
          stroke="#f87171"
          strokeWidth={2}
          dot={false}
          activeDot={{ stroke: '#f87171', fill: '#f87171', r: 4 }}
          isAnimationActive={false}
        />
        <XAxis
          dataKey="date"
          type="category"
          tickFormatter={(date) => new Date(date).toLocaleDateString()}
          minTickGap={50}
          stroke="hsl(var(--muted-foreground))"
          tickMargin={5}
        />
        <YAxis
          scale="log"
          domain={yAxisDomain ? [yAxisDomain.min, yAxisDomain.max] : undefined}
          tickFormatter={(value) =>
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              notation: 'compact',
              maximumFractionDigits: 0,
            }).format(value)
          }
          stroke="hsl(var(--muted-foreground))"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow:
              '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          }}
          content={({ active, payload, label }) => {
            if (!active || !payload || !payload.length) return null

            const data = payload[0].payload as ChartPoint
            const date = parseISO(label)
            return (
              <div className="space-y-1 rounded-lg border border-border bg-background p-2 shadow-md">
                <p className="text-sm font-normal text-muted-foreground">
                  {date.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                  <p className="text-sm font-medium text-emerald-400">Best:</p>
                  <p className="font-mono text-sm font-medium tabular-nums text-foreground">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(data.bestPrice)}
                  </p>
                  <p className="text-sm font-medium text-primary">Average:</p>
                  <p className="font-mono text-sm font-medium tabular-nums text-foreground">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(data.averagePrice)}
                  </p>
                  <p className="text-sm font-medium text-red-400">Worst:</p>
                  <p className="font-mono text-sm font-medium tabular-nums text-foreground">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(data.worstPrice)}
                  </p>
                </div>
              </div>
            )
          }}
          itemStyle={{
            color: 'hsl(var(--foreground))',
            fontWeight: 500,
          }}
          labelStyle={{
            color: 'hsl(var(--muted-foreground))',
            fontWeight: 400,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function MonteCarloChartCard() {
  const { isLoading, error, refetch } = useMonteCarlo()

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Monte Carlo Simulation</CardTitle>
          </div>
          <div
            className={`h-2 w-2 rounded-full ${
              isLoading
                ? 'animate-spin border border-gray-400 border-t-transparent'
                : 'bg-green-500'
            }`}
          />
        </div>
        <CardDescription>
          Future price projections based on historical volatility
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative w-full px-6 pb-6">
          <AsyncChart isLoading={isLoading} error={error} onRetry={refetch}>
            <MonteCarloChart />
          </AsyncChart>
        </div>
      </CardContent>
    </Card>
  )
}
