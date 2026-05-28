'use client'

import { useState, useTransition } from 'react'
import { addGoal, toggleGoal, deleteGoal, addSubtask, toggleSubtask, deleteSubtask } from '../actions'

type Subtask = { id: string; title: string; completed: boolean }
type Goal = {
  id: string; title: string; description: string | null
  target_date: string | null; completed: boolean
  category: 'fitness' | 'finance' | 'education' | 'personal'
  subtasks: Subtask[]
}

const CATEGORIES = [
  { key: 'all',       label: 'All',       color: '#6366f1', bg: 'bg-[#6366f1]',  text: 'text-[#6366f1]',  border: 'border-[#6366f1]/30', dim: 'bg-[#6366f1]/10' },
  { key: 'fitness',   label: 'Fitness',   color: '#f97316', bg: 'bg-[#f97316]',  text: 'text-[#f97316]',  border: 'border-[#f97316]/30', dim: 'bg-[#f97316]/10' },
  { key: 'finance',   label: 'Finance',   color: '#22c55e', bg: 'bg-[#22c55e]',  text: 'text-[#22c55e]',  border: 'border-[#22c55e]/30', dim: 'bg-[#22c55e]/10' },
  { key: 'education', label: 'Education', color: '#3b82f6', bg: 'bg-[#3b82f6]',  text: 'text-[#3b82f6]',  border: 'border-[#3b82f6]/30', dim: 'bg-[#3b82f6]/10' },
  { key: 'personal',  label: 'Personal',  color: '#a855f7', bg: 'bg-[#a855f7]',  text: 'text-[#a855f7]',  border: 'border-[#a855f7]/30', dim: 'bg-[#a855f7]/10' },
] as const

type CategoryKey = 'all' | 'fitness' | 'finance' | 'education' | 'personal'

