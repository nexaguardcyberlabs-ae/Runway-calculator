'use client'

import { useState, useEffect } from 'react'
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

const expenseSchema = z.object({
  category_id: z.string().min(1, 'Select a category'),
  description: z.string().optional(),
  amount: z.number({ error: 'Enter a valid amount' }).positive('Amount must be positive'),
  expense_date: z.string().min(1, 'Date is required'),
  is_recurring: z.boolean(),
  recurrence: z.string().optional(),
  recurrence_end: z.string().optional(),
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

interface Category {
  id: string
  display_name: string
}

interface AddExpenseDialogProps {
  onAdded: () => void
}

export default function AddExpenseDialog({ onAdded }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const { activeCompany, currencySymbol } = useCompany()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as Resolver<ExpenseFormValues>,
    defaultValues: {
      is_recurring: false,
      expense_date: new Date().toISOString().split('T')[0],
    },
  })

  const isRecurring = watch('is_recurring')

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
    const supabase = createClient()
    supabase
      .from('expense_categories')
      .select('id, display_name')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setCategories(data)
      })
  }, [])

  async function onSubmit(values: ExpenseFormValues) {
    if (!activeCompany) {
      toast.error('No active company selected')
      return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('expenses').insert({
      company_id: activeCompany.id,
      category_id: values.category_id,
      description: values.description || null,
      amount: values.amount,
      currency: activeCompany.currency,
      expense_date: values.expense_date,
      is_recurring: values.is_recurring,
      recurrence: values.is_recurring ? values.recurrence || null : null,
      recurrence_end:
        values.is_recurring && values.recurrence_end
          ? values.recurrence_end
          : null,
      created_by: user?.id ?? null,
    })

    if (error) {
      toast.error('Failed to save expense: ' + error.message)
      return
    }

    toast.success('Expense added')
    reset({
      is_recurring: false,
      expense_date: new Date().toISOString().split('T')[0],
    })
    setOpen(false)
    onAdded()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="size-4" />
        Add Expense
      </DialogTrigger>

      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v ?? '')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category_id && (
              <p className="text-xs text-destructive">{errors.category_id.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Optional note"
              {...register('description')}
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
            <Label htmlFor="expense_date">Date</Label>
            <Input
              id="expense_date"
              type="date"
              {...register('expense_date')}
            />
            {errors.expense_date && (
              <p className="text-xs text-destructive">{errors.expense_date.message}</p>
            )}
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="is_recurring"
              render={({ field }) => (
                <Switch
                  id="is_recurring"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="is_recurring" className="cursor-pointer">
              Recurring expense
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
                <Label htmlFor="recurrence_end">End date (optional)</Label>
                <Input
                  id="recurrence_end"
                  type="date"
                  {...register('recurrence_end')}
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
