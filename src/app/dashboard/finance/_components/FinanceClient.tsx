'use client'

import { useState, useTransition } from 'react'
import { addSnapshot, addTransaction, deleteTransaction, deleteSnapshot } from '../actions'

type Snapshot = { id: string; date: string; balance: number; notes: string | null }
type Transaction = { id: string; date: string; name: string; amount: number; type: string; category: string }

const CATEGORIES = ['General', 'Food & Drink', 'Shopping', 'Transport', 'Entertainment', 'Health', 'Bills', 'Education', 'Fitness', 'Savings']

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)
}

export default function FinanceClient({ snapshots, transactions }: {
  snapshots: Snapshot[]
  transactions: Transaction[]
}) {
  const [tab, setTab] = useState<'overview' | 'transactions' | 'subscriptions'>('overview')
  const [showSnapshotForm, setShowSnapshotForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const latestSnapshot = snapshots[0]

  // All expenses since last snapshot
  const expensesSinceSnapshot = latestSnapshot
    ? transactions.filter(t => t.date >= latestSnapshot.date)
    : transactions

  const totalSpent = expensesSinceSnapshot.reduce((a, t) => a + t.amount, 0)
  const currentBalance = latestSnapshot ? latestSnapshot.balance - totalSpent : null

  const subscriptions = transactions.filter(t => t.type === 'subscription')
  const uniqueSubs = Object.values(
    subscriptions.reduce((acc, t) => {
      if (!acc[t.name]) acc[t.name] = { ...t, count: 1 }
      else acc[t.name].count++
      return acc
    }, {} as Record<string, Transaction & { count: number }>)
  )
  const monthlySubTotal = uniqueSubs.reduce((a, s) => a + s.amount, 0)

  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisMonthSpend = transactions
    .filter(t => t.date.startsWith(thisMonth))
    .reduce((a, t) => a + t.amount, 0)

  const balanceColor = currentBalance !== null
    ? currentBalance > 500 ? '#22c55e' : currentBalance > 100 ? '#f59e0b' : '#ef4444'
    : '#9ca3af'

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Finance</h1>
          <p className="text-[#9ca3af] text-sm mt-0.5">Track your spending and balance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowSnapshotForm(!showSnapshotForm); setShowExpenseForm(false) }}
            className="flex items-center gap-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
            + Deposit balance
          </button>
          <button onClick={() => { setShowExpenseForm(!showExpenseForm); setShowSnapshotForm(false) }}
            className="flex items-center gap-1.5 bg-[#111111] hover:bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
            + Add expense
          </button>
        </div>
      </div>

      {/* Snapshot form */}
      {showSnapshotForm && (
        <div className="bg-[#111111] border border-[#22c55e]/30 rounded-xl p-4 mb-5">
          <p className="text-sm font-medium text-white mb-3">Set current balance</p>
          <p className="text-xs text-[#6b7280] mb-3">Enter what your bank account actually shows right now. Expenses will be deducted from this going forward.</p>
          <form action={async (fd) => { startTransition(async () => { await addSnapshot(fd); setShowSnapshotForm(false) }) }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1">Balance (£)</label>
                <input name="balance" type="number" step="0.01" placeholder="1250.00" required autoFocus />
              </div>
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1">Date</label>
                <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <input name="notes" placeholder="Notes (optional)" />
            <div className="flex gap-2">
              <button type="submit" disabled={isPending} className="bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-medium px-4 py-2 rounded-lg">Save</button>
              <button type="button" onClick={() => setShowSnapshotForm(false)} className="text-[#9ca3af] hover:text-white text-sm px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Expense form */}
      {showExpenseForm && (
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-4 mb-5">
          <p className="text-sm font-medium text-white mb-3">Add expense</p>
          <form action={async (fd) => { startTransition(async () => { await addTransaction(fd); setShowExpenseForm(false) }) }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input name="name" placeholder="What was it? (e.g. Netflix)" required autoFocus />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] text-sm">£</span>
                <input name="amount" type="number" step="0.01" placeholder="9.99" min="0" required className="pl-7" />
              </div>
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1">Type</label>
                <select name="type" required>
                  <option value="expense">Single expense</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1">Category</label>
                <select name="category">
                  {CATEGORIES.map(c => <option key={c} value={c.toLowerCase().replace(' & ', '_').replace(' ', '_')}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1">Date</label>
                <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={isPending} className="bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-medium px-4 py-2 rounded-lg">Add</button>
              <button type="button" onClick={() => setShowExpenseForm(false)} className="text-[#9ca3af] hover:text-white text-sm px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Balance card */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 mb-5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: currentBalance !== null && currentBalance > 0
            ? `radial-gradient(ellipse at top right, ${balanceColor}12 0%, transparent 60%)`
            : undefined
        }} />
        <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-1">Current balance</p>
        {currentBalance !== null ? (
          <>
            <p className="text-4xl font-bold tabular-nums" style={{ color: balanceColor }}>{fmt(currentBalance)}</p>
            {latestSnapshot && (
              <p className="text-xs text-[#6b7280] mt-2">
                Last snapshot: {fmt(latestSnapshot.balance)} on {latestSnapshot.date}
              </p>
            )}
          </>
        ) : (
          <div>
            <p className="text-2xl font-bold text-[#4b5563]">No balance set</p>
            <p className="text-xs text-[#4b5563] mt-1">Click "Deposit balance" to set your current bank balance</p>
          </div>
        )}

        <div className="flex gap-4 mt-4 pt-4 border-t border-[#1a1a1a]">
          <div>
            <p className="text-xs text-[#6b7280]">Spent since snapshot</p>
            <p className="text-lg font-semibold text-red-400">-{fmt(totalSpent)}</p>
          </div>
          <div>
            <p className="text-xs text-[#6b7280]">This month</p>
            <p className="text-lg font-semibold text-white">-{fmt(thisMonthSpend)}</p>
          </div>
          <div>
            <p className="text-xs text-[#6b7280]">Subscriptions/mo</p>
            <p className="text-lg font-semibold text-[#f59e0b]">-{fmt(monthlySubTotal)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5">
        {(['overview', 'transactions', 'subscriptions'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${tab === t ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30' : 'text-[#6b7280] bg-[#111111] border border-[#1f1f1f] hover:text-white'}`}>
            {t}
            {t === 'subscriptions' && <span className="ml-1.5 text-[#22c55e]/60">{uniqueSubs.length}</span>}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-2">
          {/* Balance history */}
          {snapshots.length > 0 && (
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-[#9ca3af] mb-3">Balance history</p>
              <div className="space-y-2">
                {snapshots.map(s => (
                  <div key={s.id} className="flex items-center justify-between group">
                    <div>
                      <p className="text-sm text-white">{fmt(s.balance)}</p>
                      <p className="text-xs text-[#6b7280]">{s.date}{s.notes ? ` · ${s.notes}` : ''}</p>
                    </div>
                    <button onClick={() => startTransition(() => deleteSnapshot(s.id))}
                      className="opacity-0 group-hover:opacity-100 text-[#4b5563] hover:text-red-400 transition-all p-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent 5 transactions */}
          <p className="text-xs font-semibold text-[#9ca3af] mb-2">Recent</p>
          {transactions.slice(0, 5).map(t => (
            <TransactionRow key={t.id} t={t} onDelete={() => startTransition(() => deleteTransaction(t.id))} />
          ))}
          {transactions.length > 5 && (
            <button onClick={() => setTab('transactions')} className="text-xs text-[#6b7280] hover:text-white transition-colors w-full text-center py-2">
              View all {transactions.length} transactions →
            </button>
          )}
        </div>
      )}

      {/* Transactions tab */}
      {tab === 'transactions' && (
        <div className="space-y-1.5">
          {transactions.length === 0 && <p className="text-center text-[#4b5563] text-sm py-8">No transactions yet.</p>}
          {transactions.map(t => (
            <TransactionRow key={t.id} t={t} onDelete={() => startTransition(() => deleteTransaction(t.id))} />
          ))}
        </div>
      )}

      {/* Subscriptions tab */}
      {tab === 'subscriptions' && (
        <div className="space-y-3">
          <div className="bg-[#111111] border border-[#f59e0b]/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#9ca3af]">Monthly total</p>
              <p className="text-2xl font-bold text-white">{fmt(monthlySubTotal)}</p>
              <p className="text-xs text-[#6b7280] mt-0.5">{fmt(monthlySubTotal * 12)}/year</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#6b7280]">{uniqueSubs.length} subscriptions</p>
            </div>
          </div>

          {uniqueSubs.length === 0 && (
            <p className="text-center text-[#4b5563] text-sm py-8">No subscriptions yet. Add an expense and choose "Subscription".</p>
          )}

          <div className="space-y-2">
            {uniqueSubs.map(s => (
              <div key={s.id} className="bg-[#111111] border border-[#1f1f1f] rounded-xl px-4 py-3 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-[#6b7280]">Monthly · last {s.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-[#f59e0b]">{fmt(s.amount)}/mo</p>
                  <button onClick={() => startTransition(() => deleteTransaction(s.id))}
                    className="opacity-0 group-hover:opacity-100 text-[#4b5563] hover:text-red-400 transition-all p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TransactionRow({ t, onDelete }: { t: Transaction; onDelete: () => void }) {
  const isSubscription = t.type === 'subscription'
  return (
    <div className="flex items-center gap-3 bg-[#111111] border border-[#1a1a1a] rounded-xl px-4 py-3 group hover:border-[#252525] transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSubscription ? 'bg-[#f59e0b]/10' : 'bg-[#ef4444]/10'}`}>
        {isSubscription ? (
          <svg className="w-3.5 h-3.5 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{t.name}</p>
        <p className="text-xs text-[#6b7280]">{t.date} · <span className="capitalize">{t.category.replace('_', ' ')}</span></p>
      </div>
      <div className="flex items-center gap-3">
        <p className={`text-sm font-semibold tabular-nums ${isSubscription ? 'text-[#f59e0b]' : 'text-[#f87171]'}`}>
          -{new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(t.amount)}
        </p>
        {isSubscription && <span className="text-[10px] text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded-full">sub</span>}
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-[#4b5563] hover:text-red-400 transition-all p-0.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  )
}
