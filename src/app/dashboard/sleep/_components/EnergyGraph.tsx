'use client'

import { useMemo, useRef, useState, useCallback } from 'react'

type Stimulant = { logged_time: string; caffeine_mg: number; name: string }

function circadian(hour: number, wakeHour: number): number {
  const peak1 = wakeHour + 3.5
  const dip   = wakeHour + 7.5
  const peak2 = wakeHour + 12
  const morning   =  40 * Math.exp(-Math.pow(hour - peak1, 2) / 8)
  const afternoon = -20 * Math.exp(-Math.pow(hour - dip,   2) / 4)
  const evening   =  20 * Math.exp(-Math.pow(hour - peak2, 2) / 6)
  return Math.max(5, Math.min(100, 30 + morning + afternoon + evening))
}

function caffeineEffect(hour: number, stimulants: Stimulant[]): number {
  return stimulants.reduce((total, s) => {
    const [th, tm] = s.logged_time.split(':').map(Number)
    const takenAt = th + tm / 60
    const dt = hour - takenAt
    if (dt < 0) return total
    const absorption = Math.min(1, dt / 0.75)
    const decay = Math.exp((-0.693 * dt) / 5.5)
    return total + (s.caffeine_mg / 200) * 28 * absorption * decay
  }, 0)
}

function sleepMultiplier(hours: number | null): number {
  if (!hours) return 0.85
  return Math.min(1.0, Math.max(0.4, (hours / 8) * 0.75 + 0.25))
}

function formatHour(h: number) {
  const hh = Math.floor(h) % 24
  const mm = Math.round((h % 1) * 60)
  const period = hh >= 12 ? 'pm' : 'am'
  const display = hh % 12 === 0 ? 12 : hh % 12
  return mm > 0 ? `${display}:${String(mm).padStart(2,'0')}${period}` : `${display}${period}`
}

