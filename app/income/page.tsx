'use client'

import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/Header'
import AddIncomeDialog from '@/components/AddIncomeDialog'
import IncomeTable, { type IncomeRow } from '@/components/IncomeTable'
import { useCompany } from '@/contexts/CompanyContext'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default function IncomePage() {
  const { activeCompany, currencySymbol } = useCompany()
  const [rows, setRows] = useState<IncomeRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetchIncome = useCallback(async () => {
    if (!activeCompany) return
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('income')
      .select('id, income_date, income_type, source, amount, currency, is_recurring, recurrence')
      .eq('company_id', activeCompany.id)
      .order('income_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (!error && data) setRows(data as IncomeRow[])
    setLoading(false)
  }, [activeCompany])

  useEffect(() => {
    fetchIncome()
  }, [fetchIncome])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/" />}>
            <ChevronLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight flex-1">Income</h1>
          {activeCompany && (
            <span className="text-sm text-muted-foreground">
              {activeCompany.name} · {activeCompany.currency}
            </span>
          )}
          <AddIncomeDialog onAdded={fetchIncome} />
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
        ) : (
          <IncomeTable rows={rows} currencySymbol={currencySymbol} onDeleted={fetchIncome} />
        )}
      </main>
    </div>
  )
}
