'use client'

import { useState } from 'react'
import { AlertCircle, Copy, FileText, Wallet } from 'lucide-react'
import { Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

import { AddAnnuityDialog } from '@/components/add-annuity-dialog'
import { AnnuitiesCard } from '@/components/annuities-card'
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
import { useToast } from '@/components/ui/use-toast'
import { siteConfig } from '@/config/site'
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

function PageHeader() {
  const { toast } = useToast()
  const [addAnnuityOpen, setAddAnnuityOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const { address } = siteConfig.lightning

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address)
    toast({
      description: 'Lightning address copied to clipboard',
      duration: 2000,
    })
  }

  return (
    <div className="flex flex-wrap items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold">₿itcoin Annuity Tracker</h1>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            🛞 Visualize and execute the{' '}
            <a
              href={siteConfig.links.substackArticle}
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Bitcoin Flywheel
            </a>{' '}
            strategy with our annuity payment calculator
          </p>
          <p className="flex items-center text-sm text-muted-foreground">
            ⚡ Lightning Address:{' '}
            <code className="ml-2 rounded bg-muted px-1.5 py-0.5">
              {address}
            </code>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-6 w-6 p-0"
              onClick={copyToClipboard}
            >
              <Copy className="h-4 w-4" />
              <span className="sr-only">Copy lightning address</span>
            </Button>
          </p>
          <p className="text-xs text-muted-foreground">
            ℹ️ Consider donating or subscribing on{' '}
            <a
              href={siteConfig.links.substackHome}
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Substack
            </a>{' '}
            to support the development of free Bitcoin tools and content for the
            community.
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setReportOpen(true)}>
          <FileText className="mr-2 h-4 w-4" />
          View Report
        </Button>
        <Button onClick={() => setAddAnnuityOpen(true)}>
          <Wallet className="mr-2 h-4 w-4" />
          Add Annuity
        </Button>
        <AddAnnuityDialog
          open={addAnnuityOpen}
          onOpenChange={setAddAnnuityOpen}
        />
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
        <AnnuitiesCard />
      </div>
    </div>
  )
}
