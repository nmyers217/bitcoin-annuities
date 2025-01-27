'use client'

import { useState } from 'react'
import { Copy, Wallet } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { siteConfig } from '@/config/site'
import { AddAnnuityDialog } from './add-annuity-dialog'

export function PageHeader() {
  const { toast } = useToast()
  const [addAnnuityOpen, setAddAnnuityOpen] = useState(false)
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
        <Button onClick={() => setAddAnnuityOpen(true)} variant="default">
          <Wallet className="mr-2 h-4 w-4" />
          Add Annuity
        </Button>
        <AddAnnuityDialog
          open={addAnnuityOpen}
          onOpenChange={setAddAnnuityOpen}
        />
      </div>
    </div>
  )
}
