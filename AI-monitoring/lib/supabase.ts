import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side only — service role key, never exposed to the browser.
// Every request bypasses Next.js's data cache: without this, Vercel served stale Supabase results
// (the review pages kept showing data from before the latest scan, even across redeploys).
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, cache: 'no-store' }),
  },
  auth: { persistSession: false },
})
