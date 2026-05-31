'use client'

import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/Header'
import AddPlannedEventDialog from '@/components/AddPlannedEventDialog'
import PlannedTimeline, { type PlannedEventRow } from '@/components/PlannedTimeline'
import { useCompany } from '@/contexts/CompanyContext'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default function PlannedPage() {
  const { activeCompany, currencySymbol } = useCompany()
  const [events, setEvents] = useState<PlannedEventRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetchEvents = useCallback(async () => {
    if (!activeCompany) return
    setLoading(true)
    const { data, error } = await createClient()
      .from('planned_events')
      .select('id, title, event_type, category_id, amount, currency, event_date, is_recurring, recurrence, recurrence_end, notes, expense_categories(display_name)')
      .eq('company_id', activeCompany.id)
      .order('event_date', { ascending: true })

    if (!error && data) setEvents(data as unknown as PlannedEventRow[])
    setLoading(false)
  }, [activeCompany])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/" />}>
            <ChevronLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight flex-1">Planned Events</h1>
          {activeCompany && (
            <span className="text-sm text-muted-foreground">
              {activeCompany.name} · {activeCompany.currency}
            </span>
          )}
          <AddPlannedEventDialog onAdded={fetchEvents} />
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
        ) : (
          <PlannedTimeline events={events} currencySymbol={currencySymbol} onDeleted={fetchEvents} />
        )}
      </main>
    </div>
  )
}
