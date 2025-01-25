'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePortfolio } from '@/contexts/portfolio-context'

interface AddWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddWalletDialog({ open, onOpenChange }: AddWalletDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Wallet</DialogTitle>
          <DialogDescription>
            Add a virtual or real wallet to your portfolio
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="virtual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="virtual">Virtual Wallet</TabsTrigger>
            <TabsTrigger value="real">Real Wallet</TabsTrigger>
          </TabsList>
          <TabsContent value="virtual">
            {/* Virtual wallet form will go here */}
          </TabsContent>
          <TabsContent value="real">
            {/* Real wallet form will go here */}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
