import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

export type User = {
  id: string
  email: string
  name: string
  preferences: Record<string, any>
  created_at: string
  updated_at: string
}

export type InterviewSession = {
  id: string
  user_id: string
  type: 'behavioral' | 'technical'
  tech_stack: string[]
  duration: number
  start_time: string
  end_time?: string
  metrics: Record<string, any>
  status: 'active' | 'completed' | 'aborted'
  created_at: string
  updated_at: string
}

export type ConversationTurn = {
  id: string
  session_id: string
  speaker_type: 'user' | 'ai'
  text: string
  audio_url?: string
  confidence: number
  created_at: string
  metadata: Record<string, any>
}