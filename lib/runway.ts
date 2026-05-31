export interface PlannedEvent {
  event_date: string      // YYYY-MM-DD
  event_type: string      // 'expense' | 'income'
  amount: number
  is_recurring: boolean
  recurrence: string | null
  recurrence_end: string | null
}

export interface CashFlowPoint {
  month: string           // YYYY-MM
  cash: number
}

export interface RunwayExpense {
  amount: number
  expense_date: string   // YYYY-MM-DD
  is_recurring: boolean
  recurrence: string | null
}

export interface RunwayIncome {
  amount: number
  income_date: string    // YYYY-MM-DD
  is_recurring: boolean
  recurrence: string | null
}

export interface RunwayResult {
  cashOnHand: number
  monthlyRecurringExpense: number
  monthlyRecurringIncome: number
  netMonthlyBurn: number
  runwayMonths: number        // Infinity when profitable
  monthEndNeed: number
  breakevenIncomeNeeded: number
  expensesMTD: number
  incomeMTD: number
  next30Expenses: number
}

function normalizeToMonthly(amount: number, recurrence: string | null): number {
  if (recurrence === 'monthly')   return amount
  if (recurrence === 'quarterly') return amount / 3
  if (recurrence === 'yearly')    return amount / 12
  return 0
}

export function computeRunway(
  openingCash: number,
  expenses: RunwayExpense[],
  income: RunwayIncome[],
): RunwayResult {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  const y = now.getFullYear()
  const m = now.getMonth()
  const monthStart = new Date(y, m, 1).toISOString().split('T')[0]
  const monthEnd   = new Date(y, m + 1, 0).toISOString().split('T')[0]

  const plus30 = new Date(now)
  plus30.setDate(plus30.getDate() + 30)
  const plus30Str = plus30.toISOString().split('T')[0]

  // ── 1. Cash on hand ──────────────────────────────────────────────
  const cashOnHand =
    openingCash +
    income.filter(i => i.income_date <= todayStr).reduce((s, i) => s + i.amount, 0) -
    expenses.filter(e => e.expense_date <= todayStr).reduce((s, e) => s + e.amount, 0)

  // ── 2. Monthly recurring ──────────────────────────────────────────
  const monthlyRecurringExpense = expenses
    .filter(e => e.is_recurring)
    .reduce((s, e) => s + normalizeToMonthly(e.amount, e.recurrence), 0)

  const monthlyRecurringIncome = income
    .filter(i => i.is_recurring)
    .reduce((s, i) => s + normalizeToMonthly(i.amount, i.recurrence), 0)

  const netMonthlyBurn = monthlyRecurringExpense - monthlyRecurringIncome

  // ── 3. Runway ─────────────────────────────────────────────────────
  const runwayMonths = netMonthlyBurn <= 0 ? Infinity : cashOnHand / netMonthlyBurn

  // ── 4. Month-end need ─────────────────────────────────────────────
  const expensesThisMonth = expenses
    .filter(e => e.expense_date >= monthStart && e.expense_date <= monthEnd)
    .reduce((s, e) => s + e.amount, 0)

  const incomeThisMonth = income
    .filter(i => i.income_date >= monthStart && i.income_date <= monthEnd)
    .reduce((s, i) => s + i.amount, 0)

  const monthEndNeed = Math.max(0, expensesThisMonth - incomeThisMonth)

  // ── 5. Breakeven ──────────────────────────────────────────────────
  const breakevenIncomeNeeded = monthlyRecurringExpense

  // ── 6. MTD + Next-30 ─────────────────────────────────────────────
  const expensesMTD = expensesThisMonth
  const incomeMTD   = incomeThisMonth

  // Non-recurring entries due in today..today+30
  const next30NonRecurring = expenses
    .filter(e => !e.is_recurring && e.expense_date >= todayStr && e.expense_date <= plus30Str)
    .reduce((s, e) => s + e.amount, 0)

  // Recurring: expand one 30-day window ≈ normalizeToMonthly
  const next30Recurring = expenses
    .filter(e => e.is_recurring)
    .reduce((s, e) => s + normalizeToMonthly(e.amount, e.recurrence), 0)

  const next30Expenses = next30NonRecurring + next30Recurring

  return {
    cashOnHand,
    monthlyRecurringExpense,
    monthlyRecurringIncome,
    netMonthlyBurn,
    runwayMonths,
    monthEndNeed,
    breakevenIncomeNeeded,
    expensesMTD,
    incomeMTD,
    next30Expenses,
  }
}

// ── Projection ────────────────────────────────────────────────────────────────

export function projectCashFlow(
  openingCash: number,
  expenses: RunwayExpense[],
  income: RunwayIncome[],
  plannedEvents: PlannedEvent[] = [],
  horizonMonths = 12,
): CashFlowPoint[] {
  const { cashOnHand, monthlyRecurringExpense, monthlyRecurringIncome } =
    computeRunway(openingCash, expenses, income)
  const netBurn = monthlyRecurringExpense - monthlyRecurringIncome

  const now = new Date()
  const points: CashFlowPoint[] = []
  let cash = cashOnHand

  for (let i = 0; i < horizonMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const yy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const monthStr = `${yy}-${mm}`
    const lastDay = new Date(yy, d.getMonth() + 1, 0).getDate()
    const monthStart = `${monthStr}-01`
    const monthEnd = `${monthStr}-${String(lastDay).padStart(2, '0')}`

    // Apply recurring burn for every month after the first
    if (i > 0) cash -= netBurn

    // Overlay planned events for this month
    for (const ev of plannedEvents) {
      const sign = ev.event_type === 'income' ? 1 : -1

      if (!ev.is_recurring) {
        if (ev.event_date >= monthStart && ev.event_date <= monthEnd) {
          cash += sign * ev.amount
        }
      } else {
        // Recurring: apply normalized monthly amount while within the window
        const evStartMonth = ev.event_date.substring(0, 7)
        const evEndMonth = ev.recurrence_end
          ? ev.recurrence_end.substring(0, 7)
          : null
        const inWindow =
          monthStr >= evStartMonth && (!evEndMonth || monthStr <= evEndMonth)
        if (inWindow) {
          cash += sign * normalizeToMonthly(ev.amount, ev.recurrence)
        }
      }
    }

    points.push({ month: monthStr, cash })
  }

  return points
}
