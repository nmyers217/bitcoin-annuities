'use client'

import * as React from 'react'
import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePortfolio } from '@/contexts/portfolio-context'
import { useBitcoinPrice } from '@/hooks/use-bitcoin-price'

interface CashFlowReportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CashFlowReport({ open, onOpenChange }: CashFlowReportProps) {
  const { state } = usePortfolio()
  const { data: priceData } = useBitcoinPrice()

  const handleExportCsv = () => {
    // TODO: Implement CSV export
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <div>
              <DialogTitle>Cash Flow Report</DialogTitle>
              <DialogDescription>
                Monthly breakdown of portfolio cash flows
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </DialogHeader>
        <div className="max-h-[600px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead className="text-right">BTC In</TableHead>
                <TableHead className="text-right">BTC Out</TableHead>
                <TableHead className="text-right">USD In</TableHead>
                <TableHead className="text-right">USD Out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* TODO: Add table rows */}
              <TableRow>
                <TableCell>Jan 2024</TableCell>
                <TableCell>Example Wallet</TableCell>
                <TableCell className="text-right">0.1 ₿</TableCell>
                <TableCell className="text-right">0.05 ₿</TableCell>
                <TableCell className="text-right">$4,500</TableCell>
                <TableCell className="text-right">$2,250</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
