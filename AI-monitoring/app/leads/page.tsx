import { getLeads } from '@/lib/leads'
import LeadsDashboard from '@/components/LeadsDashboard'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const leads = await getLeads()
  return <LeadsDashboard initialLeads={leads} />
}
