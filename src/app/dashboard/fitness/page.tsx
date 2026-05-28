'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import GymClient from './_components/GymClient'
import RunningClient from './_components/RunningClient'

export default function FitnessPage() {
  const [tab, setTab] = useState<'gym' | 'running'>('gym')
  const [data, setData] = useState<{
    sessions: any[]; templates: any[]; exercises: any[]; runs: any[]
  }>({ sessions: [], templates: [], exercises: [], runs: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: sessions }, { data: templates }, { data: exercises }, { data: runs }] = await Promise.all([
        supabase.from('workout_sessions').select('*, workout_sets(*)').order('created_at', { ascending: false }).limit(20),
        supabase.from('workout_templates').select('*').order('created_at'),
        supabase.from('exercises').select('*').order('name'),
        supabase.from('running_sessions').select('*').order('date', { ascending: false }).limit(30),
      ])
      setData({ sessions: sessions ?? [], templates: templates ?? [], exercises: exercises ?? [], runs: runs ?? [] })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-white">Fitness</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {data.sessions.length} gym sessions · {data.runs.length} runs
          </p>
        </div>
        <div className="flex gap-1.5 bg-[#111111] border border-[#1f1f1f] rounded-xl p-1">
          <button onClick={() => setTab('gym')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'gym' ? 'bg-[#f97316] text-white' : 'text-[#6b7280] hover:text-white'}`}>
            Gym
          </button>
          <button onClick={() => setTab('running')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'running' ? 'bg-[#22c55e] text-white' : 'text-[#6b7280] hover:text-white'}`}>
            Running
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'gym' ? (
        <GymClient sessions={data.sessions} templates={data.templates} exercises={data.exercises} />
      ) : (
        <RunningClient runs={data.runs} />
      )}
    </div>
  )
}
