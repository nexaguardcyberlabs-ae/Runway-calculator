'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Trash2, RefreshCw } from 'lucide-react'

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

interface ExpenseTableProps {
  expenses: Expense[]
  currencySymbol: string
  onDeleted: () => void
}

function formatAmount(amount: number, symbol: string) {
  return `${symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function ExpenseTable({
  expenses,
  currencySymbol,
  onDeleted,
}: ExpenseTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Delete this expense? This cannot be undone.')
    if (!confirmed) return

    setDeletingId(id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) {
        toast.error('Failed to delete: ' + error.message)
      } else {
        toast.success('Expense deleted')
        onDeleted()
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No expenses yet. Add one to get started.
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Recurring</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell className="font-mono text-sm whitespace-nowrap">
                {formatDate(expense.expense_date)}
              </TableCell>
              <TableCell>
                {expense.expense_categories?.display_name ?? expense.category_id}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[200px] truncate">
                {expense.description ?? '—'}
              </TableCell>
              <TableCell className="text-right font-mono font-medium">
                {formatAmount(expense.amount, currencySymbol)}
              </TableCell>
              <TableCell>
                {expense.is_recurring ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <RefreshCw className="size-3" />
                    {expense.recurrence ?? 'yes'}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
                  onClick={() => handleDelete(expense.id)}
                  disabled={deletingId === expense.id}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
