import React from 'react'
import { parseISO } from 'date-fns'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface ChartData {
  date: string
  [key: string]: number | string
}

export function BaseLineChart({
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
  const defaultFormatter = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        {/* Worst case projection */}
        {projectionKeys && (
          <Line
            type="monotone"
            dataKey={projectionKeys.worst}
            stroke="#f87171"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        )}
        {/* Best case projection */}
        {projectionKeys && (
          <Line
            type="monotone"
            dataKey={projectionKeys.best}
            stroke="#4ade80"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        )}
        {/* Base line */}
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <XAxis
          dataKey="date"
          type="category"
          tickFormatter={(date) => new Date(date).toLocaleDateString()}
          minTickGap={50}
          stroke="hsl(var(--muted-foreground))"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis
          tickFormatter={(value) => (formatter ?? defaultFormatter)(value)}
          stroke="hsl(var(--muted-foreground))"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          allowDecimals={true}
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

            const date = parseISO(label)
            const data = payload[0].payload
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
                  {projectionKeys &&
                    data[projectionKeys.best] !== undefined && (
                      <>
                        <p className="text-sm font-medium text-emerald-400">
                          Best:
                        </p>
                        <p className="font-mono text-sm font-medium tabular-nums text-foreground">
                          {valuePrefix}
                          {(formatter ?? defaultFormatter)(
                            data[projectionKeys.best]
                          )}
                        </p>
                      </>
                    )}
                  <p className="text-sm font-medium text-primary">Current:</p>
                  <p className="font-mono text-sm font-medium tabular-nums text-foreground">
                    {valuePrefix}
                    {(formatter ?? defaultFormatter)(data[dataKey])}
                  </p>
                  {projectionKeys &&
                    data[projectionKeys.worst] !== undefined && (
                      <>
                        <p className="text-sm font-medium text-red-400">
                          Worst:
                        </p>
                        <p className="font-mono text-sm font-medium tabular-nums text-foreground">
                          {valuePrefix}
                          {(formatter ?? defaultFormatter)(
                            data[projectionKeys.worst]
                          )}
                        </p>
                      </>
                    )}
                </div>
              </div>
            )
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
