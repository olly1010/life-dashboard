'use client'

import { useMemo } from 'react'

type Stimulant = { logged_time: string; caffeine_mg: number; name: string }

// Shift circadian peaks relative to wake time.
// Biology: first peak ~3.5h after waking, dip ~7.5h after, evening peak ~12h after.
function circadian(hour: number, wakeHour: number): number {
  const peak1 = wakeHour + 3.5
  const dip   = wakeHour + 7.5
  const peak2 = wakeHour + 12
  const morning   =  40 * Math.exp(-Math.pow(hour - peak1, 2) / 8)
  const afternoon = -20 * Math.exp(-Math.pow(hour - dip,   2) / 4)
  const evening   =  20 * Math.exp(-Math.pow(hour - peak2, 2) / 6)
  return Math.max(10, Math.min(100, 30 + morning + afternoon + evening))
}

function caffeineEffect(hour: number, stimulants: Stimulant[]): number {
  return stimulants.reduce((total, s) => {
    const [th, tm] = s.logged_time.split(':').map(Number)
    const takenAt = th + tm / 60
    const dt = hour - takenAt
    if (dt < 0) return total
    const absorption = Math.min(1, dt / 0.75)
    const decay = Math.exp((-0.693 * dt) / 5.5)
    const boost = (s.caffeine_mg / 200) * 28 * absorption * decay
    return total + boost
  }, 0)
}

function sleepMultiplier(hours: number | null): number {
  if (!hours) return 0.85
  return Math.min(1.0, Math.max(0.4, (hours / 8) * 0.75 + 0.25))
}

export default function EnergyGraph({
  stimulants,
  sleepHours,
  wakeTime,
}: {
  stimulants: Stimulant[]
  sleepHours: number | null
  wakeTime: string | null
}) {
  // Parse wake time into decimal hour, default 7am
  const wakeHour = wakeTime
    ? (() => { const [h, m] = wakeTime.split(':').map(Number); return h + m / 60 })()
    : 7
  const START_HOUR = 6
  const END_HOUR = 24
  const STEPS = 120
  const W = 600
  const H = 140
  const PAD = { top: 12, right: 16, bottom: 28, left: 32 }
  const mult = sleepMultiplier(sleepHours)

  const points = useMemo(() => {
    return Array.from({ length: STEPS + 1 }, (_, i) => {
      const hour = START_HOUR + (i / STEPS) * (END_HOUR - START_HOUR)
      const base = circadian(hour, wakeHour) * mult
      const caffeine = caffeineEffect(hour, stimulants)
      const energy = Math.min(100, Math.max(0, base + caffeine))
      return { hour, energy }
    })
  }, [stimulants, mult, wakeHour])

  const now = new Date()
  const nowHour = now.getHours() + now.getMinutes() / 60

  function toX(hour: number) {
    return PAD.left + ((hour - START_HOUR) / (END_HOUR - START_HOUR)) * (W - PAD.left - PAD.right)
  }
  function toY(energy: number) {
    return PAD.top + (1 - energy / 100) * (H - PAD.top - PAD.bottom)
  }

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.hour).toFixed(1)} ${toY(p.energy).toFixed(1)}`).join(' ')
  const fillD = `${pathD} L ${toX(END_HOUR).toFixed(1)} ${(H - PAD.bottom).toFixed(1)} L ${toX(START_HOUR).toFixed(1)} ${(H - PAD.bottom).toFixed(1)} Z`

  const nowX = toX(Math.min(Math.max(nowHour, START_HOUR), END_HOUR))
  const nowPoint = points.reduce((best, p) => Math.abs(p.hour - nowHour) < Math.abs(best.hour - nowHour) ? p : best)
  const nowY = toY(nowPoint.energy)
  const nowEnergy = Math.round(nowPoint.energy)

  const hourLabels = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24]

  const caffeineMarkers = stimulants.map(s => {
    const [th, tm] = s.logged_time.split(':').map(Number)
    return { hour: th + tm / 60, name: s.name, mg: s.caffeine_mg }
  })

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-white">Energy forecast</h3>
          <p className="text-xs text-[#6b7280] mt-0.5">
            {sleepHours ? `${sleepHours}h sleep` : 'No sleep logged'}
            {wakeTime ? ` · wake ${wakeTime.slice(0, 5)}` : ' · default wake 7am'}
            {' · '}{stimulants.length} stimulant{stimulants.length !== 1 ? 's' : ''} today
          </p>
        </div>
        {nowHour >= START_HOUR && nowHour <= END_HOUR && (
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{nowEnergy}%</p>
            <p className="text-xs text-[#6b7280]">right now</p>
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
        <defs>
          <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[25, 50, 75].map(y => (
          <line key={y} x1={PAD.left} y1={toY(y)} x2={W - PAD.right} y2={toY(y)} stroke="#1f1f1f" strokeWidth="1" />
        ))}

        {/* Fill */}
        <path d={fillD} fill="url(#energyGrad)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Caffeine markers */}
        {caffeineMarkers.map((m, i) => (
          m.hour >= START_HOUR && m.hour <= END_HOUR && (
            <g key={i}>
              <line x1={toX(m.hour)} y1={PAD.top} x2={toX(m.hour)} y2={H - PAD.bottom} stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
              <circle cx={toX(m.hour)} cy={H - PAD.bottom} r="3" fill="#f59e0b" />
            </g>
          )
        ))}

        {/* Now line */}
        {nowHour >= START_HOUR && nowHour <= END_HOUR && (
          <g>
            <line x1={nowX} y1={PAD.top} x2={nowX} y2={H - PAD.bottom} stroke="#ffffff" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
            <circle cx={nowX} cy={nowY} r="4" fill="#6366f1" stroke="#111111" strokeWidth="2" />
          </g>
        )}

        {/* Hour labels */}
        {hourLabels.map(h => (
          <text key={h} x={toX(h)} y={H - 6} textAnchor="middle" fill="#4b5563" fontSize="9">
            {h === 24 ? '0' : `${h}`}
          </text>
        ))}

        {/* Y labels */}
        {[25, 50, 75, 100].map(y => (
          <text key={y} x={PAD.left - 4} y={toY(y) + 3} textAnchor="end" fill="#4b5563" fontSize="9">{y}</text>
        ))}
      </svg>

      {stimulants.length > 0 && (
        <div className="flex gap-3 mt-2 flex-wrap">
          {stimulants.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-[#6b7280]">
              <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              {s.name} {s.caffeine_mg}mg @ {s.logged_time.slice(0, 5)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
