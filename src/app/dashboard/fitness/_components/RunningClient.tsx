'use client'

import { useState, useTransition } from 'react'
import { logRun, deleteRun } from '../actions'

type Run = {
  id: string; date: string; distance_km: number | null; duration_minutes: number | null
  avg_pace_min_per_km: number | null; avg_heart_rate: number | null; calories: number | null
  notes: string | null; source: string
}

function formatPace(pace: number | null) {
  if (!pace) return '—'
  const min = Math.floor(pace)
  const sec = Math.round((pace - min) * 60)
  return `${min}:${String(sec).padStart(2, '0')}/km`
}

function formatDuration(mins: number | null) {
  if (!mins) return '—'
  const h = Math.floor(mins / 60), m = Math.floor(mins % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function RunningClient({ runs }: { runs: Run[] }) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const totalKm = runs.reduce((a, r) => a + (r.distance_km ?? 0), 0)
  const thisWeekRuns = runs.filter(r => {
    const diff = (Date.now() - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  })
  const weekKm = thisWeekRuns.reduce((a, r) => a + (r.distance_km ?? 0), 0)
  const avgPace = runs.filter(r => r.avg_pace_min_per_km).reduce((a, r, _, arr) => a + (r.avg_pace_min_per_km ?? 0) / arr.length, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-[#6b7280]">{runs.length} runs logged</p>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Log run
        </button>
      </div>

      {/* Stats */}
      {runs.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-white">{weekKm.toFixed(1)}<span className="text-sm text-[#6b7280] ml-1">km</span></p>
            <p className="text-xs text-[#6b7280] mt-0.5">This week</p>
          </div>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-white">{totalKm.toFixed(1)}<span className="text-sm text-[#6b7280] ml-1">km</span></p>
            <p className="text-xs text-[#6b7280] mt-0.5">Total</p>
          </div>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-white">{formatPace(avgPace || null)}</p>
            <p className="text-xs text-[#6b7280] mt-0.5">Avg pace</p>
          </div>
        </div>
      )}

      {/* Log form */}
      {showForm && (
        <div className="bg-[#111111] border border-[#22c55e]/30 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-medium text-white mb-3">Log a run</h3>
          <form action={async (fd) => { startTransition(async () => { await logRun(fd); setShowForm(false) }) }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#6b7280] mb-1">Date</label>
                <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div>
                <label className="block text-xs text-[#6b7280] mb-1">Distance (km)</label>
                <input name="distance_km" type="number" step="0.01" placeholder="5.0" min="0" />
              </div>
              <div>
                <label className="block text-xs text-[#6b7280] mb-1">Duration (min)</label>
                <input name="duration_minutes" type="number" step="0.1" placeholder="30" min="0" />
              </div>
              <div>
                <label className="block text-xs text-[#6b7280] mb-1">Avg HR (bpm)</label>
                <input name="avg_heart_rate" type="number" placeholder="155" min="0" />
              </div>
              <div>
                <label className="block text-xs text-[#6b7280] mb-1">Calories</label>
                <input name="calories" type="number" placeholder="300" min="0" />
              </div>
            </div>
            <textarea name="notes" placeholder="Notes (optional)" rows={2} style={{ resize: 'none' }} />
            <div className="flex gap-2">
              <button type="submit" disabled={isPending} className="bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="text-[#6b7280] hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Runs list */}
      {runs.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <p className="text-[#4b5563] text-sm">No runs yet. Log your first one above.</p>
          <p className="text-[#3a3a3a] text-xs mt-1">Runs from Apple Watch sync automatically via Health Auto Export.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map(run => (
            <div key={run.id} className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4 group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#22c55e]/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {run.distance_km ? `${run.distance_km}km` : 'Run'} · {formatDuration(run.duration_minutes)}
                    </p>
                    <p className="text-xs text-[#6b7280]">{run.date} · {run.source === 'health_auto_export' ? '⌚ Watch' : 'Manual'}</p>
                  </div>
                </div>
                <button onClick={() => startTransition(() => deleteRun(run.id))} className="opacity-0 group-hover:opacity-100 p-1 text-[#4b5563] hover:text-red-400 transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
              <div className="flex gap-4 mt-2">
                {run.avg_pace_min_per_km && <span className="text-xs text-[#9ca3af]">Pace {formatPace(run.avg_pace_min_per_km)}</span>}
                {run.avg_heart_rate && <span className="text-xs text-red-400">♥ {Math.round(run.avg_heart_rate)} bpm</span>}
                {run.calories && <span className="text-xs text-[#f59e0b]">{run.calories} kcal</span>}
              </div>
              {run.notes && <p className="text-xs text-[#6b7280] mt-1">{run.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
