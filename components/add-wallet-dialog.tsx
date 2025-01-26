'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { HelpCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { usePortfolio } from '@/contexts/portfolio-context'
import { useBitcoinPrice } from '@/hooks/use-bitcoin-price'
import type { RealWallet, VirtualWallet } from '@/lib/portfolio'

interface AddWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const virtualWalletSchema = z.object({
  createdAt: z.string(),
  principal: z.number().positive(),
  principalCurrency: z.enum(['BTC', 'USD']),
  amortizationRate: z.number().min(0).max(1),
  termMonths: z.number().int().positive(),
})

function VirtualWalletForm() {
  const { dispatch } = usePortfolio()
  const { data: priceData } = useBitcoinPrice()

  const form = useForm<z.infer<typeof virtualWalletSchema>>({
    resolver: zodResolver(virtualWalletSchema),
    defaultValues: {
      createdAt: new Date().toISOString().split('T')[0],
      principal: 1,
      principalCurrency: 'BTC',
      amortizationRate: 0.05,
      termMonths: 60,
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    if (!priceData) {
      console.error('Price data not available')
      return
    }

    const wallet: VirtualWallet = {
      id: crypto.randomUUID(),
      type: 'virtual',
      ...values,
    }

    dispatch({ type: 'ADD_WALLET', wallet })
    form.reset()
  })

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="createdAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormDescription>
                When did you start this investment?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="principal"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Principal Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="principalCurrency"
            render={({ field }) => (
              <FormItem className="w-24">
                <FormLabel>Currency</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="BTC">BTC</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="amortizationRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Annual Rate (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) / 100)
                  }
                  value={field.value * 100}
                />
              </FormControl>
              <FormDescription>
                The annual rate at which the principal will be distributed
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="termMonths"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Term Length (months)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                How long will the distributions last?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Add Virtual Wallet
        </Button>
      </form>
    </Form>
  )
}

const realWalletSchema = z.object({
  publicKey: z.string().min(26).max(35),
})

function RealWalletForm() {
  const { dispatch } = usePortfolio()
  const { data: priceData } = useBitcoinPrice()
  const form = useForm<z.infer<typeof realWalletSchema>>({
    resolver: zodResolver(realWalletSchema),
    defaultValues: {
      publicKey: '',
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    if (!priceData) {
      console.error('Price data not available')
      return
    }

    const wallet: RealWallet = {
      id: crypto.randomUUID(),
      type: 'real',
      ...values,
    }
    dispatch({ type: 'ADD_WALLET', wallet })
  })

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="publicKey"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel>Bitcoin Address</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        This wallet address is not sent to our servers, it is
                        only fed to Mempool.space's public blockchain explorer
                        API
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <FormControl>
                <Input
                  {...field}
                  placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
                />
              </FormControl>
              <FormDescription>
                The public address of your Bitcoin wallet
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Add Real Wallet
        </Button>
      </form>
    </Form>
  )
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
            <VirtualWalletForm />
          </TabsContent>
          <TabsContent value="real">
            <RealWalletForm />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
