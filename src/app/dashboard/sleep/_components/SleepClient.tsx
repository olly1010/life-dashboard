'use client'

import { useState, useTransition, useEffect } from 'react'
import { logSleep, logStimulant, deleteStimulant, deleteSleep } from '../actions'
import EnergyGraph from './EnergyGraph'

type SleepLog = { id: string; date: string; bedtime: string | null; wake_time: string | null; duration_hours: number | null; quality: number | null; notes: string | null }
type Stimulant = { id: string; logged_time: string; name: string; caffeine_mg: number; date: string }
type EnergyReport = { id: string; date: string; report: string; peak_window: string | null; sleep_hours: number | null; sleep_quality: number | null } | null

const QUICK_STIMULANTS = [
  { name: 'Coffee', mg: 95 }, { name: 'Espresso', mg: 63 }, { name: 'Tea', mg: 47 },
  { name: 'Monster', mg: 160 }, { name: 'Pre-workout', mg: 200 }, { name: 'Red Bull', mg: 80 },
]

export default function SleepClient({ sleepLogs, todayStimulants }: {
  sleepLogs: SleepLog[]
  todayStimulants: Stimulant[]
}) {
  const [tab, setTab] = useState<'energy' | 'sleep' | 'reports'>('energy')
  const [showSleepForm, setShowSleepForm] = useState(false)
  const [showStimulantForm, setShowStimulantForm] = useState(false)
  const [showHealthScan, setShowHealthScan] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<Record<string, number | string> | null>(null)
  const [isPending, startTransition] = useTransition()
  const [todayReport, setTodayReport] = useState<EnergyReport>(null)
  const [allReports, setAllReports] = useState<EnergyReport[]>([])
  const [loadingReport, setLoadingReport] = useState(false)

  const lastSleep = sleepLogs[0]
  const avgSleep = sleepLogs.length > 0
    ? Math.round((sleepLogs.reduce((a, s) => a + (s.duration_hours ?? 0), 0) / sleepLogs.length) * 10) / 10
    : null
  const todayCaffeine = todayStimulants.reduce((a, s) => a + s.caffeine_mg, 0)

  useEffect(() => {
    fetchReport()
    fetchAllReports()
  }, [])

  async function fetchReport() {
    setLoadingReport(true)
    try {
      const res = await fetch('/api/energy-report', { method: 'POST' })
      const data = await res.json()
      setTodayReport(data.report)
    } catch {}
    finally { setLoadingReport(false) }
  }

  async function fetchAllReports() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase.from('energy_reports').select('*').order('date', { ascending: false }).limit(30)
    setAllReports((data ?? []) as EnergyReport[])
  }

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true); setScanResult(null)
    const fd = new FormData(); fd.append('image', file)
    try {
      const res = await fetch('/api/health-scan', { method: 'POST', body: fd })
      setScanResult(await res.json())
    } catch { alert('Could not read screenshot.') }
    finally { setScanning(false) }
  }

  function qualityLabel(q: number) { return ['','Poor','Below avg','Average','Good','Excellent'][q] ?? '' }
  function qualityColor(q: number) { return ['','#ef4444','#f97316','#f59e0b','#22c55e','#10b981'][q] ?? '#6b7280' }

  const sleepTrend = sleepLogs.slice(0, 7).map(s => ({ date: s.date.slice(5), hours: s.duration_hours ?? 0, quality: s.quality ?? 0 })).reverse()

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-white">Sleep & Energy</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {lastSleep ? `Last: ${lastSleep.duration_hours}h ` : ''}
            {todayCaffeine > 0 ? `· ${todayCaffeine}mg caffeine` : ''}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setShowStimulantForm(!showStimulantForm)} className="flex items-center gap-1.5 text-[#f59e0b] border border-[#f59e0b]/30 bg-[#f59e0b]/10 hover:bg-[#f59e0b]/20 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
            ⚡ Stimulant
          </button>
          <button onClick={() => setShowSleepForm(!showSleepForm)} className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
            🌙 Sleep
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5">
        {(['energy', 'sleep', 'reports'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${tab === t ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' : 'text-[#6b7280] bg-[#111111] border border-[#1f1f1f] hover:text-white'}`}>
            {t === 'reports' ? 'Energy reports' : t}
          </button>
        ))}
      </div>

      {/* Forms */}
      {showStimulantForm && (
        <div className="bg-[#111111] border border-[#f59e0b]/30 rounded-xl p-4 mb-4">
          <div className="flex gap-2 flex-wrap mb-3">
            {QUICK_STIMULANTS.map(q => (
              <form key={q.name} action={async () => {
                const now = new Date()
                const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
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
          <form action={async (fd) => { startTransition(async () => { await logStimulant(fd); setShowStimulantForm(false) }) }} className="grid grid-cols-3 gap-2">
            <input name="name" placeholder="Coffee" required />
            <input name="caffeine_mg" type="number" placeholder="95mg" min="0" />
            <input name="logged_time" type="time" defaultValue={`${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`} required />
            <button type="submit" disabled={isPending} className="col-span-3 bg-[#f59e0b] hover:bg-[#d97706] text-black text-sm font-medium py-2 rounded-lg transition-colors">Log</button>
          </form>
        </div>
      )}

      {showSleepForm && (
        <div className="bg-[#111111] border border-indigo-500/30 rounded-xl p-4 mb-4">
          <form action={async (fd) => { startTransition(async () => { await logSleep(fd); setShowSleepForm(false) }) }} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs text-[#6b7280] mb-1">Date</label><input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required /></div>
              <div><label className="block text-xs text-[#6b7280] mb-1">Bedtime</label><input name="bedtime" type="time" /></div>
              <div><label className="block text-xs text-[#6b7280] mb-1">Wake time</label><input name="wake_time" type="time" /></div>
            </div>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(q => (
                <label key={q} className="flex-1 cursor-pointer">
                  <input type="radio" name="quality" value={q} className="sr-only peer" />
                  <div className="text-center py-2 rounded-lg border border-[#2a2a2a] peer-checked:border-indigo-500 peer-checked:bg-indigo-500/10 text-xs text-[#6b7280] peer-checked:text-indigo-400 transition-colors">{'★'.repeat(q)}</div>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={isPending} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Save</button>
              <button type="button" onClick={() => setShowSleepForm(false)} className="text-[#6b7280] hover:text-white text-sm px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Energy tab */}
      {tab === 'energy' && (
        <div className="space-y-4">
          {/* Today's report banner */}
          {todayReport && (
            <div className="bg-gradient-to-r from-indigo-500/10 to-[#111111] border border-indigo-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-indigo-400">Today's energy report</p>
                    {todayReport.peak_window && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">Peak: {todayReport.peak_window}</span>}
                  </div>
                  <p className="text-sm text-[#d1d5db] leading-relaxed">{todayReport.report}</p>
                </div>
              </div>
            </div>
          )}
          {loadingReport && !todayReport && (
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#6b7280]">Generating your daily energy report…</p>
            </div>
          )}

          <EnergyGraph stimulants={todayStimulants} sleepHours={lastSleep?.duration_hours ?? null} wakeTime={lastSleep?.wake_time ?? null} />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{lastSleep?.duration_hours ?? '—'}<span className="text-sm text-[#6b7280]">h</span></p>
              <p className="text-xs text-[#6b7280] mt-0.5">Last night</p>
              {lastSleep?.quality && <p className="text-[10px] mt-0.5" style={{ color: qualityColor(lastSleep.quality) }}>{qualityLabel(lastSleep.quality)}</p>}
            </div>
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{avgSleep ?? '—'}<span className="text-sm text-[#6b7280]">h</span></p>
              <p className="text-xs text-[#6b7280] mt-0.5">7-day avg</p>
            </div>
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{todayCaffeine}<span className="text-sm text-[#6b7280]">mg</span></p>
              <p className="text-xs text-[#6b7280] mt-0.5">Caffeine</p>
            </div>
          </div>

          {/* Health scan */}
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3">
            <button onClick={() => setShowHealthScan(!showHealthScan)} className="flex items-center gap-2 text-sm text-[#6b7280] hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
              Upload Apple Watch screenshot
            </button>
            {showHealthScan && (
              <div className="mt-3">
                <label className="flex items-center gap-3 cursor-pointer bg-[#0f0f0f] border border-dashed border-[#2a2a2a] hover:border-indigo-500/50 rounded-lg p-3 transition-colors">
                  <span className="text-sm text-[#6b7280]">{scanning ? 'Reading…' : 'Choose screenshot'}</span>
                  <input type="file" accept="image/*" onChange={handleScan} className="hidden" disabled={scanning} />
                </label>
                {scanResult && (
                  <div className="mt-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 grid grid-cols-3 gap-2">
                    {Object.entries(scanResult).map(([k, v]) => (
                      <div key={k} className="text-center">
                        <p className="text-[10px] text-[#6b7280]">{k.replace(/_/g, ' ')}</p>
                        <p className="text-xs font-medium text-white">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sleep tab */}
      {tab === 'sleep' && (
        <div className="space-y-4">
          {/* Sleep trend mini chart */}
          {sleepTrend.length > 0 && (
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4">
              <p className="text-xs font-medium text-[#9ca3af] mb-3">Last 7 nights</p>
              <div className="flex items-end gap-1.5 h-16">
                {sleepTrend.map((s, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-sm transition-all" style={{
                      height: `${Math.min(100, (s.hours / 9) * 100)}%`,
                      backgroundColor: s.quality >= 4 ? '#6366f1' : s.quality >= 3 ? '#818cf8' : '#4b5563',
                      minHeight: s.hours > 0 ? 4 : 0,
                    }} />
                    <p className="text-[9px] text-[#4b5563]">{s.date}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[#6366f1]"/><span className="text-[10px] text-[#6b7280]">Good quality</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[#4b5563]"/><span className="text-[10px] text-[#6b7280]">Poor quality</span></div>
              </div>
            </div>
          )}

          {sleepLogs.length === 0 && <p className="text-center text-[#4b5563] text-sm py-8">No sleep logged yet.</p>}
          <div className="space-y-2">
            {sleepLogs.map(log => (
              <div key={log.id} className="bg-[#111111] border border-[#1f1f1f] rounded-xl px-4 py-3 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">{log.date}</p>
                    {log.bedtime && log.wake_time && <p className="text-xs text-[#6b7280]">{log.bedtime.slice(0,5)} → {log.wake_time.slice(0,5)}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {log.duration_hours && <span className="text-sm font-semibold text-white">{log.duration_hours}h</span>}
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

      {/* Reports tab */}
      {tab === 'reports' && (
        <div className="space-y-3">
          {allReports.length === 0 && <p className="text-center text-[#4b5563] text-sm py-8">No energy reports yet. They generate each morning when you visit this page.</p>}
          {allReports.map((r, i) => r && (
            <div key={r.id} className={`bg-[#111111] border rounded-xl p-4 ${i === 0 ? 'border-indigo-500/30' : 'border-[#1f1f1f]'}`}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-medium text-[#9ca3af]">{r.date}</p>
                {r.peak_window && <span className="text-[10px] bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full">Peak: {r.peak_window}</span>}
                {i === 0 && <span className="text-[10px] bg-[#22c55e]/15 text-[#22c55e] px-2 py-0.5 rounded-full">Today</span>}
              </div>
              <p className="text-sm text-[#d1d5db] leading-relaxed">{r.report}</p>
              {(r.sleep_hours || r.sleep_quality) && (
                <div className="flex gap-3 mt-2">
                  {r.sleep_hours && <span className="text-xs text-[#6b7280]">{r.sleep_hours}h sleep</span>}
                  {r.sleep_quality && <span className="text-xs" style={{ color: qualityColor(r.sleep_quality) }}>{'★'.repeat(r.sleep_quality)}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
