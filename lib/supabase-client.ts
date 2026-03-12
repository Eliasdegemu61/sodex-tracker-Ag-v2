import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[SUPABASE] Missing environment variables. Database features will be disabled.')
}

// Client for general use (respects RLS)
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

// Client for administrative tasks (bypasses RLS)
// !! ONLY USE ON SERVER SIDE !!
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl || '', supabaseServiceKey)
  : null
