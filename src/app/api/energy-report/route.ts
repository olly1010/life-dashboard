import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  // Check if report already exists for today
  const { data: existing } = await supabase
    .from('energy_reports')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  if (existing) return NextResponse.json({ report: existing, fresh: false })

  // Fetch data for report
  const [{ data: lastSleep }, { data: stimulants }, { data: healthData }] = await Promise.all([
    supabase.from('sleep_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(1).single(),
    supabase.from('stimulant_logs').select('*').eq('user_id', user.id).eq('date', today),
    supabase.from('health_data').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(1).single(),
  ])

  const sleepHours = lastSleep?.duration_hours ?? healthData?.sleep_hours ?? null
  const quality = lastSleep?.quality ?? null
  const totalCaffeine = (stimulants ?? []).reduce((a: number, s: { caffeine_mg: number }) => a + s.caffeine_mg, 0)

  const prompt = `Generate a brief daily energy report for someone who:
- Slept ${sleepHours ? `${sleepHours} hours` : 'unknown hours'} last night${quality ? ` (quality: ${quality}/5)` : ''}
- HRV: ${healthData?.hrv ?? 'unknown'} ms, Resting HR: ${healthData?.resting_hr ?? 'unknown'} bpm
- Caffeine today: ${totalCaffeine}mg

Write 2-3 short sentences. Include:
1. A brief energy assessment based on sleep
2. Specific best time window for hard cognitive tasks today (e.g. "9:30am–12pm")
3. One practical tip for the day

Be direct and personal. No bullet points. Return JSON: { "report": string, "peak_window": string (e.g. "9:30am–12pm") }`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 200,
  })

  const parsed = JSON.parse(response.choices[0].message.content!)

  const { data: newReport } = await supabase.from('energy_reports').insert({
    user_id: user.id,
    date: today,
    report: parsed.report,
    peak_window: parsed.peak_window,
    sleep_hours: sleepHours,
    sleep_quality: quality,
  }).select().single()

  return NextResponse.json({ report: newReport, fresh: true })
}