export default function EnergyGraph({
  stimulants, sleepHours, wakeTime,
}: {
  stimulants: Stimulant[]
  sleepHours: number | null
  wakeTime: string | null
}) {
  const wakeHour = wakeTime
    ? (() => { const [h, m] = wakeTime.split(':').map(Number); return h + m / 60 })()
    : 7

  const START_HOUR = Math.max(4, wakeHour - 1)
  const END_HOUR = 24
  const STEPS = 200
  const W = 600
  const H = 200
  const PAD = { top: 16, right: 16, bottom: 32, left: 36 }
  const mult = sleepMultiplier(sleepHours)

  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; energy: number; hour: number } | null>(null)

  const points = useMemo(() => {
    return Array.from({ length: STEPS + 1 }, (_, i) => {
      const hour = START_HOUR + (i / STEPS) * (END_HOUR - START_HOUR)
      const energy = Math.min(100, Math.max(0, circadian(hour, wakeHour) * mult + caffeineEffect(hour, stimulants)))
      return { hour, energy }
    })
  }, [stimulants, mult, wakeHour, START_HOUR])

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
  const nowPoint = points.reduce((b, p) => Math.abs(p.hour - nowHour) < Math.abs(b.hour - nowHour) ? p : b)
  const nowEnergy = Math.round(nowPoint.energy)

  const hourLabels = Array.from({ length: 7 }, (_, i) => Math.round(START_HOUR) + i * Math.round((END_HOUR - START_HOUR) / 6))

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const hour = START_HOUR + ((svgX - PAD.left) / (W - PAD.left - PAD.right)) * (END_HOUR - START_HOUR)
    if (hour < START_HOUR || hour > END_HOUR) { setTooltip(null); return }
    const closest = points.reduce((b, p) => Math.abs(p.hour - hour) < Math.abs(b.hour - hour) ? p : b)
    const screenX = (toX(closest.hour) / W) * rect.width + rect.left
    const screenY = (toY(closest.energy) / H) * rect.height + rect.top
    setTooltip({ x: screenX - rect.left, y: screenY - rect.top, energy: Math.round(closest.energy), hour: closest.hour })
  }, [points, START_HOUR])

  const energyLabel = nowEnergy >= 75 ? 'High' : nowEnergy >= 50 ? 'Moderate' : nowEnergy >= 30 ? 'Low' : 'Very low'
  const energyColor = nowEnergy >= 75 ? '#22c55e' : nowEnergy >= 50 ? '#f97316' : nowEnergy >= 30 ? '#f59e0b' : '#ef4444'

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Energy forecast</h3>
          <p className="text-xs text-[#6b7280] mt-0.5">
            {sleepHours ? `${sleepHours}h sleep` : 'No sleep logged'}
            {wakeTime ? ` · wake ${wakeTime.slice(0, 5)}` : ' · default 7am'}
            {' · '}{stimulants.length} stimulant{stimulants.length !== 1 ? 's' : ''}
          </p>
        </div>
        {nowHour >= START_HOUR && nowHour <= END_HOUR && (
          <div className="text-right">
            <p className="text-lg font-bold text-white">{nowEnergy}%</p>
            <p className="text-xs font-medium" style={{ color: energyColor }}>{energyLabel}</p>
          </div>
        )}
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full cursor-crosshair"
          style={{ height: 200 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {[25, 50, 75].map(y => (
            <line key={y} x1={PAD.left} y1={toY(y)} x2={W - PAD.right} y2={toY(y)}
              stroke="#1f1f1f" strokeWidth="1" strokeDasharray="4,4" />
          ))}
          {[25, 50, 75, 100].map(y => (
            <text key={y} x={PAD.left - 4} y={toY(y) + 3} textAnchor="end" fill="#4b5563" fontSize="9">{y}</text>
          ))}

          <path d={fillD} fill="url(#orangeGrad)" />
          <path d={pathD} fill="none" stroke="#f97316" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />

          {stimulants.map((s, i) => {
            const [th, tm] = s.logged_time.split(':').map(Number)
            const h = th + tm / 60
            return h >= START_HOUR && h <= END_HOUR ? (
              <g key={i}>
                <line x1={toX(h)} y1={PAD.top} x2={toX(h)} y2={H - PAD.bottom}
                  stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" opacity="0.7" />
                <circle cx={toX(h)} cy={H - PAD.bottom} r="3.5" fill="#f59e0b" />
              </g>
            ) : null
          })}

          {nowHour >= START_HOUR && nowHour <= END_HOUR && (
            <g>
              <line x1={nowX} y1={PAD.top} x2={nowX} y2={H - PAD.bottom}
                stroke="#ffffff" strokeWidth="1" strokeDasharray="4,4" opacity="0.25" />
              <circle cx={nowX} cy={toY(nowPoint.energy)} r="5" fill="#f97316" stroke="#111111" strokeWidth="2.5" />
            </g>
          )}

          {tooltip && (
            <g>
              <line x1={toX(tooltip.hour)} y1={PAD.top} x2={toX(tooltip.hour)} y2={H - PAD.bottom}
                stroke="#f97316" strokeWidth="1" opacity="0.4" />
              <circle cx={toX(tooltip.hour)} cy={toY(tooltip.energy)} r="4" fill="#f97316" stroke="#111111" strokeWidth="2" />
            </g>
          )}

          {hourLabels.map(h => (
            <text key={h} x={toX(h)} y={H - 8} textAnchor="middle" fill="#4b5563" fontSize="9">
              {formatHour(h)}
            </text>
          ))}
        </svg>

        {tooltip && (
          <div
            className="absolute pointer-events-none bg-[#1a1a1a] border border-[#f97316]/30 rounded-lg px-2.5 py-1.5 text-xs shadow-lg z-10"
            style={{ left: Math.min(tooltip.x - 30, 500), top: Math.max(tooltip.y - 50, 0) }}
          >
            <p className="text-white font-semibold">{tooltip.energy}%</p>
            <p className="text-[#6b7280]">{formatHour(tooltip.hour)}</p>
          </div>
        )}
      </div>

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
