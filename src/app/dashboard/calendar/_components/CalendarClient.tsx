'use client'

import { useState, useTransition } from 'react'
import { saveSixthformSlot, deleteSixthformSlot, addTask, deleteTask } from '../actions'

type SixthformSlot = { id: string; day_of_week: number; start_time: string; end_time: string; subject: string; type: string }
type Task = { id: string; title: string; duration_minutes: number; category: string; priority: number; date: string | null; start_time: string | null; end_time: string | null; ai_scheduled: boolean }
type SleepData = { duration_hours: number | null; quality: number | null } | null
type StimulantData = { caffeine_mg: number; logged_time: string }

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const CAT_COLORS: Record<string, string> = {
  education: '#3b82f6', revision: '#6366f1', fitness: '#f97316',
  work: '#22c55e', personal: '#a855f7', rest: '#6b7280', sixthform: '#0ea5e9',
}
const SLOT_COLORS: Record<string, string> = {
  lesson: '#0ea5e9', free: '#6366f1', break: '#6b7280', lunch: '#f59e0b',
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 7am–9pm
const SLOT_TYPES = [
  { value: 'lesson', label: 'Lesson' },
  { value: 'free', label: 'Free period' },
  { value: 'break', label: 'Break' },
  { value: 'lunch', label: 'Lunch' },
]

function timeToFrac(time: string, startHour = 7) {
  const [h, m] = time.split(':').map(Number)
  return (h + m / 60 - startHour) / 15
}

export default function CalendarClient({ sixthform, tasks, sleepData, todayStimulants }: {
  sixthform: SixthformSlot[]
  tasks: Task[]
  sleepData: SleepData
  todayStimulants: StimulantData[]
}) {
  const [view, setView] = useState<'schedule' | 'timetable'>('schedule')
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay()
    return d === 0 ? 7 : d
  })
  const [showAddTask, setShowAddTask] = useState(false)
  const [showAddSlot, setShowAddSlot] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [scheduledEvents, setScheduledEvents] = useState<Array<{ title: string; start_time: string; end_time: string; category: string; is_break: boolean }>>([])
  const [manualMode, setManualMode] = useState(false)
  const [isPending, startTransition] = useTransition()

  const todayDate = new Date().toISOString().split('T')[0]
  const todaySixthform = sixthform.filter(s => s.day_of_week === selectedDay)
  const unscheduledTasks = tasks.filter(t => !t.date && !t.ai_scheduled)
  const todayCaffeine = todayStimulants.reduce((a, s) => a + s.caffeine_mg, 0)

  async function runAISchedule() {
    if (unscheduledTasks.length === 0) return
    setScheduling(true)
    try {
      const peakWindow = sleepData?.quality && sleepData.quality >= 4 ? '9am–12pm' : '10am–1pm'
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: unscheduledTasks.map(t => ({
            title: t.title, duration: t.duration_minutes,
            priority: t.priority === 3 ? 'high' : t.priority === 2 ? 'medium' : 'low',
            category: t.category,
          })),
          date: todayDate,
          energyData: { peakWindow, caffeine: todayCaffeine, sleepHours: sleepData?.duration_hours ?? null, quality: sleepData?.quality ?? null },
        }),
      })
      const data = await res.json()
      setScheduledEvents(data.schedule ?? [])
    } catch { alert('Scheduling failed. Try again.') }
    finally { setScheduling(false) }
  }

  const now = new Date()
  const nowFrac = ((now.getHours() + now.getMinutes() / 60 - 7) / 15) * 100

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Calendar</h1>
          <p className="text-[#9ca3af] text-sm mt-0.5">{unscheduledTasks.length} tasks to schedule</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setView(view === 'schedule' ? 'timetable' : 'schedule')}
            className="text-[#9ca3af] hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            {view === 'schedule' ? 'Edit timetable' : '← Schedule'}
          </button>
          {view === 'schedule' && (
            <>
              <button onClick={() => setManualMode(!manualMode)}
                className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors border ${manualMode ? 'text-teal-400 border-teal-400/30 bg-teal-400/10' : 'text-[#9ca3af] border-[#2a2a2a] hover:text-white'}`}>
                {manualMode ? 'Manual on' : 'AI mode'}
              </button>
              {!manualMode && (
                <button onClick={runAISchedule} disabled={scheduling || unscheduledTasks.length === 0}
                  className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
                  {scheduling ? 'Scheduling…' : '⚡ Auto-schedule'}
                </button>
              )}
              <button onClick={() => setShowAddTask(true)}
                className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
                + Add task
              </button>
            </>
          )}
          {view === 'timetable' && (
            <button onClick={() => setShowAddSlot(!showAddSlot)}
              className="flex items-center gap-1.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              + Add slot
            </button>
          )}
        </div>
      </div>

      {/* Add task form */}
      {showAddTask && (
        <div className="bg-[#111111] border border-teal-500/30 rounded-xl p-4 mb-5">
          <form action={async (fd) => { startTransition(async () => { await addTask(fd); setShowAddTask(false) }) }} className="space-y-3">
            <input name="title" placeholder="Task name" required autoFocus />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1">Duration (min)</label>
                <input name="duration_minutes" type="number" defaultValue={60} min="15" step="15" />
              </div>
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1">Category</label>
                <select name="category">
                  <option value="revision">Revision</option>
                  <option value="education">Education</option>
                  <option value="fitness">Fitness</option>
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="rest">Rest</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1">Priority</label>
                <select name="priority">
                  <option value="3">High</option>
                  <option value="2">Medium</option>
                  <option value="1">Low</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={isPending} className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">Add</button>
              <button type="button" onClick={() => setShowAddTask(false)} className="text-[#9ca3af] hover:text-white text-sm px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════════ TIMETABLE VIEW ═══════════════════════ */}
      {view === 'timetable' && (
        <div>
          {showAddSlot && (
            <div className="bg-[#111111] border border-[#0ea5e9]/30 rounded-xl p-4 mb-4">
              <form action={async (fd) => { startTransition(async () => { await saveSixthformSlot(fd); setShowAddSlot(false) }) }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#9ca3af] mb-1">Day</label>
                    <select name="day_of_week">
                      {DAYS_FULL.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#9ca3af] mb-1">Type</label>
                    <select name="type">
                      {SLOT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#9ca3af] mb-1">Start</label>
                    <input name="start_time" type="time" required />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9ca3af] mb-1">End</label>
                    <input name="end_time" type="time" required />
                  </div>
                </div>
                <input name="subject" placeholder="Subject / label (e.g. Maths, Lunch)" required />
                <div className="flex gap-2">
                  <button type="submit" disabled={isPending} className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm font-medium px-4 py-2 rounded-lg">Save</button>
                  <button type="button" onClick={() => setShowAddSlot(false)} className="text-[#9ca3af] hover:text-white text-sm px-4 py-2 rounded-lg">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Week grid */}
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl overflow-hidden">
            {/* Day headers */}
            <div className="grid border-b border-[#1f1f1f]" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
              <div className="p-2" />
              {DAYS.map((d, i) => (
                <div key={d} className="py-2 text-center border-l border-[#1a1a1a]">
                  <p className="text-xs font-semibold text-[#9ca3af]">{d}</p>
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="relative overflow-y-auto" style={{ maxHeight: 520 }}>
              <div className="grid" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
                {/* Time labels column */}
                <div className="relative">
                  {HOURS.map(h => (
                    <div key={h} className="flex items-start justify-end pr-2" style={{ height: 52 }}>
                      <span className="text-[10px] text-[#4b5563] -translate-y-2">{h}:00</span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {DAYS.map((_, dayIdx) => {
                  const dayNum = dayIdx + 1
                  const daySlots = sixthform.filter(s => s.day_of_week === dayNum)
                  const totalH = HOURS.length * 52
                  return (
                    <div key={dayIdx} className="relative border-l border-[#1a1a1a]" style={{ height: totalH }}>
                      {/* Hour lines */}
                      {HOURS.map((_, hi) => (
                        <div key={hi} className="absolute w-full border-t border-[#161616]" style={{ top: hi * 52 }} />
                      ))}
                      {/* Slots */}
                      {daySlots.map(slot => {
                        const [sh, sm] = slot.start_time.split(':').map(Number)
                        const [eh, em] = slot.end_time.split(':').map(Number)
                        const top = ((sh + sm / 60 - 7) / 15) * totalH
                        const height = Math.max(20, (((eh + em / 60) - (sh + sm / 60)) / 15) * totalH)
                        const color = SLOT_COLORS[slot.type] ?? '#6b7280'
                        return (
                          <div
                            key={slot.id}
                            className="absolute inset-x-0.5 rounded-md overflow-hidden group cursor-default"
                            style={{ top, height, backgroundColor: color + '22', borderLeft: `3px solid ${color}` }}
                          >
                            <div className="px-1.5 pt-1">
                              <p className="text-[10px] font-semibold leading-tight" style={{ color }}>{slot.subject}</p>
                              <p className="text-[9px] text-[#6b7280] leading-tight capitalize">{slot.type}</p>
                            </div>
                            <button
                              onClick={() => startTransition(() => deleteSixthformSlot(slot.id))}
                              className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity text-xs leading-none"
                            >×</button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3 flex-wrap">
            {SLOT_TYPES.map(t => (
              <div key={t.value} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SLOT_COLORS[t.value] }} />
                <span className="text-xs text-[#6b7280]">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════ SCHEDULE VIEW ═══════════════════════ */}
      {view === 'schedule' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Tasks sidebar */}
          <div className="lg:col-span-2 bg-[#111111] border border-[#1f1f1f] rounded-xl p-3">
            <p className="text-xs font-semibold text-[#9ca3af] mb-2">Tasks to schedule</p>
            {unscheduledTasks.length === 0 ? (
              <p className="text-xs text-[#4b5563] py-2">All tasks scheduled.</p>
            ) : (
              <div className="space-y-1.5">
                {unscheduledTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 p-2 bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg group">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[t.category] ?? '#6b7280' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{t.title}</p>
                      <p className="text-[10px] text-[#6b7280]">{t.duration_minutes}min · {t.category}</p>
                    </div>
                    <button onClick={() => startTransition(() => deleteTask(t.id))} className="opacity-0 group-hover:opacity-100 text-[#4b5563] hover:text-red-400 transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Day timeline */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            {/* Day selector */}
            <div className="flex gap-1">
              {DAYS.map((day, i) => (
                <button key={day} onClick={() => setSelectedDay(i + 1)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedDay === i + 1 ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-[#6b7280] bg-[#111111] border border-[#1f1f1f] hover:text-white'}`}>
                  {day}
                </button>
              ))}
            </div>

            {/* Timeline */}
            <div className="relative bg-[#111111] border border-[#1f1f1f] rounded-xl overflow-hidden" style={{ height: 580 }}>
              {HOURS.map((h, hi) => (
                <div key={h} className="absolute w-full flex items-start" style={{ top: `${(hi / HOURS.length) * 100}%` }}>
                  <span className="text-[9px] text-[#4b5563] w-10 text-right pr-2 flex-shrink-0 -translate-y-2">{h}:00</span>
                  <div className="flex-1 border-t border-[#1a1a1a]" />
                </div>
              ))}

              {/* Sixth form blocks */}
              {todaySixthform.map(slot => {
                const [sh, sm] = slot.start_time.split(':').map(Number)
                const [eh, em] = slot.end_time.split(':').map(Number)
                const top = ((sh + sm / 60 - 7) / 15) * 100
                const height = Math.max(2, (((eh + em / 60) - (sh + sm / 60)) / 15) * 100)
                const color = SLOT_COLORS[slot.type] ?? '#0ea5e9'
                return (
                  <div key={slot.id} className="absolute left-10 right-2 rounded-lg overflow-hidden flex items-center px-2.5"
                    style={{ top: `${top}%`, height: `${height}%`, minHeight: 24, backgroundColor: color + '22', borderLeft: `3px solid ${color}` }}>
                    <div>
                      <p className="text-[11px] font-semibold text-white truncate">{slot.subject}</p>
                      <p className="text-[9px] capitalize" style={{ color }}>{slot.type} · FIXED</p>
                    </div>
                  </div>
                )
              })}

              {/* AI scheduled */}
              {scheduledEvents.map((event, i) => {
                const top = timeToFrac(event.start_time) * 100
                const bottom = timeToFrac(event.end_time) * 100
                const height = Math.max(2, bottom - top)
                const color = event.is_break ? '#6b7280' : (CAT_COLORS[event.category] ?? '#6366f1')
                return (
                  <div key={i} className="absolute left-10 right-2 rounded-lg flex items-center px-2.5 overflow-hidden"
                    style={{ top: `${top}%`, height: `${height}%`, minHeight: 24, backgroundColor: color + '18', borderLeft: `3px solid ${color}` }}>
                    <p className="text-[11px] text-white truncate">{event.title}</p>
                  </div>
                )
              })}

              {/* Now indicator */}
              {nowFrac >= 0 && nowFrac <= 100 && (
                <div className="absolute left-0 right-0 flex items-center pointer-events-none" style={{ top: `${nowFrac}%` }}>
                  <div className="w-2 h-2 rounded-full bg-red-500 ml-8 flex-shrink-0" />
                  <div className="flex-1 border-t border-red-500/40" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
