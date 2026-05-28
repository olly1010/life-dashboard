'use client'

import { useState, useTransition } from 'react'
import { saveSixthformSlot, deleteSixthformSlot, addTask, deleteTask } from '../actions'

type SixthformSlot = { id: string; day_of_week: number; start_time: string; end_time: string; subject: string; type: string }
type Task = { id: string; title: string; duration_minutes: number; category: string; priority: number; date: string | null; start_time: string | null; end_time: string | null; ai_scheduled: boolean }
type SleepData = { duration_hours: number | null; quality: number | null } | null
type StimulantData = { caffeine_mg: number; logged_time: string } | null

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const CAT_COLORS: Record<string, string> = {
  education: '#3b82f6', revision: '#6366f1', fitness: '#f97316',
  work: '#22c55e', personal: '#a855f7', rest: '#6b7280', sixthform: '#0ea5e9',
}
const SLOT_TYPES = [
  { value: 'lesson', label: 'Lesson' },
  { value: 'free', label: 'Free period' },
  { value: 'break', label: 'Break' },
  { value: 'lunch', label: 'Lunch' },
]

export default function CalendarClient({ sixthform, tasks, sleepData, todayStimulants }: {
  sixthform: SixthformSlot[]
  tasks: Task[]
  sleepData: SleepData
  todayStimulants: StimulantData[]
}) {
  const [view, setView] = useState<'schedule' | 'timetable'>('schedule')
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay()
    return d === 0 ? 1 : d === 6 ? 5 : d
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
            title: t.title,
            duration: t.duration_minutes,
            priority: t.priority === 3 ? 'high' : t.priority === 2 ? 'medium' : 'low',
            category: t.category,
          })),
          date: todayDate,
          energyData: {
            peakWindow,
            caffeine: todayCaffeine,
            sleepHours: sleepData?.duration_hours ?? null,
            quality: sleepData?.quality ?? null,
          },
        }),
      })
      const data = await res.json()
      setScheduledEvents(data.schedule ?? [])
    } catch {
      alert('Scheduling failed. Try again.')
    } finally {
      setScheduling(false)
    }
  }

  function slotColor(type: string) {
    const map: Record<string, string> = { lesson: '#0ea5e9', free: '#6366f1', break: '#6b7280', lunch: '#f59e0b' }
    return map[type] ?? '#6b7280'
  }

  const hours = Array.from({ length: 16 }, (_, i) => i + 7)

  function timeToFrac(time: string) {
    const [h, m] = time.split(':').map(Number)
    return (h - 7 + m / 60) / 16
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-white">Calendar</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{unscheduledTasks.length} tasks to schedule</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView(view === 'schedule' ? 'timetable' : 'schedule')} className="text-[#6b7280] hover:text-white border border-[#2a2a2a] text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            {view === 'schedule' ? 'Edit timetable' : 'View schedule'}
          </button>
          {view === 'schedule' && (
            <>
              <button onClick={() => setManualMode(!manualMode)} className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors border ${manualMode ? 'text-teal-400 border-teal-400/30 bg-teal-400/10' : 'text-[#6b7280] border-[#2a2a2a]'}`}>
                {manualMode ? 'Manual' : 'AI mode'}
              </button>
              {!manualMode && (
                <button onClick={runAISchedule} disabled={scheduling || unscheduledTasks.length === 0} className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
                  {scheduling ? 'Scheduling...' : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Auto-schedule
                    </>
                  )}
                </button>
              )}
              <button onClick={() => setShowAddTask(true)} className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add task
              </button>
            </>
          )}
        </div>
      </div>

      {/* Day selector */}
      {view === 'schedule' && (
        <div className="flex gap-1.5 mb-5">
          {DAYS.map((day, i) => (
            <button key={day} onClick={() => setSelectedDay(i + 1)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${selectedDay === i + 1 ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-[#6b7280] bg-[#111111] border border-[#1f1f1f] hover:text-white'}`}>
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      )}

      {/* Add task form */}
      {showAddTask && (
        <div className="bg-[#111111] border border-teal-500/30 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-medium text-white mb-3">Add task</h3>
          <form action={async (fd) => { startTransition(async () => { await addTask(fd); setShowAddTask(false) }) }} className="space-y-3">
            <input name="title" placeholder="Task name" required autoFocus />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#6b7280] mb-1">Duration (min)</label>
                <input name="duration_minutes" type="number" defaultValue={60} min="15" step="15" />
              </div>
              <div>
                <label className="block text-xs text-[#6b7280] mb-1">Category</label>
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
                <label className="block text-xs text-[#6b7280] mb-1">Priority</label>
                <select name="priority">
                  <option value="3">High</option>
                  <option value="2">Medium</option>
                  <option value="1">Low</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={isPending} className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Add</button>
              <button type="button" onClick={() => setShowAddTask(false)} className="text-[#6b7280] hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Timetable editor */}
      {view === 'timetable' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-[#6b7280]">Set your fixed sixth form timetable. These blocks can never be moved by the AI.</p>
            <button onClick={() => setShowAddSlot(!showAddSlot)} className="flex items-center gap-1.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add slot
            </button>
          </div>

          {showAddSlot && (
            <div className="bg-[#111111] border border-[#0ea5e9]/30 rounded-xl p-4 mb-4">
              <form action={async (fd) => { startTransition(async () => { await saveSixthformSlot(fd); setShowAddSlot(false) }) }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#6b7280] mb-1">Day</label>
                    <select name="day_of_week">
                      {DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#6b7280] mb-1">Type</label>
                    <select name="type">
                      {SLOT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#6b7280] mb-1">Start time</label>
                    <input name="start_time" type="time" required />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6b7280] mb-1">End time</label>
                    <input name="end_time" type="time" required />
                  </div>
                </div>
                <input name="subject" placeholder="Subject / label (e.g. Maths, Lunch, Break)" required />
                <div className="flex gap-2">
                  <button type="submit" disabled={isPending} className="bg-[#0ea5e9] hover:bg-[#0284c7] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Save</button>
                  <button type="button" onClick={() => setShowAddSlot(false)} className="text-[#6b7280] hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Timetable grid */}
          <div className="overflow-x-auto">
            <div className="grid grid-cols-6 gap-1 min-w-[600px]">
              <div className="text-xs text-[#4b5563] p-2" />
              {DAYS.map(d => <div key={d} className="text-xs font-medium text-[#9ca3af] p-2 text-center">{d}</div>)}
              {hours.map(h => (
                <>
                  <div key={`h${h}`} className="text-xs text-[#4b5563] p-2 text-right">{h}:00</div>
                  {DAYS.map((_, i) => {
                    const slot = sixthform.find(s => s.day_of_week === i + 1 && parseInt(s.start_time) === h)
                    return (
                      <div key={`${h}-${i}`} className="relative h-8 bg-[#111111] border border-[#1a1a1a] rounded">
                        {slot && (
                          <div
                            className="absolute inset-0.5 rounded flex items-center justify-between px-1.5 group"
                            style={{ backgroundColor: slotColor(slot.type) + '33', borderLeft: `2px solid ${slotColor(slot.type)}` }}
                          >
                            <span className="text-[10px] text-white truncate">{slot.subject}</span>
                            <button onClick={() => startTransition(() => deleteSixthformSlot(slot.id))} className="opacity-0 group-hover:opacity-100 text-red-400 text-xs leading-none">×</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Schedule view */}
      {view === 'schedule' && (
        <div className="grid grid-cols-5 gap-4">
          {/* Unscheduled tasks sidebar */}
          <div className="col-span-2 bg-[#111111] border border-[#1f1f1f] rounded-xl p-3">
            <p className="text-xs font-medium text-[#6b7280] mb-2">Tasks to schedule</p>
            {unscheduledTasks.length === 0 ? (
              <p className="text-xs text-[#4b5563]">All tasks scheduled.</p>
            ) : (
              <div className="space-y-1.5">
                {unscheduledTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 p-2 bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg group">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[t.category] ?? '#6b7280' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{t.title}</p>
                      <p className="text-[10px] text-[#4b5563]">{t.duration_minutes}min · {t.category}</p>
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
          <div className="col-span-3">
            <div className="relative bg-[#111111] border border-[#1f1f1f] rounded-xl overflow-hidden" style={{ height: 640 }}>
              {/* Hour lines */}
              {hours.map(h => (
                <div key={h} className="absolute w-full flex items-center" style={{ top: `${((h - 7) / 16) * 100}%` }}>
                  <span className="text-[9px] text-[#3a3a3a] pl-1.5 w-8 flex-shrink-0">{h}:00</span>
                  <div className="flex-1 border-t border-[#1a1a1a]" />
                </div>
              ))}

              {/* Sixth form blocks */}
              {todaySixthform.map(slot => {
                const top = timeToFrac(slot.start_time) * 100
                const bottom = timeToFrac(slot.end_time) * 100
                const height = bottom - top
                return (
                  <div key={slot.id} className="absolute left-10 right-2 rounded-lg flex items-center px-2.5 overflow-hidden" style={{
                    top: `${top}%`, height: `${height}%`, minHeight: 20,
                    backgroundColor: slotColor(slot.type) + '25',
                    borderLeft: `3px solid ${slotColor(slot.type)}`,
                  }}>
                    <div>
                      <p className="text-[11px] font-medium text-white truncate">{slot.subject}</p>
                      <p className="text-[9px]" style={{ color: slotColor(slot.type) }}>{slot.type} · FIXED</p>
                    </div>
                  </div>
                )
              })}

              {/* AI scheduled events */}
              {scheduledEvents.map((event, i) => {
                const top = timeToFrac(event.start_time) * 100
                const bottom = timeToFrac(event.end_time) * 100
                const height = bottom - top
                const color = event.is_break ? '#6b7280' : (CAT_COLORS[event.category] ?? '#6366f1')
                return (
                  <div key={i} className="absolute left-10 right-2 rounded-lg flex items-center px-2.5 overflow-hidden" style={{
                    top: `${top}%`, height: `${height}%`, minHeight: 20,
                    backgroundColor: color + '20',
                    borderLeft: `3px solid ${color}`,
                  }}>
                    <p className="text-[11px] text-white truncate">{event.title}</p>
                  </div>
                )
              })}

              {/* Now line */}
              {(() => {
                const now = new Date()
                const nowFrac = ((now.getHours() + now.getMinutes() / 60 - 7) / 16) * 100
                if (nowFrac < 0 || nowFrac > 100) return null
                return (
                  <div className="absolute left-0 right-0 flex items-center" style={{ top: `${nowFrac}%` }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 ml-8 flex-shrink-0" />
                    <div className="flex-1 border-t border-red-500/50" />
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
