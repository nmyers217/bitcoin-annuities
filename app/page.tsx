'use client'

import { useState } from 'react'
import { AlertCircle, FileText, Wallet } from 'lucide-react'
import { Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

import { AddWalletDialog } from '@/components/add-wallet-dialog'
import { CashFlowReport } from '@/components/cash-flow-report'
import TradingViewWidget from '@/components/trading-view-widget'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { usePortfolio } from '@/contexts/portfolio-context'
import { useBitcoinPrice } from '@/hooks/use-bitcoin-price'

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
        <Button variant="outline" size="sm" onClick={onRetry}>
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
  valuePrefix,
}: {
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

// Simplified chart components
function PriceChart({ data }: { data: any[] }) {
  return (
    <BaseLineChart data={data} dataKey="price" label="Price" valuePrefix="$" />
  )
}

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

function AsyncChart({
  isLoading,
  error,
  onRetry,
  children,
}: {
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  children: React.ReactNode
}) {
  if (isLoading) return <LoadingState />
  if (error) return <ErrorState onRetry={onRetry} />
  return children
}

function PriceChartCard() {
  return (
    <Card className="h-[500px]">
      <TradingViewWidget />
    </Card>
  )
}

function PortfolioChartCard() {
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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
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
    </div>
  )
}

function PageHeader() {
  const [addWalletOpen, setAddWalletOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  return (
    <div className="flex flex-wrap items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold">Bitcoin Annuity Tracker</h1>
        <p className="text-muted-foreground">
          Track and calculate your Bitcoin-based annuity payments
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setReportOpen(true)}>
          <FileText className="mr-2 h-4 w-4" />
          View Report
        </Button>
        <Button onClick={() => setAddWalletOpen(true)}>
          <Wallet className="mr-2 h-4 w-4" />
          Add Annuity Wallet
        </Button>
        <AddWalletDialog open={addWalletOpen} onOpenChange={setAddWalletOpen} />
        <CashFlowReport open={reportOpen} onOpenChange={setReportOpen} />
      </div>
    </div>
  )
}

// Main Page Component
export default function TrackerPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <PageHeader />
        <PriceChartCard />
        <PortfolioChartCard />
      </div>
    </div>
  )
}
