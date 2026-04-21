'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Banknote, TrendingUp, Clock, CheckCircle2, Plus, Loader2, Bot } from 'lucide-react'
import { cn, formatCurrencyCr, formatDate } from '@/lib/utils'
import { billing as billingApi, agentJobs } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

// ── Config ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Draft',      color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  submitted: { label: 'Submitted',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  certified: { label: 'Certified',  color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  paid:      { label: 'Paid',       color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  disputed:  { label: 'Disputed',   color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  running_account:   { label: 'Running Account',   color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
  milestone:         { label: 'Milestone',         color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  final:             { label: 'Final',             color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  advance_recovery:  { label: 'Advance Recovery',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
}

const STATUS_FILTERS = ['All', 'draft', 'submitted', 'certified', 'paid', 'disputed'] as const

const EMPTY_FORM = {
  billing_number: '',
  project_id: '',
  submitted_by: '',
  billing_type: 'running_account',
  bill_number: '',
  billing_period_start: '',
  billing_period_end: '',
  gross_amount: '',
  retention_percentage: '5',
  gst_amount: '0',
  notes: '',
}

// ── Chase Result Modal ───────────────────────────────────────────────────────

interface ChaseModalProps {
  open: boolean
  onClose: () => void
  result: string | null
  loading: boolean
}

function ChaseModal({ open, onClose, result, loading }: ChaseModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-amber-500" /> Payment Chase Agent
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 min-h-[100px]">
          {loading ? (
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Agent is running… chasing payment…</span>
            </div>
          ) : result ? (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
              {result}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No result yet.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [chaseModal, setChaseModal] = useState<{ open: boolean; loading: boolean; result: string | null }>({
    open: false, loading: false, result: null,
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['billing'],
    queryFn: () => billingApi.list(),
  })

  const items: any[] = (data?.data as any) ?? []

  const filtered = statusFilter === 'All'
    ? items
    : items.filter((b: any) => b.status === statusFilter)

  // KPI aggregates
  const totalBills      = items.length
  const totalGross      = items.reduce((s: number, b: any) => s + (b.gross_amount ?? 0), 0)
  const totalNet        = items.reduce((s: number, b: any) => s + (b.net_amount ?? 0), 0)
  const totalPaid       = items.reduce((s: number, b: any) => s + (b.paid_amount ?? 0), 0)

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => billingApi.create(payload as any),
    onSuccess: () => {
      toast.success('Bill created')
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      setDialogOpen(false)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error('Failed to create bill'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.billing_number || !form.project_id || !form.submitted_by || !form.gross_amount) {
      toast.error('Please fill in all required fields')
      return
    }
    createMutation.mutate({
      ...form,
      bill_number: form.bill_number ? Number(form.bill_number) : undefined,
      gross_amount: Number(form.gross_amount),
      retention_percentage: Number(form.retention_percentage),
      gst_amount: Number(form.gst_amount),
    })
  }

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleChase(bill: any) {
    setChaseModal({ open: true, loading: true, result: null })
    try {
      const res = await agentJobs.create({ job_type: 'chase', project_id: bill.project_id })
      const jobId = res.data.id
      // Poll until done or failed
      let attempts = 0
      const poll = async (): Promise<void> => {
        if (attempts > 20) {
          setChaseModal(prev => ({ ...prev, loading: false, result: 'Agent timed out. Please try again.' }))
          return
        }
        attempts++
        const jobRes = await agentJobs.get(jobId)
        const job = jobRes.data
        if (job.status === 'completed') {
          const output = job.output_data
          const text = typeof output?.result === 'string'
            ? output.result
            : typeof output?.message === 'string'
            ? output.message
            : JSON.stringify(output, null, 2)
          setChaseModal(prev => ({ ...prev, loading: false, result: text }))
        } else if (job.status === 'failed') {
          setChaseModal(prev => ({ ...prev, loading: false, result: job.error_message ?? 'Agent failed.' }))
        } else {
          await new Promise(r => setTimeout(r, 1500))
          return poll()
        }
      }
      await poll()
    } catch {
      setChaseModal(prev => ({ ...prev, loading: false, result: 'Failed to start chase agent.' }))
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Banknote className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>
            <p className="text-sm text-gray-500">Track RA bills, milestones, and payment status</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Bill
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
          <Banknote className="w-5 h-5 text-indigo-500" />
          <div>
            <p className="text-sm text-gray-500">Total Bills</p>
            <p className="text-xl font-bold text-indigo-600">{totalBills}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-sm text-gray-500">Total Gross</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrencyCr(totalGross)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-sm text-gray-500">Total Net</p>
            <p className="text-xl font-bold text-amber-600">{formatCurrencyCr(totalNet)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <div>
            <p className="text-sm text-gray-500">Total Paid</p>
            <p className="text-xl font-bold text-green-600">{formatCurrencyCr(totalPaid)}</p>
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
            <Loader2 className="w-5 h-5 animate-spin" /> Loading billing records…
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-red-500">Failed to load billing records. Please try again.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Bill #', 'Project', 'Type', 'Period', 'Gross Amount', 'Net Amount', 'Total Amount', 'Status', ''].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((b: any) => {
                const sc = STATUS_CONFIG[b.status]
                const tc = TYPE_CONFIG[b.billing_type]
                const periodStr = b.billing_period_start && b.billing_period_end
                  ? `${formatDate(b.billing_period_start)} – ${formatDate(b.billing_period_end)}`
                  : b.billing_period_start
                  ? formatDate(b.billing_period_start)
                  : '—'
                return (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-3 font-mono font-semibold text-indigo-600 whitespace-nowrap">{b.billing_number}</td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 text-xs">{b.project_id}</td>
                    <td className="px-3 py-3">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', tc?.color ?? 'bg-gray-100 text-gray-700')}>
                        {tc?.label ?? b.billing_type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{periodStr}</td>
                    <td className="px-3 py-3 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {b.gross_amount != null ? formatCurrencyCr(b.gross_amount) : '—'}
                    </td>
                    <td className="px-3 py-3 text-indigo-600 font-semibold whitespace-nowrap">
                      {b.net_amount != null ? formatCurrencyCr(b.net_amount) : '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-800 dark:text-gray-200 font-semibold whitespace-nowrap">
                      {b.total_amount != null ? formatCurrencyCr(b.total_amount) : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', sc?.color ?? 'bg-gray-100 text-gray-700')}>
                        {sc?.label ?? b.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {b.status !== 'paid' && (
                        <button
                          onClick={() => handleChase(b)}
                          title="Run AI payment chase agent"
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 transition-colors"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          Chase
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-gray-400">
                    No billing records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* New Bill Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Bill</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="billing_number">Billing # <span className="text-red-500">*</span></Label>
                <Input
                  id="billing_number"
                  placeholder="RA-001"
                  value={form.billing_number}
                  onChange={e => set('billing_number', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billing_type">Type</Label>
                <Select value={form.billing_type} onValueChange={v => set('billing_type', v)}>
                  <SelectTrigger id="billing_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="running_account">Running Account</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="advance_recovery">Advance Recovery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <Label htmlFor="billing_period_start">Period Start</Label>
                <Input
                  id="billing_period_start"
                  type="date"
                  value={form.billing_period_start}
                  onChange={e => set('billing_period_start', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billing_period_end">Period End</Label>
                <Input
                  id="billing_period_end"
                  type="date"
                  value={form.billing_period_end}
                  onChange={e => set('billing_period_end', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bill_number">Bill Number</Label>
                <Input
                  id="bill_number"
                  type="number"
                  placeholder="e.g. 3"
                  value={form.bill_number}
                  onChange={e => set('bill_number', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gross_amount">Gross Amount (₹) <span className="text-red-500">*</span></Label>
                <Input
                  id="gross_amount"
                  type="number"
                  placeholder="0"
                  value={form.gross_amount}
                  onChange={e => set('gross_amount', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="retention_percentage">Retention %</Label>
                <Input
                  id="retention_percentage"
                  type="number"
                  placeholder="5"
                  value={form.retention_percentage}
                  onChange={e => set('retention_percentage', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gst_amount">GST Amount (₹)</Label>
                <Input
                  id="gst_amount"
                  type="number"
                  placeholder="0"
                  value={form.gst_amount}
                  onChange={e => set('gst_amount', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes…"
                rows={3}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Bill
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Chase Result Modal */}
      <ChaseModal
        open={chaseModal.open}
        onClose={() => setChaseModal({ open: false, loading: false, result: null })}
        result={chaseModal.result}
        loading={chaseModal.loading}
      />
    </div>
  )
}
