'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileText, CheckCircle, Clock, XCircle, Plus, Loader2 } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { submittals as submittalsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

// ── Config ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:           { label: 'Draft',           color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  submitted:       { label: 'Submitted',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  under_review:    { label: 'Under Review',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  approved:        { label: 'Approved',        color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  rejected:        { label: 'Rejected',        color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  revise_resubmit: { label: 'Revise & Resubmit', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  shop_drawing:        { label: 'Shop Drawing',        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  material_approval:   { label: 'Material Approval',   color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  method_statement:    { label: 'Method Statement',    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
  test_report:         { label: 'Test Report',         color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
  inspection_test_plan:{ label: 'Inspection Test Plan',color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
  material_sample:     { label: 'Material Sample',     color: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300' },
  rfmr:                { label: 'RFMR',                color: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' },
  warranty:            { label: 'Warranty',            color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
}

const STATUS_FILTERS = ['All', 'draft', 'submitted', 'under_review', 'approved', 'rejected', 'revise_resubmit'] as const

const EMPTY_FORM = {
  submittal_number: '',
  title: '',
  project_id: '',
  submitted_by: '',
  submittal_type: 'shop_drawing',
  revision: 'A',
  spec_section: '',
  description: '',
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function SubmittalsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['submittals'],
    queryFn: () => submittalsApi.list(),
  })

  const items: any[] = data?.data ?? []

  const filtered = statusFilter === 'All'
    ? items
    : items.filter((s: any) => s.status === statusFilter)

  const totalCount     = items.length
  const approvedCount  = items.filter((s: any) => s.status === 'approved').length
  const reviewCount    = items.filter((s: any) => s.status === 'under_review').length
  const rejectedCount  = items.filter((s: any) => s.status === 'rejected').length

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => submittalsApi.create(payload as any),
    onSuccess: () => {
      toast.success('Submittal created')
      queryClient.invalidateQueries({ queryKey: ['submittals'] })
      setDialogOpen(false)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error('Failed to create submittal'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.submittal_number || !form.title || !form.project_id || !form.submitted_by) {
      toast.error('Please fill in all required fields')
      return
    }
    createMutation.mutate({ ...form })
  }

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Submittals</h1>
            <p className="text-sm text-gray-500">Track shop drawings, material approvals, and technical documents</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Submittal
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Submittals', value: totalCount,    icon: <FileText className="w-5 h-5 text-indigo-500" />,   color: 'text-indigo-600' },
          { label: 'Approved',         value: approvedCount,  icon: <CheckCircle className="w-5 h-5 text-green-500" />, color: 'text-green-600' },
          { label: 'Under Review',     value: reviewCount,    icon: <Clock className="w-5 h-5 text-amber-500" />,       color: 'text-amber-600' },
          { label: 'Rejected',         value: rejectedCount,  icon: <XCircle className="w-5 h-5 text-red-500" />,       color: 'text-red-600' },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
            {c.icon}
            <div>
              <p className="text-sm text-gray-500">{c.label}</p>
              <p className={cn('text-xl font-bold', c.color)}>{c.value}</p>
            </div>
          </div>
        ))}
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
            <Loader2 className="w-5 h-5 animate-spin" /> Loading submittals…
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-red-500">Failed to load submittals. Please try again.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Submittal #', 'Title', 'Project', 'Type', 'Submitted By', 'Rev', 'Status'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((s: any) => {
                const sc = STATUS_CONFIG[s.status]
                const tc = TYPE_CONFIG[s.submittal_type]
                return (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-3 font-mono font-semibold text-indigo-600 whitespace-nowrap">{s.submittal_number}</td>
                    <td className="px-3 py-3 max-w-[200px] truncate text-gray-800 dark:text-gray-200" title={s.title}>{s.title}</td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 text-xs">{s.project_id}</td>
                    <td className="px-3 py-3">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', tc?.color ?? 'bg-gray-100 text-gray-700')}>
                        {tc?.label ?? s.submittal_type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{s.submitted_by}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs text-gray-600 dark:text-gray-400">{s.revision ?? '—'}</td>
                    <td className="px-3 py-3">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', sc?.color ?? 'bg-gray-100 text-gray-700')}>
                        {sc?.label ?? s.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-gray-400">
                    No submittals yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* New Submittal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Submittal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="submittal_number">Submittal # <span className="text-red-500">*</span></Label>
                <Input
                  id="submittal_number"
                  placeholder="SUB-001"
                  value={form.submittal_number}
                  onChange={e => set('submittal_number', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="revision">Revision</Label>
                <Input
                  id="revision"
                  placeholder="A"
                  value={form.revision}
                  onChange={e => set('revision', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                placeholder="Brief title for this submittal"
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
                <Label htmlFor="submittal_type">Type</Label>
                <Select value={form.submittal_type} onValueChange={v => set('submittal_type', v)}>
                  <SelectTrigger id="submittal_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shop_drawing">Shop Drawing</SelectItem>
                    <SelectItem value="material_approval">Material Approval</SelectItem>
                    <SelectItem value="method_statement">Method Statement</SelectItem>
                    <SelectItem value="test_report">Test Report</SelectItem>
                    <SelectItem value="inspection_test_plan">Inspection Test Plan</SelectItem>
                    <SelectItem value="material_sample">Material Sample</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="spec_section">Spec Section</Label>
                <Input
                  id="spec_section"
                  placeholder="e.g. 03300"
                  value={form.spec_section}
                  onChange={e => set('spec_section', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the submittal…"
                rows={3}
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Submittal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
