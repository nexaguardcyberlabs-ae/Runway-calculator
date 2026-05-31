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

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  event_type: z.string().min(1, 'Select a type'),
  category_id: z.string().optional(),
  amount: z.number({ error: 'Enter a valid amount' }).positive('Amount must be positive'),
  event_date: z.string().min(1, 'Date is required'),
  is_recurring: z.boolean(),
  recurrence: z.string().optional(),
  recurrence_end: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Category {
  id: string
  display_name: string
}

interface AddPlannedEventDialogProps {
  onAdded: () => void
}

export default function AddPlannedEventDialog({ onAdded }: AddPlannedEventDialogProps) {
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
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      is_recurring: false,
      event_type: 'expense',
      event_date: new Date().toISOString().split('T')[0],
    },
  })

  const isRecurring = watch('is_recurring')
  const eventType = watch('event_type')

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
    createClient()
      .from('expense_categories')
      .select('id, display_name')
      .order('sort_order')
      .then(({ data }) => { if (data) setCategories(data) })
  }, [])

  async function onSubmit(values: FormValues) {
    if (!activeCompany) { toast.error('No active company selected'); return }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('planned_events').insert({
      company_id: activeCompany.id,
      title: values.title,
      event_type: values.event_type,
      category_id: values.event_type === 'expense' && values.category_id ? values.category_id : null,
      amount: values.amount,
      currency: activeCompany.currency,
      event_date: values.event_date,
      is_recurring: values.is_recurring,
      recurrence: values.is_recurring ? values.recurrence || null : null,
      recurrence_end: values.is_recurring && values.recurrence_end ? values.recurrence_end : null,
      notes: values.notes || null,
      created_by: user?.id ?? null,
    })

    if (error) { toast.error('Failed to save: ' + error.message); return }

    toast.success('Planned event added')
    reset({ is_recurring: false, event_type: 'expense', event_date: new Date().toISOString().split('T')[0] })
    setOpen(false)
    onAdded()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="size-4" />
        Add Event
      </DialogTrigger>

      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Add Planned Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="e.g. New hire — Senior Engineer" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Controller
              control={control}
              name="event_type"
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v ?? '')}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.event_type && <p className="text-xs text-destructive">{errors.event_type.message}</p>}
          </div>

          {/* Category (expenses only) */}
          {eventType === 'expense' && (
            <div className="space-y-1.5">
              <Label>Category (optional)</Label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v ?? '')}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount ({currencySymbol})</Label>
            <Input id="amount" type="number" step="0.01" placeholder="0.00" {...register('amount', { valueAsNumber: true })} />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="event_date">Expected Date</Label>
            <Input id="event_date" type="date" {...register('event_date')} />
            {errors.event_date && <p className="text-xs text-destructive">{errors.event_date.message}</p>}
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="is_recurring"
              render={({ field }) => (
                <Switch id="is_recurring_pe" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="is_recurring_pe" className="cursor-pointer">Recurring</Label>
          </div>

          {isRecurring && (
            <div className="space-y-3 pl-1 border-l-2 border-border ml-1">
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Controller
                  control={control}
                  name="recurrence"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v ?? '')}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select frequency" /></SelectTrigger>
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
                <Label htmlFor="recurrence_end_pe">End date (optional)</Label>
                <Input id="recurrence_end_pe" type="date" {...register('recurrence_end')} />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" placeholder="Any context…" {...register('notes')} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
