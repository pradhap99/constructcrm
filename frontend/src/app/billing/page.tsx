'use client'
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Banknote, TrendingUp, Clock, CheckCircle2, Plus, Loader2, Bot, AlertCircle } from 'lucide-react'
import { cn, formatCurrencyCr, formatDate, formatCurrency } from '@/lib/utils'
import { billing as billingApi, agentJobs, projects as projectsApi } from '@/lib/api'
import { computeBill } from '@/lib/bill-math'
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
  running_account: { label: 'Running Account', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
  milestone:       { label: 'Milestone',       color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  final:           { label: 'Final',           color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  advance:         { label: 'Advance',         color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  retention:       { label: 'Retention',       color: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' },
}

const STATUS_FILTERS = ['All', 'draft', 'submitted', 'certified', 'paid', 'disputed'] as const

const EMPTY_FORM = {
  billing_number: '',
  project_id: '',
  billing_type: 'running_account',
  bill_number: '',
  billing_period_start: '',
  billing_period_end: '',
  gross_amount: '',
  gst_rate: '18',
  tds_rate: '2',
  retention_rate: '5',
  mob_advance: '0',
  other_deductions: '0',
  notes: '',
}

const DEDUCTION_KINDS = ['tds', 'mob_advance', 'other'] as const
type DeductionKind = typeof DEDUCTION_KINDS[number]

function pickDeduction(
  deductions: Array<{ kind?: string; amount?: number; rate?: number }> | null | undefined,
  kind: DeductionKind,
): { amount: number; rate?: number } {
  const row = (deductions ?? []).find((d) => d?.kind === kind)
  return { amount: Number(row?.amount ?? 0), rate: row?.rate }
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
  const [submitterId, setSubmitterId] = useState<string | null>(null)
  const [chaseModal, setChaseModal] = useState<{ open: boolean; loading: boolean; result: string | null }>({
    open: false, loading: false, result: null,
  })

  // The current user's UUID is captured at login and stored in localStorage.
  // We use it for the `submitted_by` FK — the form no longer asks users to
  // type their own UUID (that was a real bug, see the bug report in the PR).
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem('auth_user')
      if (raw) {
        const parsed = JSON.parse(raw) as { id?: string }
        if (parsed?.id) setSubmitterId(parsed.id)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['billing'],
    queryFn: () => billingApi.list(),
  })

  const { data: projectsResp } = useQuery({
    queryKey: ['projects-for-billing'],
    queryFn: () => projectsApi.list({ limit: 500 }),
  })

  // The projects endpoint historically returns either { items, total } or a
  // bare array. Handle both.
  const projectOptions: Array<{ id: string; name: string; code?: string }> = useMemo(() => {
    const raw = projectsResp?.data as any
    const list = Array.isArray(raw) ? raw : (raw?.items ?? [])
    return list as Array<{ id: string; name: string; code?: string }>
  }, [projectsResp])

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

  // Live tax breakdown — same computeBill() that runs at insert time.
  const breakdown = useMemo(() => {
    try {
      return computeBill({
        grossAmount: Number(form.gross_amount) || 0,
        gstRate: Number(form.gst_rate) || 0,
        tdsRate: Number(form.tds_rate) || 0,
        retentionRate: Number(form.retention_rate) || 0,
        mobAdvanceRecovery: Number(form.mob_advance) || 0,
        otherDeductions: Number(form.other_deductions) || 0,
      })
    } catch {
      return null
    }
  }, [
    form.gross_amount,
    form.gst_rate,
    form.tds_rate,
    form.retention_rate,
    form.mob_advance,
    form.other_deductions,
  ])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.billing_number || !form.project_id || !form.gross_amount) {
      toast.error('Bill number, project, and gross amount are required')
      return
    }
    if (!submitterId) {
      toast.error('Could not identify your user — please sign in again')
      return
    }
    if (!breakdown) {
      toast.error('Rates must be between 0 and 50 percent')
      return
    }
    // Persist the per-kind deductions in the existing `deductions` JSONB
    // column. tds carries its rate so we can audit later; mob/other are flat.
    const deductions = [
      breakdown.tdsAmount > 0
        ? { kind: 'tds', rate: breakdown.tdsRate, amount: breakdown.tdsAmount }
        : null,
      breakdown.mobAdvanceRecovery > 0
        ? { kind: 'mob_advance', amount: breakdown.mobAdvanceRecovery }
        : null,
      breakdown.otherDeductions > 0
        ? { kind: 'other', amount: breakdown.otherDeductions }
        : null,
    ].filter(Boolean)

    createMutation.mutate({
      billing_number: form.billing_number,
      project_id: form.project_id,
      submitted_by: submitterId,
      billing_type: form.billing_type,
      bill_number: form.bill_number ? Number(form.bill_number) : undefined,
      billing_period_start: form.billing_period_start || undefined,
      billing_period_end: form.billing_period_end || undefined,
      gross_amount: breakdown.grossAmount,
      gst_amount: breakdown.gstAmount,
      retention_percentage: breakdown.retentionRate,
      retention_amount: breakdown.retentionAmount,
      net_amount: breakdown.netAmount,
      // total_amount = the face value of the bill (gross + GST) before
      // tenant-side deductions like TDS/retention/etc. Matches the
      // semantics most accounting software uses.
      total_amount: breakdown.grossAmount + breakdown.gstAmount,
      deductions,
      notes: form.notes || undefined,
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
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300 text-xs">
                      {b.project_name ?? <span className="font-mono text-gray-400">{b.project_id?.slice(0, 8)}…</span>}
                    </td>
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
                    <SelectItem value="advance">Advance</SelectItem>
                    <SelectItem value="retention">Retention</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project_id">Project <span className="text-red-500">*</span></Label>
              <Select value={form.project_id} onValueChange={(v) => set('project_id', v)}>
                <SelectTrigger id="project_id">
                  <SelectValue placeholder={projectOptions.length === 0 ? 'Loading projects…' : 'Pick a project'} />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code ? `${p.code} — ${p.name}` : p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projectOptions.length === 0 && (
                <p className="text-[11px] text-gray-500">
                  No projects yet — create one before raising a bill.
                </p>
              )}
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

            {/* Rates + deductions */}
            <fieldset className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-3 space-y-3">
              <legend className="px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                Rates &amp; deductions
              </legend>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="gst_rate" className="text-[10px] uppercase tracking-widest text-gray-500">GST %</Label>
                  <Input
                    id="gst_rate"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={50}
                    step={0.01}
                    value={form.gst_rate}
                    onChange={(e) => set('gst_rate', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tds_rate" className="text-[10px] uppercase tracking-widest text-gray-500">TDS %</Label>
                  <Input
                    id="tds_rate"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={50}
                    step={0.01}
                    value={form.tds_rate}
                    onChange={(e) => set('tds_rate', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="retention_rate" className="text-[10px] uppercase tracking-widest text-gray-500">Retention %</Label>
                  <Input
                    id="retention_rate"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={50}
                    step={0.01}
                    value={form.retention_rate}
                    onChange={(e) => set('retention_rate', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="mob_advance" className="text-[10px] uppercase tracking-widest text-gray-500">Mob-advance recovery (₹)</Label>
                  <Input
                    id="mob_advance"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={form.mob_advance}
                    onChange={(e) => set('mob_advance', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="other_deductions" className="text-[10px] uppercase tracking-widest text-gray-500">Other deductions (₹)</Label>
                  <Input
                    id="other_deductions"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={form.other_deductions}
                    onChange={(e) => set('other_deductions', e.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            {/* Live breakdown */}
            {breakdown ? (
              <div className="rounded-lg border bg-gray-50 dark:bg-gray-900 p-3 text-xs">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                  Live breakdown — net updates as you type
                </p>
                <dl className="space-y-1.5">
                  <Line label="Gross" value={formatCurrency(breakdown.grossAmount)} />
                  <Line label={`+ GST (${breakdown.gstRate}%)`} value={formatCurrency(breakdown.gstAmount)} positive />
                  <Line label={`− TDS (${breakdown.tdsRate}%)`} value={formatCurrency(breakdown.tdsAmount)} negative />
                  <Line label={`− Retention (${breakdown.retentionRate}%)`} value={formatCurrency(breakdown.retentionAmount)} negative />
                  {breakdown.mobAdvanceRecovery > 0 && (
                    <Line label="− Mob-advance recovery" value={formatCurrency(breakdown.mobAdvanceRecovery)} negative />
                  )}
                  {breakdown.otherDeductions > 0 && (
                    <Line label="− Other deductions" value={formatCurrency(breakdown.otherDeductions)} negative />
                  )}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-1.5 text-sm font-semibold">
                    <Line label="Net" value={formatCurrency(breakdown.netAmount)} />
                  </div>
                </dl>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertCircle className="h-3 w-3 shrink-0" />
                One of the rates is out of range (0–50%). Fix it to see the live breakdown.
              </p>
            )}

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

function Line({
  label,
  value,
  positive,
  negative,
}: {
  label: string
  value: string
  positive?: boolean
  negative?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt
        className={cn(
          positive && 'text-emerald-700 dark:text-emerald-400',
          negative && 'text-rose-700 dark:text-rose-400',
          !positive && !negative && 'text-gray-500',
        )}
      >
        {label}
      </dt>
      <dd className="font-mono">{value}</dd>
    </div>
  )
}
