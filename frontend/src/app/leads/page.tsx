'use client'
import { useState } from 'react'
import { Eye, Plus, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrencyCr, formatDate, formatPercent } from '@/lib/utils'

type LeadStage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'

interface MockLead {
  id: string
  name: string
  source: string
  client: string
  value: number
  stage: LeadStage
  probability: number
  owner: string
  createdAt: string
  expectedClose: string
}

const LEADS: MockLead[] = [
  {
    id: '1',
    name: 'Nagpur Ring Road Tender',
    source: 'Tender Portal',
    client: 'NHAI Nagpur',
    value: 450000000,
    stage: 'negotiation',
    probability: 75,
    owner: 'Arjun Mehta',
    createdAt: '2024-01-05',
    expectedClose: '2024-03-31',
  },
  {
    id: '2',
    name: 'Pune IT Park Construction',
    source: 'Referral',
    client: 'Infosys Realty',
    value: 280000000,
    stage: 'proposal',
    probability: 60,
    owner: 'Sunita Patil',
    createdAt: '2024-01-10',
    expectedClose: '2024-04-15',
  },
  {
    id: '3',
    name: 'Amravati Smart City',
    source: 'Government Portal',
    client: 'Amravati Municipal Corp',
    value: 670000000,
    stage: 'qualified',
    probability: 40,
    owner: 'Ramesh Iyer',
    createdAt: '2024-01-02',
    expectedClose: '2024-06-30',
  },
  {
    id: '4',
    name: 'Kolhapur Stadium Renovation',
    source: 'Referral',
    client: 'Kolhapur Sports Authority',
    value: 120000000,
    stage: 'won',
    probability: 100,
    owner: 'Deepa Nair',
    createdAt: '2023-12-01',
    expectedClose: '2024-01-20',
  },
  {
    id: '5',
    name: 'Thane Bridge Repair',
    source: 'Tender Portal',
    client: 'PWD Maharashtra',
    value: 85000000,
    stage: 'new',
    probability: 20,
    owner: 'Kiran Shah',
    createdAt: '2024-01-14',
    expectedClose: '2024-05-01',
  },
  {
    id: '6',
    name: 'Aurangabad Airport Expansion',
    source: 'Government Portal',
    client: 'AAI',
    value: 950000000,
    stage: 'lost',
    probability: 0,
    owner: 'Arjun Mehta',
    createdAt: '2023-11-15',
    expectedClose: '2024-01-01',
  },
]

const STAGE_CONFIG: Record<LeadStage, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  qualified: { label: 'Qualified', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  proposal: { label: 'Proposal', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  negotiation: { label: 'Negotiation', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  won: { label: 'Won', color: 'bg-green-100 text-green-700 border-green-200' },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-700 border-red-200' },
}

const FILTER_OPTIONS: { label: string; value: LeadStage | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Proposal', value: 'proposal' },
  { label: 'Negotiation', value: 'negotiation' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' },
]

const hotLeads = LEADS.filter(
  (l) => l.stage === 'negotiation' || l.stage === 'proposal'
).length

const pipelineValue = LEADS.filter((l) => l.stage !== 'lost').reduce(
  (sum, l) => sum + l.value,
  0
)

const wonCount = LEADS.filter((l) => l.stage === 'won').length
const winRate = Math.round((wonCount / LEADS.length) * 100)

function probColor(prob: number): string {
  if (prob >= 70) return 'text-green-600 font-semibold'
  if (prob >= 40) return 'text-amber-600 font-semibold'
  return 'text-red-600 font-semibold'
}

export default function LeadsPage() {
  const [stageFilter, setStageFilter] = useState<LeadStage | 'all'>('all')

  const filtered =
    stageFilter === 'all' ? LEADS : LEADS.filter((l) => l.stage === stageFilter)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
            <p className="text-sm text-gray-500">{LEADS.length} leads in pipeline</p>
          </div>
        </div>
        <button
          onClick={() => alert('Coming soon')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: LEADS.length, color: 'text-gray-900' },
          { label: 'Hot Leads', value: hotLeads, color: 'text-amber-600' },
          { label: 'Pipeline Value', value: formatCurrencyCr(pipelineValue), color: 'text-indigo-600' },
          { label: 'Win Rate', value: formatPercent(winRate), color: 'text-green-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-lg border shadow-sm p-4">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={cn('text-2xl font-bold mt-1', card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Stage Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStageFilter(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              stageFilter === opt.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {[
                'Lead Name',
                'Client',
                'Value',
                'Stage',
                'Probability',
                'Owner',
                'Close Date',
                'Actions',
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((lead) => {
              const stageCfg = STAGE_CONFIG[lead.stage]
              return (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  {/* Lead Name + Source */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{lead.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{lead.source}</div>
                  </td>

                  {/* Client */}
                  <td className="px-4 py-3 text-gray-700">{lead.client}</td>

                  {/* Value */}
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {formatCurrencyCr(lead.value)}
                  </td>

                  {/* Stage Badge */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-semibold border',
                        stageCfg.color
                      )}
                    >
                      {stageCfg.label}
                    </span>
                  </td>

                  {/* Probability */}
                  <td className={cn('px-4 py-3', probColor(lead.probability))}>
                    {formatPercent(lead.probability)}
                  </td>

                  {/* Owner */}
                  <td className="px-4 py-3 text-gray-600">{lead.owner}</td>

                  {/* Close Date */}
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(lead.expectedClose)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => alert(`Viewing lead: ${lead.name}`)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50 transition-colors"
                      title="View lead"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No leads match the selected stage.</p>
          </div>
        )}
      </div>
    </div>
  )
}
