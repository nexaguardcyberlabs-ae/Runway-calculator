'use client'

import { useState } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/contexts/CompanyContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

const incomeSchema = z.object({
  source: z.string().optional(),
  income_type: z.string().min(1, 'Select a type'),
  amount: z.number({ error: 'Enter a valid amount' }).positive('Amount must be positive'),
  income_date: z.string().min(1, 'Date is required'),
  is_recurring: z.boolean(),
  recurrence: z.string().optional(),
  recurrence_end: z.string().optional(),
})

type IncomeFormValues = z.infer<typeof incomeSchema>

interface AddIncomeDialogProps {
  onAdded: () => void
}

export default function AddIncomeDialog({ onAdded }: AddIncomeDialogProps) {
  const [open, setOpen] = useState(false)
  const { activeCompany, currencySymbol } = useCompany()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema) as Resolver<IncomeFormValues>,
    defaultValues: {
      is_recurring: false,
      income_date: new Date().toISOString().split('T')[0],
    },
  })

  const isRecurring = watch('is_recurring')

  async function onSubmit(values: IncomeFormValues) {
    if (!activeCompany) {
      toast.error('No active company selected')
      return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('income').insert({
      company_id: activeCompany.id,
      source: values.source || null,
      income_type: values.income_type,
      amount: values.amount,
      currency: activeCompany.currency,
      income_date: values.income_date,
      is_recurring: values.is_recurring,
      recurrence: values.is_recurring ? values.recurrence || null : null,
      recurrence_end:
        values.is_recurring && values.recurrence_end ? values.recurrence_end : null,
      created_by: user?.id ?? null,
    })

    if (error) {
      toast.error('Failed to save income: ' + error.message)
      return
    }

    toast.success('Income added')
    reset({
      is_recurring: false,
      income_date: new Date().toISOString().split('T')[0],
    })
    setOpen(false)
    onAdded()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="size-4" />
        Add Income
      </DialogTrigger>

      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Add Income</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Controller
              control={control}
              name="income_type"
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v ?? '')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retainer">Retainer</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.income_type && (
              <p className="text-xs text-destructive">{errors.income_type.message}</p>
            )}
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label htmlFor="source">Source / Client</Label>
            <Input
              id="source"
              placeholder="e.g. Acme Corp"
              {...register('source')}
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount ({currencySymbol})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="income_date">Date</Label>
            <Input
              id="income_date"
              type="date"
              {...register('income_date')}
            />
            {errors.income_date && (
              <p className="text-xs text-destructive">{errors.income_date.message}</p>
            )}
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="is_recurring"
              render={({ field }) => (
                <Switch
                  id="is_recurring_income"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="is_recurring_income" className="cursor-pointer">
              Recurring income
            </Label>
          </div>

          {/* Recurrence options */}
          {isRecurring && (
            <div className="space-y-3 pl-1 border-l-2 border-border ml-1">
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Controller
                  control={control}
                  name="recurrence"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={(v) => field.onChange(v ?? '')}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="recurrence_end_income">End date (optional)</Label>
                <Input
                  id="recurrence_end_income"
                  type="date"
                  {...register('recurrence_end')}
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save income'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
