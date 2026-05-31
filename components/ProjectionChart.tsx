'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { type CashFlowPoint } from '@/lib/runway'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ProjectionChartProps {
  data: CashFlowPoint[]
  currencySymbol: string
}

function formatMonthTick(month: string) {
  const [y, m] = month.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  })
}

function shortFmt(value: number, symbol: string) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${symbol} ${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${sign}${symbol} ${(abs / 1_000).toFixed(0)}k`
  return `${sign}${symbol} ${abs.toFixed(0)}`
}

interface TooltipPayload {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
  currencySymbol: string
}

function CustomTooltip({ active, payload, label, currencySymbol }: TooltipPayload) {
  if (!active || !payload?.length) return null
  const cash = payload[0].value ?? 0
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{formatMonthTick(label ?? '')}</p>
      <p className={cash < 0 ? 'text-red-600' : 'text-green-600'}>
        {shortFmt(cash, currencySymbol)}
      </p>
    </div>
  )
}

export default function ProjectionChart({ data, currencySymbol }: ProjectionChartProps) {
  if (!data.length) return null

  const minCash = Math.min(...data.map(d => d.cash))
  const maxCash = Math.max(...data.map(d => d.cash))
  const padding = (maxCash - minCash) * 0.15 || Math.abs(maxCash) * 0.2 || 1000

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          12-Month Cash Projection
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthTick}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => shortFmt(v, currencySymbol)}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
                domain={[minCash - padding, maxCash + padding]}
                width={72}
              />
              <Tooltip
                content={<CustomTooltip currencySymbol={currencySymbol} />}
              />
              <ReferenceLine
                y={0}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{ value: 'Cash-out', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }}
              />
              <Line
                type="monotone"
                dataKey="cash"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'var(--primary)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
