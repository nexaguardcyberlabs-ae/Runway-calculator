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

export interface IncomeRow {
  id: string
  income_date: string
  income_type: string
  source: string | null
  amount: number
  currency: string
  is_recurring: boolean
  recurrence: string | null
}

interface IncomeTableProps {
  rows: IncomeRow[]
  currencySymbol: string
  onDeleted: () => void
}

const TYPE_LABELS: Record<string, string> = {
  retainer: 'Retainer',
  project: 'Project',
  other: 'Other',
}

function formatAmount(amount: number, symbol: string) {
  return `${symbol} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function IncomeTable({ rows, currencySymbol, onDeleted }: IncomeTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Delete this income entry? This cannot be undone.')
    if (!confirmed) return

    setDeletingId(id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('income').delete().eq('id', id)
      if (error) {
        toast.error('Failed to delete: ' + error.message)
      } else {
        toast.success('Income deleted')
        onDeleted()
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No income yet. Add one to get started.
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Recurring</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-sm whitespace-nowrap">
                {formatDate(row.income_date)}
              </TableCell>
              <TableCell>{TYPE_LABELS[row.income_type] ?? row.income_type}</TableCell>
              <TableCell className="text-muted-foreground max-w-[200px] truncate">
                {row.source ?? '—'}
              </TableCell>
              <TableCell className="text-right font-mono font-medium text-green-700">
                {formatAmount(row.amount, currencySymbol)}
              </TableCell>
              <TableCell>
                {row.is_recurring ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <RefreshCw className="size-3" />
                    {row.recurrence ?? 'yes'}
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
                  onClick={() => handleDelete(row.id)}
                  disabled={deletingId === row.id}
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
