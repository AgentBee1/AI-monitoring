import { getLeads } from '@/lib/leads'
import LeadsDashboard from '@/components/LeadsDashboard'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default async function LeadsPage() {
  const leads = await getLeads()
  return <LeadsDashboard initialLeads={leads} />
}
