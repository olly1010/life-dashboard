'use client'

import { useState, useTransition, useEffect } from 'react'
import { addSet, deleteSet, startSession, endSession, addExercise, createTemplate, deleteTemplate } from '../actions'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Glutes', 'Core', 'Cardio', 'Full Body']

const EXERCISE_LIBRARY: Record<string, { muscle: string; bodyweight: boolean }> = {
  'Bench Press': { muscle: 'Chest', bodyweight: false },
  'Incline Bench Press': { muscle: 'Chest', bodyweight: false },
  'Push Up': { muscle: 'Chest', bodyweight: true },
  'Dumbbell Fly': { muscle: 'Chest', bodyweight: false },
  'Pull Up': { muscle: 'Back', bodyweight: true },
  'Deadlift': { muscle: 'Back', bodyweight: false },
  'Barbell Row': { muscle: 'Back', bodyweight: false },
  'Lat Pulldown': { muscle: 'Back', bodyweight: false },
  'Overhead Press': { muscle: 'Shoulders', bodyweight: false },
  'Lateral Raise': { muscle: 'Shoulders', bodyweight: false },
  'Barbell Curl': { muscle: 'Biceps', bodyweight: false },
  'Dumbbell Curl': { muscle: 'Biceps', bodyweight: false },
  'Tricep Pushdown': { muscle: 'Triceps', bodyweight: false },
  'Skull Crusher': { muscle: 'Triceps', bodyweight: false },
  'Squat': { muscle: 'Legs', bodyweight: false },
  'Leg Press': { muscle: 'Legs', bodyweight: false },
  'Leg Curl': { muscle: 'Legs', bodyweight: false },
  'Leg Extension': { muscle: 'Legs', bodyweight: false },
  'Lunge': { muscle: 'Legs', bodyweight: false },
  'Hip Thrust': { muscle: 'Glutes', bodyweight: false },
  'Glute Bridge': { muscle: 'Glutes', bodyweight: true },
  'Plank': { muscle: 'Core', bodyweight: true },
  'Crunch': { muscle: 'Core', bodyweight: true },
  'Cable Crunch': { muscle: 'Core', bodyweight: false },
}

type Session = { id: string; name: string; date: string; started_at: string; ended_at: string | null; duration_minutes: number | null }
type WorkoutSet = { id: string; exercise_name: string; muscle_group: string; set_number: number; reps: number | null; weight_kg: number | null; is_bodyweight: boolean }
type Template = { id: string; name: string }
type Exercise = { id: string; name: string; muscle_group: string; is_bodyweight: boolean }