export default function GoalsClient({ goals }: { goals: Goal[] }) {
  const [activeTab, setActiveTab] = useState<CategoryKey>('all')
  const [showCompleted, setShowCompleted] = useState(false)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null)
  const [newSubtaskText, setNewSubtaskText] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  const cat = CATEGORIES.find(c => c.key === activeTab)!

  const filtered = goals.filter(g => activeTab === 'all' || g.category === activeTab)
  const active = filtered.filter(g => !g.completed).sort((a, b) => {
    if (!a.target_date && !b.target_date) return 0
    if (!a.target_date) return 1
    if (!b.target_date) return -1
    return a.target_date.localeCompare(b.target_date)
  })
  const completed = filtered.filter(g => g.completed).sort((a, b) => {
    if (!a.target_date && !b.target_date) return 0
    if (!a.target_date) return 1
    if (!b.target_date) return -1
    return a.target_date.localeCompare(b.target_date)
  })

  function getProgress(goal: Goal) {
    if (goal.subtasks.length === 0) return goal.completed ? 100 : 0
    return Math.round((goal.subtasks.filter(s => s.completed).length / goal.subtasks.length) * 100)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null
    const date = new Date(dateStr + 'T00:00:00')
    const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, overdue: true }
    if (diff === 0) return { label: 'Due today', overdue: false }
    if (diff === 1) return { label: 'Due tomorrow', overdue: false }
    return { label: `${diff}d left`, overdue: false }
  }

  function getCatStyle(category: string) {
    return CATEGORIES.find(c => c.key === category) ?? CATEGORIES[0]
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-white">Goals</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{active.length} active · {completed.length} completed</p>
        </div>
        <button
          onClick={() => setShowAddGoal(true)}
          className="flex items-center gap-1.5 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add goal
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setActiveTab(c.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === c.key
                ? `${c.dim} ${c.text} border ${c.border}`
                : 'text-[#6b7280] hover:text-white bg-[#111111] border border-[#1f1f1f]'
            }`}
          >
            {c.label}
            <span className="ml-1.5 opacity-60">
              {c.key === 'all' ? goals.filter(g => !g.completed).length : goals.filter(g => g.category === c.key && !g.completed).length}
            </span>
          </button>
        ))}
      </div>

      {/* Add goal form */}
      {showAddGoal && (
        <div className={`bg-[#111111] border ${cat.border} rounded-xl p-4 mb-4`}>
          <h3 className="text-sm font-medium text-white mb-3">New goal</h3>
          <form
            action={async (fd) => { startTransition(async () => { await addGoal(fd); setShowAddGoal(false) }) }}
            className="space-y-3"
          >
            <input name="title" placeholder="What do you want to achieve?" required autoFocus />
            <textarea name="description" placeholder="Why does this matter? (optional)" rows={2} style={{ resize: 'none' }} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#6b7280] mb-1">Category</label>
                <select name="category" defaultValue={activeTab === 'all' ? 'personal' : activeTab}>
                  <option value="fitness">Fitness</option>
                  <option value="finance">Finance</option>
                  <option value="education">Education</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#6b7280] mb-1">Target date</label>
                <input name="target_date" type="date" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={isPending} className={`${cat.bg} hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors`}>
                {isPending ? 'Adding...' : 'Add goal'}
              </button>
              <button type="button" onClick={() => setShowAddGoal(false)} className="text-[#6b7280] hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Active goals */}
      {active.length === 0 && !showAddGoal && (
        <div className="text-center py-12">
          <p className="text-[#4b5563] text-sm">No active goals in this category.</p>
        </div>
      )}

      <div className="space-y-2">
        {active.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            catStyle={getCatStyle(goal.category)}
            expanded={expandedGoal === goal.id}
            onToggleExpand={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
            onToggleGoal={(c) => startTransition(() => toggleGoal(goal.id, c))}
            onDeleteGoal={() => startTransition(() => deleteGoal(goal.id))}
            onAddSubtask={(t) => startTransition(() => addSubtask(goal.id, t))}
            onToggleSubtask={(id, c) => startTransition(() => toggleSubtask(id, c))}
            onDeleteSubtask={(id) => startTransition(() => deleteSubtask(id))}
            newSubtaskText={newSubtaskText[goal.id] || ''}
            onSubtaskTextChange={(t) => setNewSubtaskText(p => ({ ...p, [goal.id]: t }))}
            progress={getProgress(goal)}
            dateInfo={formatDate(goal.target_date)}
          />
        ))}
      </div>

      {/* Completed toggle */}
      {completed.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-sm text-[#4b5563] hover:text-white transition-colors mb-3"
          >
            <svg className={`w-4 h-4 transition-transform ${showCompleted ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {completed.length} completed
          </button>

          {showCompleted && (
            <div className="space-y-2 opacity-50">
              {completed.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  catStyle={getCatStyle(goal.category)}
                  expanded={expandedGoal === goal.id}
                  onToggleExpand={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                  onToggleGoal={(c) => startTransition(() => toggleGoal(goal.id, c))}
                  onDeleteGoal={() => startTransition(() => deleteGoal(goal.id))}
                  onAddSubtask={(t) => startTransition(() => addSubtask(goal.id, t))}
                  onToggleSubtask={(id, c) => startTransition(() => toggleSubtask(id, c))}
                  onDeleteSubtask={(id) => startTransition(() => deleteSubtask(id))}
                  newSubtaskText={newSubtaskText[goal.id] || ''}
                  onSubtaskTextChange={(t) => setNewSubtaskText(p => ({ ...p, [goal.id]: t }))}
                  progress={getProgress(goal)}
                  dateInfo={formatDate(goal.target_date)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type CatStyle = { color: string; bg: string; text: string; border: string; dim: string; label: string; key: string }
type DateInfo = { label: string; overdue: boolean } | null

function GoalCard({ goal, catStyle, expanded, onToggleExpand, onToggleGoal, onDeleteGoal, onAddSubtask, onToggleSubtask, onDeleteSubtask, newSubtaskText, onSubtaskTextChange, progress, dateInfo }: {
  goal: Goal; catStyle: CatStyle; expanded: boolean
  onToggleExpand: () => void; onToggleGoal: (c: boolean) => void; onDeleteGoal: () => void
  onAddSubtask: (t: string) => void; onToggleSubtask: (id: string, c: boolean) => void; onDeleteSubtask: (id: string) => void
  newSubtaskText: string; onSubtaskTextChange: (t: string) => void; progress: number; dateInfo: DateInfo
}) {
  return (
    <div className={`bg-[#111111] border rounded-xl transition-all ${goal.completed ? 'border-[#1a1a1a]' : 'border-[#1f1f1f]'}`}>
      <div className="flex items-start gap-3 p-4">
        <button
          onClick={() => onToggleGoal(!goal.completed)}
          className="mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
          style={{ backgroundColor: goal.completed ? catStyle.color : 'transparent', borderColor: goal.completed ? catStyle.color : '#3a3a3a' }}
        >
          {goal.completed && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${catStyle.dim} ${catStyle.text} flex-shrink-0`}>{catStyle.label}</span>
              <p className={`text-sm font-medium truncate ${goal.completed ? 'line-through text-[#4b5563]' : 'text-white'}`}>{goal.title}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {dateInfo && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${dateInfo.overdue ? 'text-red-400 bg-red-400/10' : 'text-[#6b7280] bg-[#1a1a1a]'}`}>{dateInfo.label}</span>
              )}
              <button onClick={onToggleExpand} className="p-1 text-[#4b5563] hover:text-white transition-colors rounded">
                <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              <button onClick={onDeleteGoal} className="p-1 text-[#4b5563] hover:text-red-400 transition-colors rounded">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
          {goal.description && <p className="text-xs text-[#6b7280] mt-0.5">{goal.description}</p>}
          {goal.subtasks.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: catStyle.color + '99' }} />
              </div>
              <span className="text-xs text-[#4b5563]">{goal.subtasks.filter(s => s.completed).length}/{goal.subtasks.length}</span>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#1a1a1a]">
          <div className="pt-3 space-y-1">
            {goal.subtasks.map(s => (
              <div key={s.id} className="flex items-center gap-2 group py-1">
                <button
                  onClick={() => onToggleSubtask(s.id, !s.completed)}
                  className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors"
                  style={{ backgroundColor: s.completed ? catStyle.color + '66' : 'transparent', borderColor: s.completed ? catStyle.color + '66' : '#3a3a3a' }}
                >
                  {s.completed && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </button>
                <span className={`text-sm flex-1 ${s.completed ? 'line-through text-[#4b5563]' : 'text-[#d1d5db]'}`}>{s.title}</span>
                <button onClick={() => onDeleteSubtask(s.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-[#4b5563] hover:text-red-400 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#4b5563]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </div>
              <input
                value={newSubtaskText}
                onChange={e => onSubtaskTextChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newSubtaskText.trim()) { onAddSubtask(newSubtaskText.trim()); onSubtaskTextChange('') } }}
                placeholder="Add a task, press Enter"
                className="flex-1 bg-transparent border-none text-sm text-[#9ca3af] placeholder:text-[#3a3a3a] focus:outline-none focus:ring-0 p-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
