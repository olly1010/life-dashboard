import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tasks, date, energyData } = await request.json()

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayOfWeek = new Date(date).getDay()
  const dayName = dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1]
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5

  // Fetch sixth form schedule for this day
  const { data: sfSchedule } = await supabase
    .from('sixthform_schedule')
    .select('*')
    .eq('user_id', user.id)
    .eq('day_of_week', dayOfWeek)
    .order('start_time')

  const fixedBlocks = (sfSchedule ?? []).map(s =>
    `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)} [FIXED] ${s.subject} (${s.type})`
  ).join('\n')

  const taskList = tasks.map((t: { title: string; duration: number; priority: string; category: string }) =>
    `- "${t.title}" (~${t.duration}min, ${t.priority} priority, ${t.category})`
  ).join('\n')

  const prompt = `You are scheduling tasks for ${dayName} ${date}.

FIXED BLOCKS (cannot be moved — sixth form timetable):
${fixedBlocks || 'None (weekend or no schedule set)'}

ENERGY PROFILE TODAY:
${energyData ? `Peak energy: ${energyData.peakWindow}. Caffeine taken: ${energyData.caffeine}mg. Sleep last night: ${energyData.sleepHours}h (quality ${energyData.quality}/5).` : 'No energy data available — use typical energy patterns.'}

TASKS TO SCHEDULE:
${taskList}

Rules:
- Do NOT place anything during fixed blocks
- Schedule hard tasks (revision, study, work) during peak energy windows
- Schedule easy tasks (admin, light reading, planning) during low energy windows
- Include at least 1 short break (15min) for every 90min of focused work
- Leave some unscheduled downtime — do not overload the day
- Start no earlier than 07:00, end no later than 22:00

Return ONLY a JSON array. Each item: { "title": string, "start_time": "HH:MM", "end_time": "HH:MM", "category": string, "is_break": boolean }. No markdown.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 1000,
  })

  const content = response.choices[0].message.content!
  const parsed = JSON.parse(content)
  const schedule = Array.isArray(parsed) ? parsed : parsed.schedule ?? parsed.events ?? []

  return NextResponse.json({ schedule })
}
