'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { TrendingUp, Plus } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { leads } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'negotiation' | 'won' | 'lost'
type LeadSource = 'website' | 'referral' | 'cold_call' | 'exhibition' | 'tender_portal' | 'broker' | 'other'

interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  company?: string
  project_type?: string
  budget_range?: string
  location?: string
  status: LeadStatus
  source: LeadSource
  notes?: string
  assigned_to?: string
  estimated_value?: number
  follow_up_date?: string
  created_at: string
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  new:           { label: 'New',           color: 'bg-blue-100 text-blue-700 border-blue-200' },
  contacted:     { label: 'Contacted',     color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  qualified:     { label: 'Qualified',     color: 'bg-purple-100 text-purple-700 border-purple-200' },
  proposal_sent: { label: 'Proposal Sent', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  negotiation:   { label: 'Negotiation',   color: 'bg-orange-100 text-orange-700 border-orange-200' },
  won:           { label: 'Won',           color: 'bg-green-100 text-green-700 border-green-200' },
  lost:          { label: 'Lost',          color: 'bg-red-100 text-red-400 border-red-200' },
}

const SOURCE_LABELS: Record<LeadSource, string> = {
  website:       'Website',
  referral:      'Referral',
  cold_call:     'Cold Call',
  exhibition:    'Exhibition',
  tender_portal: 'Tender Portal',
  broker:        'Broker',
  other:         'Other',
}

const STATUS_FILTERS: { label: string; value: LeadStatus | 'all' }[] = [
  { label: 'All',           value: 'all' },
  { label: 'New',           value: 'new' },
  { label: 'Contacted',     value: 'contacted' },
  { label: 'Qualified',     value: 'qualified' },
  { label: 'Won',           value: 'won' },
  { label: 'Lost',          value: 'lost' },
]

function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (value >= 100000)   return `₹${(value / 100000).toFixed(2)} L`
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  company: '',
  location: '',
  project_type: '',
  budget_range: '',
  estimated_value: '',
  status: 'new' as LeadStatus,
  source: 'website' as LeadSource,
  notes: '',
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
        <div className="h-6 bg-gray-200 rounded-full w-20 ml-3" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
      </div>
    </div>
  )
}

export default function LeadsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leads.list(),
  })

  const items: Lead[] = (data?.data ?? []) as Lead[]

  const filtered = statusFilter === 'all' ? items : items.filter((l) => l.status === statusFilter)

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Lead>) => leads.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead created')
      setDialogOpen(false)
      setForm(EMPTY_FORM)
    },
    onError: () => {
      toast.error('Failed to create lead')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: Partial<Lead> = {
      name: form.name,
      phone: form.phone,
      status: form.status,
      source: form.source,
    }
    if (form.email)          payload.email = form.email
    if (form.company)        payload.company = form.company
    if (form.location)       payload.location = form.location
    if (form.project_type)   payload.project_type = form.project_type
    if (form.budget_range)   payload.budget_range = form.budget_range
    if (form.notes)          payload.notes = form.notes
    if (form.estimated_value) payload.estimated_value = Number(form.estimated_value)
    createMutation.mutate(payload)
  }

  function setField(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
            <p className="text-sm text-gray-500">
              {isLoading ? 'Loading…' : `${items.length} lead${items.length !== 1 ? 's' : ''} in pipeline`}
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> New Lead
        </Button>
      </div>

      {/* Status Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              statusFilter === opt.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Leads Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {items.length === 0
              ? 'No leads yet. Add your first lead to get started.'
              : 'No leads match the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((lead) => {
            const cfg = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new
            return (
              <div
                key={lead.id}
                className="bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                      {lead.name}
                    </h3>
                    {lead.company && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{lead.company}</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      'ml-2 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold border',
                      cfg.color
                    )}
                  >
                    {cfg.label}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-gray-600 mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 w-14 flex-shrink-0">Phone</span>
                    <span>{lead.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 w-14 flex-shrink-0">Source</span>
                    <span>{SOURCE_LABELS[lead.source] ?? lead.source}</span>
                  </div>
                  {lead.location && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400 w-14 flex-shrink-0">Location</span>
                      <span className="truncate">{lead.location}</span>
                    </div>
                  )}
                  {lead.estimated_value != null && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400 w-14 flex-shrink-0">Value</span>
                      <span className="font-semibold text-indigo-700">
                        {formatINR(lead.estimated_value)}
                      </span>
                    </div>
                  )}
                  {lead.created_at && (
                    <div className="flex items-center gap-1.5 pt-1 border-t border-gray-50 mt-1">
                      <span className="text-gray-400 w-14 flex-shrink-0">Added</span>
                      <span className="text-gray-400">{formatDate(lead.created_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Lead Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Lead</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="lead-name">Name <span className="text-red-500">*</span></Label>
              <Input
                id="lead-name"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Contact name"
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <Label htmlFor="lead-phone">Phone <span className="text-red-500">*</span></Label>
              <Input
                id="lead-phone"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="+91 98xxx xxxxx"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            {/* Company */}
            <div className="space-y-1">
              <Label htmlFor="lead-company">Company</Label>
              <Input
                id="lead-company"
                value={form.company}
                onChange={(e) => setField('company', e.target.value)}
                placeholder="Company name"
              />
            </div>

            {/* Location */}
            <div className="space-y-1">
              <Label htmlFor="lead-location">Location</Label>
              <Input
                id="lead-location"
                value={form.location}
                onChange={(e) => setField('location', e.target.value)}
                placeholder="City, State"
              />
            </div>

            {/* Project Type */}
            <div className="space-y-1">
              <Label htmlFor="lead-project-type">Project Type</Label>
              <Input
                id="lead-project-type"
                value={form.project_type}
                onChange={(e) => setField('project_type', e.target.value)}
                placeholder="e.g. Residential, Commercial"
              />
            </div>

            {/* Budget Range */}
            <div className="space-y-1">
              <Label htmlFor="lead-budget-range">Budget Range</Label>
              <Input
                id="lead-budget-range"
                value={form.budget_range}
                onChange={(e) => setField('budget_range', e.target.value)}
                placeholder="e.g. 50L-1Cr"
              />
            </div>

            {/* Estimated Value */}
            <div className="space-y-1">
              <Label htmlFor="lead-estimated-value">Estimated Value (₹)</Label>
              <Input
                id="lead-estimated-value"
                type="number"
                min="0"
                value={form.estimated_value}
                onChange={(e) => setField('estimated_value', e.target.value)}
                placeholder="e.g. 5000000"
              />
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setField('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source */}
            <div className="space-y-1">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => setField('source', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="cold_call">Cold Call</SelectItem>
                  <SelectItem value="exhibition">Exhibition</SelectItem>
                  <SelectItem value="tender_portal">Tender Portal</SelectItem>
                  <SelectItem value="broker">Broker</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label htmlFor="lead-notes">Notes</Label>
              <Textarea
                id="lead-notes"
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Additional notes…"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                {createMutation.isPending ? 'Creating…' : 'Create Lead'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
