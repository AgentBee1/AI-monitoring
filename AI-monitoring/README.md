# AgentBee — AI Monitoring

Internal review queue for AI-surfaced agent monitoring candidates.

## Setup

1. Clone the repo
2. `npm install`
3. Copy `.env.local.example` to `.env.local` and fill in your values
4. `npm run dev`

## Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (never exposed to browser) |
| `SUPABASE_ANON_KEY` | Anon key (used to call edge functions) |
| `ADMIN_PASSPHRASE` | Passphrase to access the review UI |

## Deploying to Vercel

1. Push to GitHub
2. Import into Vercel
3. Add all env vars in Vercel project settings
4. Deploy

## Edge Function Secrets (Supabase)

The `agent-monitoring` edge function needs these secrets set in Supabase:
- `ANTHROPIC_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL` (set automatically)
