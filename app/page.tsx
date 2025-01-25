'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer } from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis, Tooltip } from "recharts"
import { useState } from "react"
import { useBitcoinPrice } from '@/hooks/use-bitcoin-price'
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"

// Types for our data
type DataPoint = {
  date: string
  btcValue: number
  usdValue: number
}

export default function TrackerPage() {
  // Sample data - we'll make this dynamic later
  const [data] = useState<DataPoint[]>([
    {
      date: "Jan 2024",
      btcValue: 2.5,
      usdValue: 100000,
    },
    {
      date: "Feb 2024",
      btcValue: 2.45,
      usdValue: 105000,
    },
    {
      date: "Mar 2024",
      btcValue: 2.4,
      usdValue: 108000,
    },
    {
      date: "Apr 2024",
      btcValue: 2.35,
      usdValue: 112000,
    },
    {
      date: "May 2024",
      btcValue: 2.3,
      usdValue: 115000,
    },
  ])

  const { data: priceData, isLoading, error, refetch } = useBitcoinPrice()

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Bitcoin Annuity Tracker</h1>
            <p className="text-muted-foreground">Track and calculate your Bitcoin-based annuity payments</p>
          </div>
          <Button>New Calculation</Button>
        </div>

        {/* Price Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Bitcoin Price History</CardTitle>
            <CardDescription>Historical BTC/USD price data</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : error ? (
              <div className="flex h-[300px] items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-destructive">
                  <AlertCircle className="h-8 w-8" />
                  <p>Failed to load price data</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => refetch()}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : (
              <ChartContainer config={{
                price: {
                  label: "Price",
                  color: "orange"
                }
              }}>
                <LineChart data={priceData}>
                  <XAxis 
                    dataKey="date" 
                    interval={30}
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return date.toLocaleDateString('en-US', { 
                        month: 'short',
                        year: 'numeric'
                      })
                    }}
                    minTickGap={50}
                  />
                  <YAxis 
                    width={80}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
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
                    dataKey="price" 
                    stroke="orange"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Main Grid Layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* USD Value Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Value in USD</CardTitle>
              <CardDescription>Projected value based on current parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{
                usdValue: {
                  label: "USD Value",
                  color: "orange"
                }
              }}>
                <LineChart data={data}>
                  <XAxis dataKey="date" />
                  <YAxis 
                    width={80}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip />
                  <Line type="monotone" dataKey="usdValue" stroke="orange" />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* BTC Value Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Value in BTC</CardTitle>
              <CardDescription>Bitcoin holdings over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{
                btcValue: {
                  label: "BTC Value",
                  color: "orange"
                }
              }}>
                <LineChart data={data}>
                  <XAxis dataKey="date" />
                  <YAxis 
                    width={80}
                    tickFormatter={(value) => `₿${value.toFixed(2)}`}
                  />
                  <Tooltip />
                  <Line type="monotone" dataKey="btcValue" stroke="orange" />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Parameters Card */}
          <Card>
            <CardHeader>
              <CardTitle>Input Parameters</CardTitle>
              <CardDescription>Adjust your calculation variables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* We'll add form components here in the next step */}
                <p className="text-muted-foreground">Form coming soon...</p>
              </div>
            </CardContent>
          </Card>

          {/* Results Card */}
          <Card>
            <CardHeader>
              <CardTitle>Results Summary</CardTitle>
              <CardDescription>Key metrics and outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* We'll add results metrics here */}
                <p className="text-muted-foreground">Results coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
