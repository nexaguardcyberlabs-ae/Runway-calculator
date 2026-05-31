'use client'

import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/Header'
import { useCompany } from '@/contexts/CompanyContext'
import { createClient } from '@/lib/supabase/client'
import {
  computeRunway,
  projectCashFlow,
  type RunwayExpense,
  type RunwayIncome,
  type RunwayResult,
  type PlannedEvent,
  type CashFlowPoint,
} from '@/lib/runway'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import ProjectionChart from '@/components/ProjectionChart'

function fmt(amount: number, symbol: string) {
  return `${symbol} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function runwayColorClass(months: number) {
  if (months === Infinity) return 'text-green-600'
  if (months < 3)          return 'text-red-600'
  if (months < 6)          return 'text-amber-600'
  return 'text-green-600'
}

function runwayStripClass(months: number) {
  if (months === Infinity) return 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
  if (months < 3)          return 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
  if (months < 6)          return 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
  return 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
}

function formatRunway(months: number) {
  if (months === Infinity) return '∞ (profitable)'
  return `${months.toFixed(1)} mo`
}

export default function DashboardPage() {
  const { activeCompany, currencySymbol } = useCompany()
  const [result, setResult] = useState<RunwayResult | null>(null)
  const [projection, setProjection] = useState<CashFlowPoint[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!activeCompany) return
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return

    setLoading(true)
    const supabase = createClient()

    const [{ data: expenses }, { data: income }, { data: planned }] = await Promise.all([
      supabase
        .from('expenses')
        .select('amount, expense_date, is_recurring, recurrence')
        .eq('company_id', activeCompany.id),
      supabase
        .from('income')
        .select('amount, income_date, is_recurring, recurrence')
        .eq('company_id', activeCompany.id),
      supabase
        .from('planned_events')
        .select('event_date, event_type, amount, is_recurring, recurrence, recurrence_end')
        .eq('company_id', activeCompany.id)
        .then(r => ({ data: r.data, error: r.error })), // graceful — table may not exist yet
    ])

    const exp = (expenses ?? []) as RunwayExpense[]
    const inc = (income ?? []) as RunwayIncome[]
    const pln = (planned ?? []) as PlannedEvent[]

    setResult(computeRunway(activeCompany.opening_cash, exp, inc))
    setProjection(projectCashFlow(activeCompany.opening_cash, exp, inc, pln))
    setLoading(false)
  }, [activeCompany])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const rm = result

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

        {loading || !rm ? (
          <div className="text-sm text-muted-foreground py-16 text-center">
            {activeCompany ? 'Loading…' : 'Select a company to view runway'}
          </div>
        ) : (
          <>
            {/* ── Runway Strip ──────────────────────────────── */}
            <div className={cn('rounded-xl border p-5', runwayStripClass(rm.runwayMonths))}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Cash on Hand
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {fmt(rm.cashOnHand, currencySymbol)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Runway
                  </p>
                  <p className={cn('mt-1 text-2xl font-bold', runwayColorClass(rm.runwayMonths))}>
                    {formatRunway(rm.runwayMonths)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Month-end Need
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {fmt(rm.monthEndNeed, currencySymbol)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Breakeven / mo
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {fmt(rm.breakevenIncomeNeeded, currencySymbol)}
                  </p>
                </div>
              </div>
            </div>

            {/* ── KPI Cards ─────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Expenses MTD
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xl font-bold tabular-nums">
                    {fmt(rm.expensesMTD, currencySymbol)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Income MTD
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xl font-bold tabular-nums text-green-600">
                    {fmt(rm.incomeMTD, currencySymbol)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Net Monthly Burn
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p
                    className={cn(
                      'text-xl font-bold tabular-nums',
                      rm.netMonthlyBurn > 0 ? 'text-red-600' : 'text-green-600'
                    )}
                  >
                    {fmt(rm.netMonthlyBurn, currencySymbol)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Next 30d Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xl font-bold tabular-nums">
                    {fmt(rm.next30Expenses, currencySymbol)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ── Projection Chart ──────────────────────────── */}
            <ProjectionChart data={projection} currencySymbol={currencySymbol} />
          </>
        )}
      </main>
    </div>
  )
}
