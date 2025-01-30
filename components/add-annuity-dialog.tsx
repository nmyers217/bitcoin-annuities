'use client'

import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePortfolio } from '@/contexts/portfolio-context'
import { parsePortfolioDate } from '@/lib/calculations'
import { type Annuity } from '@/lib/types'
import { cn } from '@/lib/utils'

const annuitySchema = z.object({
  createdAt: z.date(),
  principal: z.number().positive(),
  principalCurrency: z.enum(['BTC', 'USD']),
  amortizationRate: z.number().min(0).max(1),
  termMonths: z.number().int().positive(),
})

interface AddAnnuityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editAnnuity?: Annuity // Optional annuity for edit mode
}

export function AddAnnuityDialog({
  open,
  onOpenChange,
  editAnnuity,
}: AddAnnuityDialogProps) {
  const { dispatch } = usePortfolio()

  const form = useForm<z.infer<typeof annuitySchema>>({
    resolver: zodResolver(annuitySchema),
    defaultValues: {
      createdAt: new Date(),
      principal: 100000,
      principalCurrency: 'USD',
      amortizationRate: 0.12,
      termMonths: 60,
    },
  })

  useEffect(() => {
    if (editAnnuity) {
      form.reset({
        ...editAnnuity,
        createdAt: parsePortfolioDate(editAnnuity.createdAt),
      })
    }
  }, [editAnnuity, form])

  const onSubmit = form.handleSubmit((values) => {
    const annuity = {
      id: editAnnuity?.id ?? crypto.randomUUID(),
      ...values,
      createdAt: format(values.createdAt, 'yyyy-MM-dd'),
    }

    dispatch({
      type: editAnnuity ? 'UPDATE_ANNUITY' : 'ADD_ANNUITY',
      annuity,
    })
    form.reset()
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editAnnuity ? 'Edit' : 'Add'} Annuity</DialogTitle>
          <DialogDescription>
            {editAnnuity ? 'Modify' : 'Enter'} the details of your Bitcoin
            annuity.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="createdAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        defaultMonth={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When did you start this annuity?
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
                        onChange={(e) => field.onChange(Number(e.target.value))}
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
                  <FormLabel>Annual Interest Rate</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    The annual interest rate as a decimal (e.g., 0.12 for 12%)
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
                  <FormLabel>Term Length (Months)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    How many months will this annuity last?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editAnnuity ? 'Save Changes' : 'Add Annuity'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
