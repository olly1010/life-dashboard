'use client'

import { useState, useTransition } from 'react'
import { addMeal, deleteMeal, saveTargets } from '../actions'

type Meal = { id: string; name: string; calories: number; protein: number; carbs: number; fat: number }
type Targets = { calories: number; protein: number; carbs: number; fat: number }

export default function CaloriesClient({ meals, targets }: { meals: Meal[]; targets: Targets }) {
  const [showAddMeal, setShowAddMeal] = useState(false)
  const [showTargets, setShowTargets] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [foodInput, setFoodInput] = useState('')
  const [estimating, setEstimating] = useState(false)
  const [estimated, setEstimated] = useState<{ name: string; calories: number; protein: number; carbs: number; fat: number } | null>(null)
  const [estimateError, setEstimateError] = useState('')

  const totals = meals.reduce((a, m) => ({ calories: a.calories + m.calories, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  async function estimateFood() {
    if (!foodInput.trim()) return
    setEstimating(true)
    setEstimateError('')
    setEstimated(null)
    try {
      const res = await fetch('/api/food-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ food: foodInput }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEstimated(data)
    } catch {
      setEstimateError('Could not estimate — check your food description and try again.')
    } finally {
      setEstimating(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Calories</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{today}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTargets(!showTargets)} className="flex items-center gap-1.5 text-[#6b7280] hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            Targets
          </button>
          <button onClick={() => { setShowAddMeal(true); setEstimated(null); setFoodInput('') }} className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Log meal
          </button>
        </div>
      </div>

      {/* Targets editor */}
      {showTargets && (
        <div className="bg-[#111111] border border-rose-500/30 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-medium text-white mb-3">Daily targets</h3>
          <form action={async (fd) => { startTransition(async () => { await saveTargets(fd); setShowTargets(false) }) }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[['Calories (kcal)', 'calories', '1'], ['Protein (g)', 'protein', '0.1'], ['Carbs (g)', 'carbs', '0.1'], ['Fat (g)', 'fat', '0.1']].map(([label, name, step]) => (
                <div key={name}>
                  <label className="block text-xs text-[#6b7280] mb-1">{label}</label>
                  <input name={name} type="number" step={step} defaultValue={(targets as Record<string, number>)[name]} min="0" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={isPending} className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Save</button>
              <button type="button" onClick={() => setShowTargets(false)} className="text-[#6b7280] hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Summary */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5 mb-4">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-3xl font-bold text-white">{Math.round(totals.calories)}</p>
            <p className="text-[#6b7280] text-sm">of {targets.calories} kcal</p>
          </div>
          <p className="text-sm text-[#6b7280]">{Math.max(0, targets.calories - Math.round(totals.calories))} remaining</p>
        </div>
        <MacroBar label="Calories" value={totals.calories} target={targets.calories} color="#f43f5e" unit="kcal" showLabel={false} />
        <div className="grid grid-cols-3 gap-4 mt-5">
          <MacroBar label="Protein" value={totals.protein} target={targets.protein} color="#10b981" unit="g" />
          <MacroBar label="Carbs" value={totals.carbs} target={targets.carbs} color="#f59e0b" unit="g" />
          <MacroBar label="Fat" value={totals.fat} target={targets.fat} color="#ef4444" unit="g" />
        </div>
      </div>

      {/* Add meal */}
      {showAddMeal && (
        <div className="bg-[#111111] border border-rose-500/30 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-medium text-white mb-3">Log a meal</h3>

          {/* AI estimator */}
          <div className="mb-4 p-3 bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg">
            <p className="text-xs text-[#6b7280] mb-2">AI estimate — describe your food and we'll fill in the numbers</p>
            <div className="flex gap-2">
              <input
                value={foodInput}
                onChange={e => setFoodInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && estimateFood()}
                placeholder="e.g. bowl of porridge with honey and banana"
                className="flex-1"
              />
              <button
                type="button"
                onClick={estimateFood}
                disabled={estimating || !foodInput.trim()}
                className="bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-50 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors flex-shrink-0"
              >
                {estimating ? '...' : 'Estimate'}
              </button>
            </div>
            {estimateError && <p className="text-xs text-red-400 mt-2">{estimateError}</p>}
            {estimated && (
              <div className="mt-2 flex gap-3 text-xs text-[#9ca3af] bg-[#6366f1]/10 border border-[#6366f1]/20 rounded-lg px-3 py-2">
                <span className="text-[#6366f1] font-medium">{estimated.name}</span>
                <span>{estimated.calories} kcal</span>
                <span className="text-[#10b981]">P {estimated.protein}g</span>
                <span className="text-[#f59e0b]">C {estimated.carbs}g</span>
                <span className="text-[#ef4444]">F {estimated.fat}g</span>
              </div>
            )}
          </div>

          <form
            action={async (fd) => { startTransition(async () => { await addMeal(fd); setShowAddMeal(false); setEstimated(null) }) }}
            className="space-y-3"
          >
            <input name="name" placeholder="Meal name" required defaultValue={estimated?.name ?? ''} key={estimated?.name} />
            <div className="grid grid-cols-2 gap-3">
              {[['Calories (kcal)', 'calories', '1', estimated?.calories], ['Protein (g)', 'protein', '0.1', estimated?.protein], ['Carbs (g)', 'carbs', '0.1', estimated?.carbs], ['Fat (g)', 'fat', '0.1', estimated?.fat]].map(([label, name, step, val]) => (
                <div key={String(name)}>
                  <label className="block text-xs text-[#6b7280] mb-1">{String(label)}</label>
                  <input name={String(name)} type="number" step={String(step)} placeholder="0" min="0" defaultValue={val ?? ''} key={String(val)} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={isPending} className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">{isPending ? 'Logging...' : 'Log meal'}</button>
              <button type="button" onClick={() => setShowAddMeal(false)} className="text-[#6b7280] hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Meals list */}
      {meals.length === 0 && !showAddMeal ? (
        <div className="text-center py-12">
          <p className="text-[#6b7280] text-sm">No meals logged today.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {meals.map(meal => (
            <div key={meal.id} className="bg-[#111111] border border-[#1f1f1f] rounded-xl px-4 py-3 flex items-center gap-3 group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{meal.name}</p>
                <div className="flex gap-3 mt-0.5">
                  <span className="text-xs text-[#6b7280]">{meal.calories} kcal</span>
                  <span className="text-xs text-[#10b981]">{meal.protein}g P</span>
                  <span className="text-xs text-[#f59e0b]">{meal.carbs}g C</span>
                  <span className="text-xs text-[#ef4444]">{meal.fat}g F</span>
                </div>
              </div>
              <button onClick={() => startTransition(() => deleteMeal(meal.id))} className="opacity-0 group-hover:opacity-100 p-1.5 text-[#4b5563] hover:text-red-400 transition-all rounded">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MacroBar({ label, value, target, color, unit, showLabel = true }: { label: string; value: number; target: number; color: string; unit: string; showLabel?: boolean }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0
  const over = target > 0 && value > target
  return (
    <div>
      {showLabel && (
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-xs text-[#6b7280]">{label}</span>
          <span className="text-xs text-white">{Math.round(value * 10) / 10}<span className="text-[#4b5563]">/{target}{unit}</span></span>
        </div>
      )}
      <div className="h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: over ? '#ef4444' : color }} />
      </div>
      {showLabel && <p className="text-[10px] text-[#4b5563] mt-1">{over ? `${Math.round((value - target) * 10) / 10}${unit} over` : `${Math.round((target - value) * 10) / 10}${unit} left`}</p>}
    </div>
  )
}
