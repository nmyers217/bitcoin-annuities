'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer } from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { useMemo } from "react"
import { useBitcoinPrice } from '@/hooks/use-bitcoin-price'
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"

// Shared Components
function LoadingState() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-[300px] w-full" />
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p>Failed to load price data</p>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onRetry}
        >
          Try Again
        </Button>
      </div>
    </div>
  )
}

// Base chart component
function BaseLineChart({ 
  data, 
  dataKey, 
  label,
  valuePrefix 
}: { 
  data: any[], 
  dataKey: string,
  label: string,
  valuePrefix: string 
}) {
  return (
    <ChartContainer config={{
      [dataKey]: {
        label,
        color: "orange"
      }
    }}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis 
            dataKey="date" 
            interval="preserveStartEnd"
            tickFormatter={(value) => {
              const date = new Date(value)
              return date.toLocaleDateString('en-US', { 
                month: 'short',
                year: 'numeric'
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
            formatter={(value: number) => [`${valuePrefix}${value.toLocaleString()}`, label]}
            labelFormatter={(label) => {
              const date = new Date(label)
              return date.toLocaleDateString('en-US', { 
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })
            }}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
            }}
            itemStyle={{
              color: 'hsl(var(--foreground))',
              fontWeight: 500
            }}
            labelStyle={{
              color: 'hsl(var(--muted-foreground))',
              fontWeight: 400
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
      </ResponsiveContainer>
    </ChartContainer>
  )
}

// Simplified chart components
function PriceChart({ data }: { data: any[] }) {
  return <BaseLineChart data={data} dataKey="price" label="Price" valuePrefix="$" />
}

function PortfolioChart({ data, dataKey, valuePrefix }: { data: any[], dataKey: string, valuePrefix: string }) {
  return (
    <BaseLineChart 
      data={data} 
      dataKey={dataKey} 
      label={dataKey === 'usdValue' ? 'USD Value' : 'BTC Value'} 
      valuePrefix={valuePrefix} 
    />
  )
}

function ChartCard({ title, description, children }: { 
  title: string; 
  description: string; 
  children: React.ReactNode 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}

// Main Page Component
export default function TrackerPage() {
  const { data: priceData, isLoading, error, refetch } = useBitcoinPrice()

  const portfolioData = useMemo(() => {
    if (!priceData?.length) return []
    
    return priceData.map((pricePoint, index) => {
      const btcAmount = 2.5 - (index * 0.05)
      return {
        date: pricePoint.date,
        btcValue: btcAmount,
        usdValue: btcAmount * pricePoint.price
      }
    })
  }, [priceData])

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Bitcoin Annuity Tracker</h1>
            <p className="text-muted-foreground">Track and calculate your Bitcoin-based annuity payments</p>
          </div>
          <Button>New Calculation</Button>
        </div>

        {/* Price Chart */}
        <ChartCard 
          title="Bitcoin Price History"
          description="Historical BTC/USD price data"
        >
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState onRetry={refetch} />
          ) : (
            <PriceChart data={priceData ?? []} />
          )}
        </ChartCard>

        {/* Portfolio Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard 
            title="Portfolio Value in USD"
            description="Projected value based on current parameters"
          >
            {isLoading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState onRetry={refetch} />
            ) : (
              <PortfolioChart 
                data={portfolioData} 
                dataKey="usdValue"
                valuePrefix="$"
              />
            )}
          </ChartCard>

          <ChartCard 
            title="Portfolio Value in BTC"
            description="Bitcoin holdings over time"
          >
            {isLoading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState onRetry={refetch} />
            ) : (
              <PortfolioChart 
                data={portfolioData} 
                dataKey="btcValue"
                valuePrefix="₿"
              />
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  )
}
