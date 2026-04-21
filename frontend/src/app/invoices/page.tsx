'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { invoices } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  paid: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  paid: 'Paid',
  rejected: 'Rejected',
}

const ALL_STATUSES = ['all', 'draft', 'submitted', 'under_review', 'approved', 'paid', 'rejected']

const today = new Date().toISOString().split('T')[0]

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export default function InvoicesPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState({
    invoice_number: '',
    project_id: '',
    vendor_id: '',
    po_id: '',
    created_by: '',
    invoice_type: 'vendor',
    invoice_date: today,
    due_date: '',
    subtotal: '',
    total_gst: '0',
    tds_amount: '0',
    total_amount: '',
    notes: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoices.list(),
  })
  const items = data?.data ?? []

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => invoices.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice created successfully')
      setShowDialog(false)
      setForm({ invoice_number: '', project_id: '', vendor_id: '', po_id: '', created_by: '', invoice_type: 'vendor', invoice_date: today, due_date: '', subtotal: '', total_gst: '0', tds_amount: '0', total_amount: '', notes: '' })
    },
    onError: () => toast.error('Failed to create invoice'),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => invoices.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice approved')
    },
    onError: () => toast.error('Failed to approve invoice'),
  })

  const filtered = statusFilter === 'all' ? items : items.filter((inv: any) => inv.status === statusFilter)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      subtotal: Number(form.subtotal),
      total_gst: Number(form.total_gst),
      tds_amount: Number(form.tds_amount),
      total_amount: Number(form.total_amount),
      due_date: form.due_date || undefined,
      vendor_id: form.vendor_id || undefined,
      po_id: form.po_id || undefined,
      notes: form.notes || undefined,
    })
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Receipt className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice Management</h1>
            <p className="text-sm text-gray-500">Track vendor invoices and payment status</p>
          </div>
        </div>
        <Button onClick={() => setShowDialog(true)}>+ New Invoice</Button>
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
            {s === 'all' ? 'All Invoices' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No invoices yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Invoice #', 'Vendor ID', 'Project ID', 'Status', 'Invoice Date', 'Total Amount', 'Balance', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-mono font-semibold text-indigo-600">{inv.invoice_number}</td>
                  <td className="px-4 py-3">{inv.vendor_id ?? '—'}</td>
                  <td className="px-4 py-3">{inv.project_id ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{inv.invoice_date ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold">{fmt(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-gray-600">{fmt(inv.balance_amount)}</td>
                  <td className="px-4 py-3">
                    {(inv.status === 'submitted' || inv.status === 'under_review') && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(inv.id)}
                      >
                        Approve
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Invoice Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="invoice_number">Invoice Number *</Label>
                <Input
                  id="invoice_number"
                  placeholder="INV-001"
                  value={form.invoice_number}
                  onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))}
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
                <Label htmlFor="vendor_id">Vendor ID</Label>
                <Input
                  id="vendor_id"
                  value={form.vendor_id}
                  onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="po_id">PO ID</Label>
                <Input
                  id="po_id"
                  value={form.po_id}
                  onChange={e => setForm(f => ({ ...f, po_id: e.target.value }))}
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
              <div className="space-y-1">
                <Label>Invoice Type</Label>
                <Select value={form.invoice_type} onValueChange={v => setForm(f => ({ ...f, invoice_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="advance">Advance</SelectItem>
                    <SelectItem value="credit_note">Credit Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="invoice_date">Invoice Date *</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={form.invoice_date}
                  onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="subtotal">Subtotal *</Label>
                <Input
                  id="subtotal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.subtotal}
                  onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="total_gst">Total GST</Label>
                <Input
                  id="total_gst"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.total_gst}
                  onChange={e => setForm(f => ({ ...f, total_gst: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tds_amount">TDS Amount</Label>
                <Input
                  id="tds_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tds_amount}
                  onChange={e => setForm(f => ({ ...f, tds_amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
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
                {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
