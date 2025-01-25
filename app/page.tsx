'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer } from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis, Tooltip } from "recharts"
import { useState } from "react"

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
