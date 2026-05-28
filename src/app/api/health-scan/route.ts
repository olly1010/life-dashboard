import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('image') as File
  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mimeType = file.type || 'image/jpeg'

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `This is a screenshot from Apple Health or Apple Watch. Extract all available health data. Return ONLY valid JSON with any of these keys that are visible (omit keys not found): sleep_hours (number), deep_sleep_hours (number), rem_sleep_hours (number), hrv (number, ms), resting_hr (number, bpm), steps (integer), active_calories (integer), weight_kg (number), date (string YYYY-MM-DD). If a date is not visible use today. No markdown, no explanation.`
        },
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64}` }
        }
      ]
    }],
    response_format: { type: 'json_object' },
    max_tokens: 300,
  })

  const data = JSON.parse(response.choices[0].message.content!)
  return NextResponse.json(data)
}
