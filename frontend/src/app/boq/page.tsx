'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  revised: 'bg-amber-100 text-amber-700',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  revised: 'Revised',
}

const ALL_STATUSES = ['all', 'draft', 'submitted', 'approved', 'revised']

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

const today = new Date().toISOString().split('T')[0]

export default function BOQPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState({
    boq_number: '',
    title: '',
    project_id: '',
    created_by: '',
    total_amount: '',
    notes: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['boq'],
    queryFn: () => apiClient.get('/boq'),
  })
  const items: any[] = Array.isArray(data?.data) ? data.data : []

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.post('/boq', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boq'] })
      toast.success('BOQ created successfully')
      setShowDialog(false)
      setForm({ boq_number: '', title: '', project_id: '', created_by: '', total_amount: '', notes: '' })
    },
    onError: () => toast.error('Failed to create BOQ'),
  })

  const filtered = statusFilter === 'all' ? items : items.filter((b: any) => b.status === statusFilter)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      total_amount: Number(form.total_amount),
      notes: form.notes || undefined,
    })
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bill of Quantities</h1>
            <p className="text-sm text-gray-500">Full cost breakdown and completion tracking</p>
          </div>
        </div>
        <Button onClick={() => setShowDialog(true)}>+ New BOQ</Button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {s === 'all' ? 'All BOQs' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No BOQs yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['BOQ #', 'Title', 'Project ID', 'Status', 'Revision', 'Total Amount'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-mono font-semibold text-indigo-600">{b.boq_number}</td>
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{b.title ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{b.project_id ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[b.status] ?? b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{b.revision ?? 0}</td>
                  <td className="px-4 py-3 font-semibold">{fmt(b.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New BOQ Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New BOQ</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="boq_number">BOQ Number *</Label>
                <Input
                  id="boq_number"
                  placeholder="BOQ-001"
                  value={form.boq_number}
                  onChange={e => setForm(f => ({ ...f, boq_number: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="project_id">Project ID *</Label>
                <Input
                  id="project_id"
                  value={form.project_id}
                  onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="created_by">Created By *</Label>
                <Input
                  id="created_by"
                  value={form.created_by}
                  onChange={e => setForm(f => ({ ...f, created_by: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label htmlFor="total_amount">Total Amount *</Label>
                <Input
                  id="total_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.total_amount}
                  onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create BOQ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
