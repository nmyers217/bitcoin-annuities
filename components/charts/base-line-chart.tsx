import { Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartContainer } from '@/components/ui/chart'

export function BaseLineChart({
  data,
  dataKey,
  label,
  valuePrefix,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  dataKey: string
  label: string
  valuePrefix: string
}) {
  return (
    <ChartContainer
      config={{
        [dataKey]: {
          label,
          color: 'orange',
        },
      }}
    >
      <LineChart data={data}>
        <XAxis
          dataKey="date"
          interval="preserveStartEnd"
          tickFormatter={(value) => {
            const date = new Date(value)
            return date.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })
          }}
          padding={{ left: 30, right: 30 }}
          tickMargin={15}
          minTickGap={100}
        />
        <YAxis
          width={80}
          tickFormatter={(value) => `${valuePrefix}${value.toLocaleString()}`}
        />
        <Tooltip
          formatter={(value: number) => [
            `${valuePrefix}${value.toLocaleString()}`,
            label,
          ]}
          labelFormatter={(label) => {
            const date = new Date(label)
            return date.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
          }}
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow:
              '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
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
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke="orange"
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ChartContainer>
  )
}
