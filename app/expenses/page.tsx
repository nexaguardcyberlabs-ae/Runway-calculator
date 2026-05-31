'use client'

import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/Header'
import AddExpenseDialog from '@/components/AddExpenseDialog'
import ExpenseTable from '@/components/ExpenseTable'
import { useCompany } from '@/contexts/CompanyContext'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

// Supabase returns joined rows as objects for many-to-one FKs
interface Expense {
  id: string
  expense_date: string
  category_id: string
  description: string | null
  amount: number
  currency: string
  is_recurring: boolean
  recurrence: string | null
  expense_categories: { display_name: string } | null
}

export default function ExpensesPage() {
  const { activeCompany, currencySymbol } = useCompany()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)

  const fetchExpenses = useCallback(async () => {
    if (!activeCompany) return
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('expenses')
      .select(
        'id, expense_date, category_id, description, amount, currency, is_recurring, recurrence, expense_categories(display_name)'
      )
      .eq('company_id', activeCompany.id)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (!error && data) {
      setExpenses(data as unknown as Expense[])
    }
    setLoading(false)
  }, [activeCompany])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/" />}>
            <ChevronLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight flex-1">Expenses</h1>
          {activeCompany && (
            <span className="text-sm text-muted-foreground">
              {activeCompany.name} · {activeCompany.currency}
            </span>
          )}
          <AddExpenseDialog onAdded={fetchExpenses} />
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Loading…
          </div>
        ) : (
          <ExpenseTable
            expenses={expenses}
            currencySymbol={currencySymbol}
            onDeleted={fetchExpenses}
          />
        )}
      </main>
    </div>
  )
}
