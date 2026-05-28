'use client'

import { usePathname } from 'next/navigation'

const ROUTE_COLORS: Record<string, string> = {
  '/dashboard/goals':    '#6366f1',
  '/dashboard/calories': '#f43f5e',
  '/dashboard/sleep':    '#818cf8',
  '/dashboard/fitness':  '#f97316',
  '/dashboard/calendar': '#14b8a6',
  '/dashboard/chat':     '#a855f7',
  '/dashboard/finance':  '#22c55e',
  '/dashboard':          '#6366f1',
}

export default function PageGlow() {
  const pathname = usePathname()
  const match = Object.keys(ROUTE_COLORS).find(k => pathname.startsWith(k) && k !== '/dashboard') ?? '/dashboard'
  const color = ROUTE_COLORS[match]

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: `
          radial-gradient(ellipse 60% 40% at top left, ${color}14 0%, transparent 70%),
          radial-gradient(ellipse 40% 30% at bottom right, ${color}0c 0%, transparent 70%)
        `,
      }}
    />
  )
}
