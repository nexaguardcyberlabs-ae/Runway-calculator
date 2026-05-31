'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Trash2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'

export interface PlannedEventRow {
  id: string
  title: string
  event_type: string
  category_id: string | null
  amount: number
  currency: string
  event_date: string
  is_recurring: boolean
  recurrence: string | null
  recurrence_end: string | null
  notes: string | null
  expense_categories?: { display_name: string } | null
}

interface PlannedTimelineProps {
  events: PlannedEventRow[]
  currencySymbol: string
  onDeleted: () => void
}

function formatAmount(amount: number, symbol: string) {
  return `${symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatMonthHeader(month: string) {
  const [y, m] = month.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function formatDay(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })
}

export default function PlannedTimeline({ events, currencySymbol, onDeleted }: PlannedTimelineProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this planned event? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const { error } = await createClient().from('planned_events').delete().eq('id', id)
      if (error) toast.error('Failed to delete: ' + error.message)
      else { toast.success('Planned event deleted'); onDeleted() }
    } finally {
      setDeletingId(null)
    }
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No planned events yet. Add one to see it on the projection chart.
      </div>
    )
  }

  // Group by YYYY-MM, sort chronologically
  const grouped: Record<string, PlannedEventRow[]> = {}
  for (const ev of events) {
    const month = ev.event_date.substring(0, 7)
    ;(grouped[month] ??= []).push(ev)
  }
  const sortedMonths = Object.keys(grouped).sort()

  return (
    <div className="space-y-6">
      {sortedMonths.map((month) => (
        <div key={month}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">
            {formatMonthHeader(month)}
          </h3>
          <div className="space-y-2">
            {grouped[month]
              .sort((a, b) => a.event_date.localeCompare(b.event_date))
              .map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-sm"
                >
                  {/* Icon */}
                  <div className="mt-0.5 shrink-0">
                    {ev.event_type === 'income' ? (
                      <TrendingUp className="size-4 text-green-600" />
                    ) : (
                      <TrendingDown className="size-4 text-red-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{ev.title}</span>
                      <span className="text-muted-foreground text-xs shrink-0">{formatDay(ev.event_date)}</span>
                      {ev.expense_categories?.display_name && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded-md text-muted-foreground shrink-0">
                          {ev.expense_categories.display_name}
                        </span>
                      )}
                      {ev.is_recurring && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <RefreshCw className="size-3" />
                          {ev.recurrence}
                        </span>
                      )}
                    </div>
                    {ev.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{ev.notes}</p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="shrink-0 text-right">
                    <span
                      className={`font-mono font-semibold ${
                        ev.event_type === 'income' ? 'text-green-600' : 'text-foreground'
                      }`}
                    >
                      {ev.event_type === 'income' ? '+' : '−'}{formatAmount(ev.amount, currencySymbol)}
                    </span>
                  </div>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-8 w-8 p-0 shrink-0"
                    onClick={() => handleDelete(ev.id)}
                    disabled={deletingId === ev.id}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
