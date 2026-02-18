import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
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