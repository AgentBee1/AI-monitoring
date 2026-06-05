import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import MonitoringDashboard from '@/components/MonitoringDashboard'

async function getCandidates() {
  const { data, error } = await supabase
    .from('ai_incident_monitoring')
    .select(`
      id,
      source_url,
      summary,
      status,
      created_at,
      updated_at,
      agents (
        id,
        agency_name,
        jurisdiction,
        country,
        website,
        risk_tier
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export default async function HomePage() {
  if (!isAuthenticated()) redirect('/login')

  const candidates = await getCandidates()

  const newCount = candidates.filter(c => c.status === 'new').length
  const inProgressCount = candidates.filter(c => c.status === 'in_progress').length

  return (
    <MonitoringDashboard
      initialCandidates={candidates as any}
      newCount={newCount}
      inProgressCount={inProgressCount}
    />
  )
}
