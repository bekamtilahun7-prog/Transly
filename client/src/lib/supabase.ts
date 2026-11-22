import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

// Anon key only. Service-role and Gemini keys must never be in frontend code.
export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in client/.env (or set VITE_USE_MOCKS=true).',
    )
  }
  return supabase
}
