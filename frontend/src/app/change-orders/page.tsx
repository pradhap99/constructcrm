'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GitPullRequest, TrendingUp, Clock, Calendar, Plus, Loader2 } from 'lucide-react'
import { cn, formatDate, formatCurrencyCr } from '@/lib/utils'
import { changeOrders as changeOrdersApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

// ── Config ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:        { label: 'Draft',        color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  submitted:    { label: 'Submitted',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  under_review: { label: 'Under Review', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  approved:     { label: 'Approved',     color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  rejected:     { label: 'Rejected',     color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  implemented:  { label: 'Implemented',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  addition:     { label: 'Addition',     color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  omission:     { label: 'Omission',     color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  variation:    { label: 'Variation',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  substitution: { label: 'Substitution', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
}

const STATUS_FILTERS = ['All', 'draft', 'submitted', 'under_review', 'approved', 'rejected', 'implemented'] as const

const EMPTY_FORM = {
  co_number: '',
  title: '',
  project_id: '',
  submitted_by: '',
  co_type: 'addition',
  cost_impact: '',
  time_impact_days: '',
  description: '',
  reason: '',
}

function formatImpact(days: number | undefined | null): string {
  if (!days) return '0 days'
  return days > 0 ? `+${days} days` : `${days} days`
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function ChangeOrdersPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['change-orders'],
    queryFn: () => changeOrdersApi.list(),
  })

  const items: any[] = (data?.data as any) ?? []

  const filtered = statusFilter === 'All'
    ? items
    : items.filter((co: any) => co.status === statusFilter)

  const approvedItems = items.filter((co: any) => co.status === 'approved' || co.status === 'implemented')
  const pendingItems  = items.filter((co: any) => co.status === 'submitted' || co.status === 'under_review')
  const approvedValue = approvedItems.reduce((s: number, co: any) => s + (co.cost_impact ?? 0), 0)
  const pendingValue  = pendingItems.reduce((s: number, co: any) => s + (co.cost_impact ?? 0), 0)
  const scheduleImpact = approvedItems.reduce((s: number, co: any) => s + (co.time_impact_days ?? 0), 0)

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => changeOrdersApi.create(payload as any),
    onSuccess: () => {
      toast.success('Change order created')
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
      setDialogOpen(false)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error('Failed to create change order'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.co_number || !form.title || !form.project_id || !form.submitted_by) {
      toast.error('Please fill in all required fields')
      return
    }
    createMutation.mutate({
      ...form,
      cost_impact: form.cost_impact ? Number(form.cost_impact) : 0,
      time_impact_days: form.time_impact_days ? Number(form.time_impact_days) : 0,
    })
  }

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitPullRequest className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Change Orders</h1>
            <p className="text-sm text-gray-500">Manage scope changes affecting project budget and timeline</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Change Order
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
          <GitPullRequest className="w-5 h-5 text-indigo-500" />
          <div>
            <p className="text-sm text-gray-500">Total COs</p>
            <p className="text-xl font-bold text-indigo-600">{items.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <div>
            <p className="text-sm text-gray-500">Approved Value</p>
            <p className={cn('text-xl font-bold', approvedValue >= 0 ? 'text-green-600' : 'text-red-600')}>
              {approvedValue >= 0 ? '+' : ''}{formatCurrencyCr(Math.abs(approvedValue))}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-sm text-gray-500">Pending Value</p>
            <p className="text-xl font-bold text-amber-600">{formatCurrencyCr(pendingValue)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-sm text-gray-500">Schedule Impact</p>
            <p className="text-xl font-bold text-blue-600">{scheduleImpact > 0 ? '+' : ''}{scheduleImpact} days</p>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => {
          const label = f === 'All' ? 'All' : (STATUS_CONFIG[f]?.label ?? f)
          return (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                statusFilter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 border text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading change orders…
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-red-500">Failed to load change orders. Please try again.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['CO #', 'Title', 'Project', 'Type', 'Cost Impact', 'Time Impact', 'Submitted By', 'Status'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((co: any) => {
                const sc = STATUS_CONFIG[co.status]
                const tc = TYPE_CONFIG[co.co_type]
                const cost = co.cost_impact ?? 0
                return (
                  <tr key={co.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-3 font-mono font-semibold text-indigo-600 whitespace-nowrap">{co.co_number}</td>
                    <td className="px-3 py-3 max-w-[200px] truncate text-gray-800 dark:text-gray-200" title={co.title}>{co.title}</td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 text-xs">{co.project_id}</td>
                    <td className="px-3 py-3">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', tc?.color ?? 'bg-gray-100 text-gray-700')}>
                        {tc?.label ?? co.co_type}
                      </span>
                    </td>
                    <td className={cn('px-3 py-3 font-semibold whitespace-nowrap', cost >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {cost >= 0 ? '+' : ''}{formatCurrencyCr(cost)}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatImpact(co.time_impact_days)}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{co.submitted_by}</td>
                    <td className="px-3 py-3">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', sc?.color ?? 'bg-gray-100 text-gray-700')}>
                        {sc?.label ?? co.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-gray-400">
                    No change orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* New Change Order Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Change Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="co_number">CO Number <span className="text-red-500">*</span></Label>
                <Input
                  id="co_number"
                  placeholder="CO-001"
                  value={form.co_number}
                  onChange={e => set('co_number', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co_type">Type</Label>
                <Select value={form.co_type} onValueChange={v => set('co_type', v)}>
                  <SelectTrigger id="co_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="addition">Addition</SelectItem>
                    <SelectItem value="omission">Omission</SelectItem>
                    <SelectItem value="variation">Variation</SelectItem>
                    <SelectItem value="substitution">Substitution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                placeholder="Brief title for this change order"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="project_id">Project ID <span className="text-red-500">*</span></Label>
                <Input
                  id="project_id"
                  placeholder="e.g. proj_001"
                  value={form.project_id}
                  onChange={e => set('project_id', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="submitted_by">Submitted By <span className="text-red-500">*</span></Label>
                <Input
                  id="submitted_by"
                  placeholder="Name"
                  value={form.submitted_by}
                  onChange={e => set('submitted_by', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cost_impact">Cost Impact (₹)</Label>
                <Input
                  id="cost_impact"
                  type="number"
                  placeholder="0"
                  value={form.cost_impact}
                  onChange={e => set('cost_impact', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="time_impact_days">Time Impact (days)</Label>
                <Input
                  id="time_impact_days"
                  type="number"
                  placeholder="0"
                  value={form.time_impact_days}
                  onChange={e => set('time_impact_days', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the change in scope…"
                rows={3}
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Reason for this change order…"
                rows={2}
                value={form.reason}
                onChange={e => set('reason', e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Change Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
