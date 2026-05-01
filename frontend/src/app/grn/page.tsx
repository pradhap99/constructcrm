'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package } from 'lucide-react'
import { toast } from 'sonner'
import { grn } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  received: 'bg-blue-100 text-blue-700',
  quality_checked: 'bg-amber-100 text-amber-700',
  posted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  received: 'Received',
  quality_checked: 'Quality Checked',
  posted: 'Posted',
  rejected: 'Rejected',
}

const ALL_STATUSES = ['all', 'draft', 'received', 'quality_checked', 'posted', 'rejected']

const today = new Date().toISOString().split('T')[0]

interface MatchResult {
  status: string
  discrepancies: string[]
}

export default function GRNPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [showDialog, setShowDialog] = useState(false)
  const [matchModal, setMatchModal] = useState<{ open: boolean; result: MatchResult | null }>({ open: false, result: null })
  const [form, setForm] = useState({
    grn_number: '',
    po_id: '',
    project_id: '',
    vendor_id: '',
    received_by: '',
    received_date: today,
    delivery_challan_no: '',
    vehicle_number: '',
    remarks: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['grn'],
    queryFn: () => grn.list(),
  })
  const items: any[] = Array.isArray(data?.data) ? data.data : []

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => grn.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grn'] })
      toast.success('GRN created successfully')
      setShowDialog(false)
      setForm({ grn_number: '', po_id: '', project_id: '', vendor_id: '', received_by: '', received_date: today, delivery_challan_no: '', vehicle_number: '', remarks: '' })
    },
    onError: () => toast.error('Failed to create GRN'),
  })

  const confirmMutation = useMutation({
    mutationFn: (id: string) => grn.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grn'] })
      toast.success('GRN confirmed')
    },
    onError: () => toast.error('Failed to confirm GRN'),
  })

  const matchMutation = useMutation({
    mutationFn: (id: string) => grn.threeWayMatch(id),
    onSuccess: (res) => {
      setMatchModal({ open: true, result: res.data })
    },
    onError: () => toast.error('3-Way Match failed'),
  })

  const filtered = statusFilter === 'all' ? items : items.filter((g: any) => g.status === statusFilter)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GRN & 3-Way Match</h1>
            <p className="text-sm text-gray-500">Goods Receipt Notes — PO vs GRN vs Invoice</p>
          </div>
        </div>
        <Button onClick={() => setShowDialog(true)}>+ New GRN</Button>
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
            {s === 'all' ? 'All GRNs' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No GRNs yet. Record your first goods receipt.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['GRN #', 'PO ID', 'Vendor ID', 'Project ID', 'Status', 'Received Date', 'Challan No', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((g: any) => (
                <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-mono font-semibold text-indigo-600">{g.grn_number}</td>
                  <td className="px-4 py-3 font-mono text-xs">{g.po_id ?? '—'}</td>
                  <td className="px-4 py-3">{g.vendor_id ?? '—'}</td>
                  <td className="px-4 py-3">{g.project_id ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[g.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[g.status] ?? g.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{g.received_date ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{g.delivery_challan_no ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {g.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={confirmMutation.isPending}
                          onClick={() => confirmMutation.mutate(g.id)}
                        >
                          Confirm
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={matchMutation.isPending}
                        onClick={() => matchMutation.mutate(g.id)}
                      >
                        3-Way Match
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New GRN Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New GRN</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="grn_number">GRN Number *</Label>
                <Input
                  id="grn_number"
                  placeholder="GRN-001"
                  value={form.grn_number}
                  onChange={e => setForm(f => ({ ...f, grn_number: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="po_id">PO ID *</Label>
                <Input
                  id="po_id"
                  value={form.po_id}
                  onChange={e => setForm(f => ({ ...f, po_id: e.target.value }))}
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
                <Label htmlFor="vendor_id">Vendor ID *</Label>
                <Input
                  id="vendor_id"
                  value={form.vendor_id}
                  onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="received_by">Received By *</Label>
                <Input
                  id="received_by"
                  value={form.received_by}
                  onChange={e => setForm(f => ({ ...f, received_by: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="received_date">Received Date</Label>
                <Input
                  id="received_date"
                  type="date"
                  value={form.received_date}
                  onChange={e => setForm(f => ({ ...f, received_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="delivery_challan_no">Delivery Challan No</Label>
                <Input
                  id="delivery_challan_no"
                  value={form.delivery_challan_no}
                  onChange={e => setForm(f => ({ ...f, delivery_challan_no: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vehicle_number">Vehicle Number</Label>
                <Input
                  id="vehicle_number"
                  value={form.vehicle_number}
                  onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                rows={3}
                value={form.remarks}
                onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create GRN'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3-Way Match Result Modal */}
      <Dialog open={matchModal.open} onOpenChange={open => setMatchModal(m => ({ ...m, open }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>3-Way Match Result</DialogTitle>
          </DialogHeader>
          {matchModal.result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  matchModal.result.status === 'matched' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {matchModal.result.status}
                </span>
              </div>
              {matchModal.result.discrepancies?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Discrepancies:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {matchModal.result.discrepancies.map((d, i) => (
                      <li key={i} className="text-sm text-red-600">{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(!matchModal.result.discrepancies || matchModal.result.discrepancies.length === 0) && (
                <p className="text-sm text-green-600">All quantities and amounts match.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setMatchModal({ open: false, result: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
