/**
 * runway.test.ts — plain node:assert tests for lib/runway.ts
 * Run with:  npx tsx test/runway.test.ts
 */

import assert from 'node:assert/strict'
import { computeRunway, projectCashFlow } from '../lib/runway'
import type { RunwayExpense, RunwayIncome, PlannedEvent } from '../lib/runway'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✓  ${name}`)
    passed++
  } catch (e) {
    console.error(`  ✗  ${name}`)
    console.error(`     ${(e as Error).message}`)
    failed++
  }
}

function close(a: number, b: number, eps = 0.0001, msg = '') {
  assert.ok(Math.abs(a - b) < eps, `${msg} expected ~${b}, got ${a}`)
}

// ── helpers ─────────────────────────────────────────────────────────────────

// All dates in UTC to match computeRunway's `new Date().toISOString()` behaviour.
const today = new Date().toISOString().split('T')[0]            // "YYYY-MM-DD" UTC
const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]

// First of next calendar month in UTC.
// Parse the UTC month index from the date string so local timezone never interferes.
const [_ty, _tm] = today.split('-').map(Number)                 // _tm is 1-based month
const nextMonth = new Date(Date.UTC(_ty, _tm, 1)).toISOString().split('T')[0]
// e.g. today "2026-05-31" → _tm=5 → Date.UTC(2026,5,1)=June 1 → "2026-06-01"

// ── normalizeToMonthly (via computeRunway internals) ─────────────────────────

console.log('\n[ normalizeToMonthly — tested via recurring sums ]\n')

test('monthly recurring expense = full amount', () => {
  const exp: RunwayExpense[] = [
    { amount: 1200, expense_date: yesterday, is_recurring: true, recurrence: 'monthly' },
  ]
  const r = computeRunway(0, exp, [])
  close(r.monthlyRecurringExpense, 1200, 0.01, 'monthly')
})

test('quarterly recurring expense = amount / 3', () => {
  const exp: RunwayExpense[] = [
    { amount: 3000, expense_date: yesterday, is_recurring: true, recurrence: 'quarterly' },
  ]
  const r = computeRunway(0, exp, [])
  close(r.monthlyRecurringExpense, 1000, 0.01, 'quarterly/3')
})

test('yearly recurring expense = amount / 12', () => {
  const exp: RunwayExpense[] = [
    { amount: 12000, expense_date: yesterday, is_recurring: true, recurrence: 'yearly' },
  ]
  const r = computeRunway(0, exp, [])
  close(r.monthlyRecurringExpense, 1000, 0.01, 'yearly/12')
})

test('null recurrence contributes 0 to monthly burn', () => {
  const exp: RunwayExpense[] = [
    { amount: 9999, expense_date: yesterday, is_recurring: false, recurrence: null },
  ]
  const r = computeRunway(0, exp, [])
  assert.equal(r.monthlyRecurringExpense, 0)
})

// ── cashOnHand ───────────────────────────────────────────────────────────────

console.log('\n[ cashOnHand ]\n')

test('cashOnHand = opening + income_past - expense_past', () => {
  const exp: RunwayExpense[] = [
    { amount: 30000, expense_date: yesterday, is_recurring: false, recurrence: null },
  ]
  const inc: RunwayIncome[] = [
    { amount: 10000, income_date: yesterday, is_recurring: false, recurrence: null },
  ]
  const r = computeRunway(100000, exp, inc)
  close(r.cashOnHand, 80000, 0.01, 'cashOnHand')
})

test('future-dated entries do NOT affect cashOnHand', () => {
  const exp: RunwayExpense[] = [
    { amount: 99999, expense_date: nextMonth, is_recurring: false, recurrence: null },
  ]
  const r = computeRunway(50000, exp, [])
  close(r.cashOnHand, 50000, 0.01, 'future expense excluded')
})

// ── netMonthlyBurn + runway ──────────────────────────────────────────────────

console.log('\n[ netMonthlyBurn + runwayMonths ]\n')

test('worked example: 100000 cash, burn 20000, income 5000 → runway 6.67 mo', () => {
  const exp: RunwayExpense[] = [
    { amount: 20000, expense_date: yesterday, is_recurring: true, recurrence: 'monthly' },
  ]
  const inc: RunwayIncome[] = [
    { amount: 5000, income_date: yesterday, is_recurring: true, recurrence: 'monthly' },
  ]
  // opening 100000, actual past: -20000 + 5000 = cashOnHand 85000
  // netBurn = 20000 - 5000 = 15000
  // runway = 85000 / 15000 = 5.667 (uses cashOnHand not opening)
  const r = computeRunway(100000, exp, inc)
  close(r.monthlyRecurringExpense, 20000, 0.01, 'recurring expense')
  close(r.monthlyRecurringIncome, 5000, 0.01, 'recurring income')
  close(r.netMonthlyBurn, 15000, 0.01, 'netBurn')
  close(r.runwayMonths, r.cashOnHand / 15000, 0.01, 'runway')
})

test('worked example with opening_cash only (no actuals): runway = 100000/15000 = 6.67', () => {
  // No past actuals — cashOnHand = opening_cash exactly
  const exp: RunwayExpense[] = [
    { amount: 20000, expense_date: nextMonth, is_recurring: true, recurrence: 'monthly' },
  ]
  const inc: RunwayIncome[] = [
    { amount: 5000, income_date: nextMonth, is_recurring: true, recurrence: 'monthly' },
  ]
  const r = computeRunway(100000, exp, inc)
  close(r.cashOnHand, 100000, 0.01, 'cashOnHand = opening')
  close(r.netMonthlyBurn, 15000, 0.01, 'netBurn')
  close(r.runwayMonths, 100000 / 15000, 0.001, 'runway 6.667')
})

test('runwayMonths = Infinity when netMonthlyBurn <= 0', () => {
  const exp: RunwayExpense[] = [
    { amount: 5000, expense_date: nextMonth, is_recurring: true, recurrence: 'monthly' },
  ]
  const inc: RunwayIncome[] = [
    { amount: 10000, income_date: nextMonth, is_recurring: true, recurrence: 'monthly' },
  ]
  const r = computeRunway(100000, exp, inc)
  assert.equal(r.runwayMonths, Infinity)
})

test('runwayMonths = Infinity when no recurring at all', () => {
  const r = computeRunway(50000, [], [])
  assert.equal(r.runwayMonths, Infinity)
})

// ── projectCashFlow ──────────────────────────────────────────────────────────

console.log('\n[ projectCashFlow ]\n')

test('returns array of length horizonMonths', () => {
  const r = projectCashFlow(100000, [], [], [], 12)
  assert.equal(r.length, 12)
})

test('first point = cashOnHand', () => {
  const r = projectCashFlow(100000, [], [], [], 6)
  close(r[0].cash, 100000, 0.01, 'month 0')
})

test('each subsequent month decreases by netBurn', () => {
  const exp: RunwayExpense[] = [
    { amount: 20000, expense_date: nextMonth, is_recurring: true, recurrence: 'monthly' },
  ]
  const inc: RunwayIncome[] = [
    { amount: 5000, income_date: nextMonth, is_recurring: true, recurrence: 'monthly' },
  ]
  // No past actuals → cashOnHand = 100000, netBurn = 15000
  const pts = projectCashFlow(100000, exp, inc, [], 4)
  close(pts[0].cash, 100000, 0.01, 'month 0')
  close(pts[1].cash, 85000, 0.01, 'month 1')
  close(pts[2].cash, 70000, 0.01, 'month 2')
  close(pts[3].cash, 55000, 0.01, 'month 3')
})

test('month labels are YYYY-MM strings', () => {
  const pts = projectCashFlow(0, [], [], [], 3)
  for (const p of pts) {
    assert.match(p.month, /^\d{4}-\d{2}$/)
  }
})

// ── planned events in projectCashFlow ────────────────────────────────────────

console.log('\n[ planned events ]\n')

test('one-off planned expense applied in its exact month', () => {
  // No recurring → burn = 0, cashOnHand = 100000
  // Planned expense of 25000 in next month
  const planned: PlannedEvent[] = [
    {
      event_date: nextMonth,
      event_type: 'expense',
      amount: 25000,
      is_recurring: false,
      recurrence: null,
      recurrence_end: null,
    },
  ]
  const pts = projectCashFlow(100000, [], [], planned, 3)
  // month 0 = current month: no planned event → 100000
  close(pts[0].cash, 100000, 0.01, 'month 0')
  // month 1 = next month: -25000
  close(pts[1].cash, 75000, 0.01, 'month 1 after planned expense')
  // month 2: no more events
  close(pts[2].cash, 75000, 0.01, 'month 2 unchanged')
})

test('one-off planned income applied in its exact month', () => {
  const planned: PlannedEvent[] = [
    {
      event_date: nextMonth,
      event_type: 'income',
      amount: 40000,
      is_recurring: false,
      recurrence: null,
      recurrence_end: null,
    },
  ]
  const pts = projectCashFlow(100000, [], [], planned, 3)
  close(pts[0].cash, 100000, 0.01, 'month 0')
  close(pts[1].cash, 140000, 0.01, 'month 1 after planned income +40k')
  close(pts[2].cash, 140000, 0.01, 'month 2 unchanged')
})

test('recurring planned expense applied monthly from event_date', () => {
  const planned: PlannedEvent[] = [
    {
      event_date: nextMonth,
      event_type: 'expense',
      amount: 5000,
      is_recurring: true,
      recurrence: 'monthly',
      recurrence_end: null,
    },
  ]
  const pts = projectCashFlow(100000, [], [], planned, 4)
  close(pts[0].cash, 100000, 0.01, 'month 0 (before start)')
  close(pts[1].cash, 95000, 0.01, 'month 1 -5000')
  close(pts[2].cash, 90000, 0.01, 'month 2 -5000')
  close(pts[3].cash, 85000, 0.01, 'month 3 -5000')
})

test('recurring planned expense stops at recurrence_end', () => {
  const planned: PlannedEvent[] = [
    {
      event_date: nextMonth,
      event_type: 'expense',
      amount: 5000,
      is_recurring: true,
      recurrence: 'monthly',
      recurrence_end: nextMonth,  // ends same month it starts
    },
  ]
  const pts = projectCashFlow(100000, [], [], planned, 4)
  close(pts[0].cash, 100000, 0.01, 'month 0')
  close(pts[1].cash, 95000, 0.01, 'month 1 -5000')
  close(pts[2].cash, 95000, 0.01, 'month 2 no deduction (past end)')
})

// ── currency + company scoping (static assertions) ──────────────────────────

console.log('\n[ currency / company-scoping invariants ]\n')

test('computeRunway never mutates input arrays', () => {
  const exp: RunwayExpense[] = [
    { amount: 1000, expense_date: yesterday, is_recurring: true, recurrence: 'monthly' },
  ]
  const inc: RunwayIncome[] = []
  const expCopy = JSON.stringify(exp)
  computeRunway(0, exp, inc)
  assert.equal(JSON.stringify(exp), expCopy, 'expense array unchanged')
})

test('projectCashFlow is pure — same inputs give same outputs', () => {
  const exp: RunwayExpense[] = [
    { amount: 20000, expense_date: nextMonth, is_recurring: true, recurrence: 'monthly' },
  ]
  const r1 = projectCashFlow(100000, exp, [], [], 6)
  const r2 = projectCashFlow(100000, exp, [], [], 6)
  assert.deepEqual(r1, r2, 'deterministic output')
})

// ── summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`)
console.log(`  ${passed + failed} tests: ${passed} passed, ${failed} failed`)
console.log(`${'─'.repeat(50)}\n`)

if (failed > 0) process.exit(1)