export default function GymClient({ sessions, templates, exercises }: {
  sessions: (Session & { workout_sets: WorkoutSet[] })[]
  templates: Template[]
  exercises: Exercise[]
}) {
  const [view, setView] = useState<'overview' | 'active' | 'history' | 'exercises' | 'templates'>('overview')
  const [activeSession, setActiveSession] = useState<(Session & { workout_sets: WorkoutSet[] }) | null>(null)
  const [isPending, startTransition] = useTransition()
  const [sessionName, setSessionName] = useState('')
  const [elapsed, setElapsed] = useState(0)

  const [addExerciseInput, setAddExerciseInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedExercise, setSelectedExercise] = useState<{ name: string; muscle: string; bodyweight: boolean } | null>(null)
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [showNewExerciseForm, setShowNewExerciseForm] = useState(false)

  useEffect(() => {
    if (!activeSession?.started_at) return
    const start = new Date(activeSession.started_at).getTime()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [activeSession])

  function formatElapsed(secs: number) {
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }

  function handleExerciseInput(val: string) {
    setAddExerciseInput(val)
    if (val.length < 2) { setSuggestions([]); return }
    const matches = Object.keys(EXERCISE_LIBRARY).filter(e => e.toLowerCase().includes(val.toLowerCase()))
    const customMatches = exercises.map(e => e.name).filter(n => n.toLowerCase().includes(val.toLowerCase()))
    setSuggestions([...new Set([...matches, ...customMatches])].slice(0, 6))
  }

  function selectExercise(name: string) {
    const lib = EXERCISE_LIBRARY[name]
    if (lib) {
      setSelectedExercise({ name, muscle: lib.muscle, bodyweight: lib.bodyweight })
    } else {
      const custom = exercises.find(e => e.name === name)
      if (custom) setSelectedExercise({ name: custom.name, muscle: custom.muscle_group, bodyweight: custom.is_bodyweight })
    }
    setAddExerciseInput(name)
    setSuggestions([])
  }

  function handleAddSet() {
    if (!activeSession || !selectedExercise || !reps) return
    startTransition(async () => {
      await addSet(
        activeSession.id,
        selectedExercise.name,
        selectedExercise.muscle,
        parseInt(reps),
        weight ? parseFloat(weight) : null,
        selectedExercise.bodyweight,
      )
      setReps('')
    })
  }

  function handleEndSession() {
    if (!activeSession) return
    const durationMins = Math.round(elapsed / 60)
    startTransition(async () => {
      await endSession(activeSession.id, durationMins)
      setActiveSession(null)
      setView('history')
    })
  }

  function handleStartSession(templateId: string | null, name: string) {
    startTransition(async () => {
      const session = await startSession(templateId, name || 'Workout')
      setActiveSession({ ...session, workout_sets: [] })
      setView('active')
      setElapsed(0)
    })
  }

  const groupedSets = (activeSession?.workout_sets ?? []).reduce((acc, s) => {
    if (!acc[s.exercise_name]) acc[s.exercise_name] = { muscle: s.muscle_group, sets: [] }
    acc[s.exercise_name].sets.push(s)
    return acc
  }, {} as Record<string, { muscle: string; sets: WorkoutSet[] }>)

  const muscleColor: Record<string, string> = {
    Chest: '#f97316', Back: '#3b82f6', Shoulders: '#8b5cf6', Biceps: '#ec4899',
    Triceps: '#f43f5e', Legs: '#14b8a6', Glutes: '#a855f7', Core: '#f59e0b',
    Cardio: '#22c55e', 'Full Body': '#6366f1'
  }

  if (view === 'active' && activeSession) {
    return (
      <div className="space-y-4">
        {/* Active session header */}
        <div className="bg-gradient-to-r from-[#f97316]/10 to-[#111111] border border-[#f97316]/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-2 h-2 rounded-full bg-[#f97316] animate-pulse" />
                <span className="text-xs text-[#f97316] font-medium">Active</span>
              </div>
              <p className="text-white font-semibold">{activeSession.name}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-white">{formatElapsed(elapsed)}</p>
              <button onClick={handleEndSession} disabled={isPending}
                className="mt-1 text-xs bg-[#f97316] hover:bg-[#ea580c] text-white px-3 py-1.5 rounded-lg transition-colors">
                Finish workout
              </button>
            </div>
          </div>
        </div>

        {/* Add exercise */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-sm font-medium text-white flex-1">Log a set</p>
          </div>
          <div className="relative mb-3">
            <input value={addExerciseInput} onChange={e => handleExerciseInput(e.target.value)} placeholder="Search exercise..." autoComplete="off" />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg mt-1 z-10 overflow-hidden shadow-xl">
                {suggestions.map(s => (
                  <button key={s} onClick={() => selectExercise(s)} className="w-full text-left px-3 py-2 text-sm text-[#d1d5db] hover:bg-[#2a2a2a] hover:text-white transition-colors flex items-center justify-between">
                    {s}
                    {(EXERCISE_LIBRARY[s] || exercises.find(e => e.name === s)) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: (muscleColor[(EXERCISE_LIBRARY[s]?.muscle ?? exercises.find(e => e.name === s)?.muscle_group ?? '')] ?? '#6b7280') + '20', color: muscleColor[(EXERCISE_LIBRARY[s]?.muscle ?? exercises.find(e => e.name === s)?.muscle_group ?? '')] ?? '#6b7280' }}>
                        {EXERCISE_LIBRARY[s]?.muscle ?? exercises.find(e => e.name === s)?.muscle_group}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedExercise && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: (muscleColor[selectedExercise.muscle] ?? '#6b7280') + '20', color: muscleColor[selectedExercise.muscle] ?? '#6b7280' }}>
                {selectedExercise.muscle}
              </span>
              {selectedExercise.bodyweight && <span className="text-xs text-[#6b7280] bg-[#1a1a1a] px-2 py-0.5 rounded-full">Bodyweight</span>}
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-[#6b7280] mb-1">Reps</label>
              <input type="number" value={reps} onChange={e => setReps(e.target.value)} placeholder="10" min="1" />
            </div>
            {selectedExercise && !selectedExercise.bodyweight && (
              <div className="flex-1">
                <label className="block text-xs text-[#6b7280] mb-1">Weight (kg)</label>
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="60" step="0.5" min="0" />
              </div>
            )}
            <div className="flex items-end">
              <button onClick={handleAddSet} disabled={!selectedExercise || !reps || isPending}
                className="bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                + Set
              </button>
            </div>
          </div>
        </div>

        {/* Sets logged */}
        {Object.entries(groupedSets).length > 0 && (
          <div className="space-y-2">
            {Object.entries(groupedSets).map(([exName, data]) => (
              <div key={exName} className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-white">{exName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: (muscleColor[data.muscle] ?? '#6b7280') + '20', color: muscleColor[data.muscle] ?? '#6b7280' }}>{data.muscle}</span>
                </div>
                <div className="space-y-1">
                  {data.sets.map(s => (
                    <div key={s.id} className="flex items-center gap-3 text-sm group">
                      <span className="text-[#4b5563] w-6">#{s.set_number}</span>
                      <span className="text-white">{s.reps} reps</span>
                      {s.weight_kg && <span className="text-[#9ca3af]">@ {s.weight_kg}kg</span>}
                      {s.is_bodyweight && !s.weight_kg && <span className="text-[#6b7280]">bodyweight</span>}
                      <button onClick={() => startTransition(() => deleteSet(s.id))} className="ml-auto opacity-0 group-hover:opacity-100 text-[#4b5563] hover:text-red-400 transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1.5 mb-5">
        {(['overview', 'history', 'templates', 'exercises'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${view === v ? 'bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/30' : 'text-[#6b7280] bg-[#111111] border border-[#1f1f1f] hover:text-white'}`}>
            {v}
          </button>
        ))}
      </div>

      {view === 'overview' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-[#f97316]/10 via-[#111111] to-[#111111] border border-[#f97316]/20 rounded-xl p-5 text-center">
            <p className="text-[#9ca3af] text-sm mb-3">Ready to train?</p>
            <div className="flex gap-2 justify-center mb-4">
              <input value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="Session name (optional)" className="max-w-xs" />
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={() => handleStartSession(null, sessionName)} disabled={isPending}
                className="bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl transition-colors">
                Start blank workout
              </button>
              {templates.map(t => (
                <button key={t.id} onClick={() => handleStartSession(t.id, t.name)} disabled={isPending}
                  className="bg-[#111111] hover:bg-[#1a1a1a] border border-[#f97316]/20 text-[#f97316] text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Recent stats */}
          {sessions.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">{sessions.length}</p>
                <p className="text-xs text-[#6b7280] mt-0.5">Total sessions</p>
              </div>
              <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">
                  {sessions.filter(s => s.date === new Date().toISOString().split('T')[0]).length > 0 ? '✓' : '0'}
                </p>
                <p className="text-xs text-[#6b7280] mt-0.5">Today</p>
              </div>
              <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">
                  {Math.round((sessions.reduce((a, s) => a + (s.duration_minutes ?? 0), 0)) / Math.max(sessions.length, 1))}m
                </p>
                <p className="text-xs text-[#6b7280] mt-0.5">Avg duration</p>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'history' && (
        <div className="space-y-2">
          {sessions.length === 0 && <p className="text-center text-[#4b5563] text-sm py-8">No workouts yet.</p>}
          {sessions.map(s => (
            <div key={s.id} className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{s.name}</p>
                  <p className="text-xs text-[#6b7280] mt-0.5">{s.date} · {s.duration_minutes ? `${s.duration_minutes}min` : 'No duration'}</p>
                </div>
                <p className="text-xs text-[#4b5563]">{s.workout_sets.length} sets</p>
              </div>
              {s.workout_sets.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[...new Set(s.workout_sets.map(ws => ws.exercise_name))].map(ex => (
                    <span key={ex} className="text-[10px] bg-[#1a1a1a] text-[#9ca3af] px-2 py-0.5 rounded-full">{ex}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {view === 'templates' && (
        <div className="space-y-3">
          <form action={async (fd) => { startTransition(async () => { await createTemplate(fd) }) }} className="flex gap-2">
            <input name="name" placeholder="Template name" required className="flex-1" />
            <button type="submit" disabled={isPending} className="bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Create</button>
          </form>
          {templates.map(t => (
            <div key={t.id} className="bg-[#111111] border border-[#1f1f1f] rounded-xl px-4 py-3 flex items-center justify-between group">
              <p className="text-sm text-white">{t.name}</p>
              <button onClick={() => startTransition(() => deleteTemplate(t.id))} className="opacity-0 group-hover:opacity-100 text-[#4b5563] hover:text-red-400 transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {view === 'exercises' && (
        <div className="space-y-3">
          <button onClick={() => setShowNewExerciseForm(!showNewExerciseForm)}
            className="flex items-center gap-1.5 bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add custom exercise
          </button>
          {showNewExerciseForm && (
            <form action={async (fd) => { startTransition(async () => { await addExercise(fd); setShowNewExerciseForm(false) }) }} className="bg-[#111111] border border-[#f97316]/30 rounded-xl p-4 space-y-3">
              <input name="name" placeholder="Exercise name" required />
              <select name="muscle_group">
                {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm text-[#9ca3af] cursor-pointer">
                <input type="checkbox" name="is_bodyweight" value="true" className="w-4 h-4" />
                Bodyweight (no weight needed)
              </label>
              <button type="submit" disabled={isPending} className="bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Save</button>
            </form>
          )}
          <div className="grid grid-cols-2 gap-2">
            {[...Object.entries(EXERCISE_LIBRARY).map(([name, data]) => ({ name, muscle: data.muscle, isCustom: false })),
              ...exercises.map(e => ({ name: e.name, muscle: e.muscle_group, isCustom: true }))
            ].map(ex => (
              <div key={ex.name} className="bg-[#111111] border border-[#1f1f1f] rounded-lg px-3 py-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white">{ex.name}</p>
                  <p className="text-[10px]" style={{ color: muscleColor[ex.muscle] ?? '#6b7280' }}>{ex.muscle}</p>
                </div>
                {ex.isCustom && <span className="text-[10px] text-[#4b5563]">custom</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
