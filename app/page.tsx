'use client'

import { AnnuitiesCard } from '@/components/annuities-card/index'
import { PortfolioChartCard } from '@/components/charts/portfolio-charts'
import { PageHeader } from '@/components/page-header'
import TradingViewWidget from '@/components/trading-view-widget'
import { Card } from '@/components/ui/card'

function PriceChartCard() {
  return (
    <Card className="h-[500px]">
      <TradingViewWidget />
    </Card>
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
