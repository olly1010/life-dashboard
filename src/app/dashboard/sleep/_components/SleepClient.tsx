'use client'

import { useState, useTransition } from 'react'
import { logSleep, logStimulant, deleteStimulant, deleteSleep } from '../actions'
import EnergyGraph from './EnergyGraph'

type SleepLog = { id: string; date: string; bedtime: string | null; wake_time: string | null; duration_hours: number | null; quality: number | null; notes: string | null }
type Stimulant = { id: string; logged_time: string; name: string; caffeine_mg: number; date: string }

const QUICK_STIMULANTS = [
  { name: 'Coffee', mg: 95 },
  { name: 'Espresso', mg: 63 },
  { name: 'Tea', mg: 47 },
  { name: 'Monster', mg: 160 },
  { name: 'Pre-workout', mg: 200 },
  { name: 'Red Bull', mg: 80 },
]

export default function SleepClient({ sleepLogs, todayStimulants, allStimulants }: {
  sleepLogs: SleepLog[]
  todayStimulants: Stimulant[]
  allStimulants: Stimulant[]
}) {
  const [showSleepForm, setShowSleepForm] = useState(false)
  const [showStimulantForm, setShowStimulantForm] = useState(false)
  const [showHealthScan, setShowHealthScan] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<Record<string, number | string> | null>(null)
  const [isPending, startTransition] = useTransition()

  const lastSleep = sleepLogs[0]
  const avgSleep = sleepLogs.length > 0
    ? Math.round((sleepLogs.reduce((a, s) => a + (s.duration_hours ?? 0), 0) / sleepLogs.length) * 10) / 10
    : null

  const todayCaffeine = todayStimulants.reduce((a, s) => a + s.caffeine_mg, 0)

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setScanResult(null)
    const fd = new FormData()
    fd.append('image', file)
    try {
      const res = await fetch('/api/health-scan', { method: 'POST', body: fd })
      const data = await res.json()
      setScanResult(data)
    } catch {
      alert('Could not read the screenshot. Try a clearer image.')
    } finally {
      setScanning(false)
    }
  }

  function qualityLabel(q: number) {
    return ['', 'Poor', 'Below avg', 'Average', 'Good', 'Excellent'][q] ?? ''
  }

  function qualityColor(q: number) {
    return ['', '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981'][q] ?? '#6b7280'
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Sleep & Energy</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {lastSleep ? `Last night: ${lastSleep.duration_hours}h · ` : ''}
            {todayCaffeine > 0 ? `${todayCaffeine}mg caffeine today` : 'No caffeine logged'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHealthScan(!showHealthScan)} className="flex items-center gap-1.5 text-[#6b7280] hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Scan screenshot
          </button>
          <button onClick={() => setShowStimulantForm(!showStimulantForm)} className="flex items-center gap-1.5 text-[#f59e0b] border border-[#f59e0b]/30 bg-[#f59e0b]/10 hover:bg-[#f59e0b]/20 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Log stimulant
          </button>
          <button onClick={() => setShowSleepForm(!showSleepForm)} className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            Log sleep
          </button>
        </div>
      </div>

      {/* Energy graph */}
      <EnergyGraph stimulants={todayStimulants} sleepHours={lastSleep?.duration_hours ?? null} wakeTime={lastSleep?.wake_time ?? null} />

      {/* Health scan */}
      {showHealthScan && (
        <div className="bg-[#111111] border border-[#6366f1]/30 rounded-xl p-4 mt-4">
          <h3 className="text-sm font-medium text-white mb-1">Upload Apple Watch screenshot</h3>
          <p className="text-xs text-[#6b7280] mb-3">Take a screenshot from the Health app or Apple Watch — AI will extract your sleep, HRV, heart rate and more.</p>
          <label className="flex items-center gap-3 cursor-pointer bg-[#0f0f0f] border border-dashed border-[#2a2a2a] hover:border-[#6366f1]/50 rounded-lg p-4 transition-colors">
            <svg className="w-5 h-5 text-[#6b7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="text-sm text-[#6b7280]">{scanning ? 'Reading screenshot...' : 'Choose screenshot'}</span>
            <input type="file" accept="image/*" onChange={handleScan} className="hidden" disabled={scanning} />
          </label>
          {scanResult && (
            <div className="mt-3 bg-[#6366f1]/10 border border-[#6366f1]/20 rounded-lg p-3">
              <p className="text-xs font-medium text-[#6366f1] mb-2">Extracted from screenshot:</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(scanResult).map(([k, v]) => (
                  <div key={k} className="text-center">
                    <p className="text-xs text-[#6b7280]">{k.replace(/_/g, ' ')}</p>
                    <p className="text-sm font-medium text-white">{String(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stimulant form */}
      {showStimulantForm && (
        <div className="bg-[#111111] border border-[#f59e0b]/30 rounded-xl p-4 mt-4">
          <h3 className="text-sm font-medium text-white mb-3">Log stimulant</h3>
          <div className="flex gap-2 flex-wrap mb-3">
            {QUICK_STIMULANTS.map(q => (
              <form key={q.name} action={async () => {
                const now = new Date()
                const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                const fd = new FormData()
                fd.append('name', q.name); fd.append('caffeine_mg', String(q.mg)); fd.append('logged_time', time)
                startTransition(async () => { await logStimulant(fd); setShowStimulantForm(false) })
              }}>
                <button type="submit" className="text-xs px-2.5 py-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] rounded-lg hover:bg-[#f59e0b]/20 transition-colors">
                  {q.name} <span className="opacity-60">{q.mg}mg</span>
                </button>
              </form>
            ))}
          </div>
          <form action={async (fd) => { startTransition(async () => { await logStimulant(fd); setShowStimulantForm(false) }) }} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#6b7280] mb-1">Name</label>
                <input name="name" placeholder="Coffee" required />
              </div>
              <div>
                <label className="block text-xs text-[#6b7280] mb-1">Caffeine (mg)</label>
                <input name="caffeine_mg" type="number" placeholder="95" min="0" />
              </div>
              <div>
                <label className="block text-xs text-[#6b7280] mb-1">Time</label>
                <input name="logged_time" type="time" defaultValue={`${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`} required />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={isPending} className="bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 text-black text-sm font-medium px-4 py-2 rounded-lg transition-colors">Log</button>
              <button type="button" onClick={() => setShowStimulantForm(false)} className="text-[#6b7280] hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Sleep form */}
      {showSleepForm && (
        <div className="bg-[#111111] border border-indigo-500/30 rounded-xl p-4 mt-4">
          <h3 className="text-sm font-medium text-white mb-3">Log sleep</h3>
          <form action={async (fd) => { startTransition(async () => { await logSleep(fd); setShowSleepForm(false) }) }} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#6b7280] mb-1">Date</label>
                <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div>
                <label className="block text-xs text-[#6b7280] mb-1">Bedtime</label>
                <input name="bedtime" type="time" />
              </div>
              <div>
                <label className="block text-xs text-[#6b7280] mb-1">Wake time</label>
                <input name="wake_time" type="time" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-2">Quality</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(q => (
                  <label key={q} className="flex-1 cursor-pointer">
                    <input type="radio" name="quality" value={q} className="sr-only peer" />
                    <div className="text-center py-2 rounded-lg border border-[#2a2a2a] peer-checked:border-indigo-500 peer-checked:bg-indigo-500/10 text-xs text-[#6b7280] peer-checked:text-indigo-400 transition-colors hover:border-[#3a3a3a]">
                      {'★'.repeat(q)}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <textarea name="notes" placeholder="Any notes about your sleep? (optional)" rows={2} style={{ resize: 'none' }} />
            <div className="flex gap-2">
              <button type="submit" disabled={isPending} className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Save</button>
              <button type="button" onClick={() => setShowSleepForm(false)} className="text-[#6b7280] hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Stats row */}
      {sleepLogs.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3">
            <p className="text-xs text-[#6b7280]">Last night</p>
            <p className="text-lg font-semibold text-white mt-0.5">{lastSleep?.duration_hours ?? '—'}h</p>
            {lastSleep?.quality && <p className="text-xs mt-0.5" style={{ color: qualityColor(lastSleep.quality) }}>{qualityLabel(lastSleep.quality)}</p>}
          </div>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3">
            <p className="text-xs text-[#6b7280]">7-day avg</p>
            <p className="text-lg font-semibold text-white mt-0.5">{avgSleep ?? '—'}h</p>
          </div>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3">
            <p className="text-xs text-[#6b7280]">Caffeine today</p>
            <p className="text-lg font-semibold text-white mt-0.5">{todayCaffeine}mg</p>
            <p className="text-xs text-[#6b7280] mt-0.5">{todayStimulants.length} dose{todayStimulants.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* Recent sleep log */}
      {sleepLogs.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Sleep history</h3>
          <div className="space-y-2">
            {sleepLogs.map(log => (
              <div key={log.id} className="bg-[#111111] border border-[#1f1f1f] rounded-xl px-4 py-3 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">{log.date}</p>
                    {log.bedtime && log.wake_time && <p className="text-xs text-[#6b7280]">{log.bedtime.slice(0,5)} → {log.wake_time.slice(0,5)}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {log.duration_hours && <span className="text-sm text-white font-medium">{log.duration_hours}h</span>}
                    {log.quality && <span className="text-xs" style={{ color: qualityColor(log.quality) }}>{qualityLabel(log.quality)}</span>}
                  </div>
                </div>
                <button onClick={() => startTransition(() => deleteSleep(log.id))} className="opacity-0 group-hover:opacity-100 p-1 text-[#4b5563] hover:text-red-400 transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
