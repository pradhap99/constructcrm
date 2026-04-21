'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { purchaseOrders as purchaseOrdersApi } from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  partially_received: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'approved', label: 'Approved' },
  { value: 'partially_received', label: 'Partial' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

interface NewPOForm {
  po_number: string
  title: string
  project_id: string
  vendor_id: string
  created_by: string
  total_amount: string
  gst_amount: string
  subtotal: string
  delivery_date: string
  payment_terms: string
  delivery_address: string
}

const EMPTY_FORM: NewPOForm = {
  po_number: '',
  title: '',
  project_id: '',
  vendor_id: '',
  created_by: '',
  total_amount: '',
  gst_amount: '0',
  subtotal: '0',
  delivery_date: '',
  payment_terms: '',
  delivery_address: '',
}

function formatINR(amount: number | string | undefined | null): string {
  const n = Number(amount ?? 0)
  return '₹' + n.toLocaleString('en-IN')
}

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<NewPOForm>(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => purchaseOrdersApi.list(),
  })

  const items = data?.data ?? []

  const filtered = tab === 'all' ? items : items.filter((po: any) => po.status === tab)

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => purchaseOrdersApi.create(payload),
    onSuccess: () => {
      toast.success('Purchase order created successfully')
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      setDialogOpen(false)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error('Failed to create purchase order'),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.approve(id),
    onSuccess: () => {
      toast.success('Purchase order approved')
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
    onError: () => toast.error('Failed to approve purchase order'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.po_number || !form.title || !form.project_id || !form.vendor_id || !form.created_by || !form.total_amount) {
      toast.error('Please fill in all required fields')
      return
    }
    createMutation.mutate({
      ...form,
      total_amount: Number(form.total_amount),
      gst_amount: Number(form.gst_amount),
      subtotal: Number(form.subtotal),
    })
  }

  const stats = {
    total: items.length,
    active: items.filter((po: any) => ['sent', 'approved', 'partially_received'].includes(po.status)).length,
    completed: items.filter((po: any) => po.status === 'completed').length,
    totalValue: items.reduce((sum: number, po: any) => sum + Number(po.total_amount ?? 0), 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Purchase Orders</h2>
          <p className="text-muted-foreground text-sm">Manage vendor purchase orders across projects</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" /> New PO
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total POs', value: stats.total, display: String(stats.total), color: 'text-blue-600' },
          { label: 'Active', value: stats.active, display: String(stats.active), color: 'text-indigo-600' },
          { label: 'Completed', value: stats.completed, display: String(stats.completed), color: 'text-green-600' },
          { label: 'Total Value', value: stats.totalValue, display: formatINR(stats.totalValue), color: 'text-amber-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.display}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading purchase orders...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No purchase orders yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Vendor ID</TableHead>
                <TableHead>Project ID</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((po: any) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono font-semibold text-indigo-600">
                    {po.po_number}
                  </TableCell>
                  <TableCell className="font-medium max-w-[160px] truncate">{po.title}</TableCell>
                  <TableCell>{po.vendor_id}</TableCell>
                  <TableCell>{po.project_id}</TableCell>
                  <TableCell className="font-semibold">{formatINR(po.total_amount)}</TableCell>
                  <TableCell>{po.delivery_date ?? '—'}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        STATUS_COLORS[po.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {po.status.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {(po.status === 'draft' || po.status === 'sent') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 h-7 gap-1 px-2 text-xs"
                        onClick={() => approveMutation.mutate(po.id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="w-3 h-3" /> Approve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Purchase Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="po_number">
                  PO Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="po_number"
                  placeholder="PO-001"
                  value={form.po_number}
                  onChange={(e) => setForm({ ...form, po_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="PO title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="project_id">
                  Project ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="project_id"
                  placeholder="Project ID"
                  value={form.project_id}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vendor_id">
                  Vendor ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vendor_id"
                  placeholder="Vendor ID"
                  value={form.vendor_id}
                  onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="created_by">
                Created By <span className="text-red-500">*</span>
              </Label>
              <Input
                id="created_by"
                placeholder="Your name"
                value={form.created_by}
                onChange={(e) => setForm({ ...form, created_by: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="total_amount">
                  Total Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="total_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.total_amount}
                  onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gst_amount">GST Amount</Label>
                <Input
                  id="gst_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.gst_amount}
                  onChange={(e) => setForm({ ...form, gst_amount: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="subtotal">Subtotal</Label>
                <Input
                  id="subtotal"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.subtotal}
                  onChange={(e) => setForm({ ...form, subtotal: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="delivery_date">Delivery Date</Label>
                <Input
                  id="delivery_date"
                  type="date"
                  value={form.delivery_date}
                  onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Input
                  id="payment_terms"
                  placeholder="e.g. 30 days net"
                  value={form.payment_terms}
                  onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="delivery_address">Delivery Address</Label>
              <Textarea
                id="delivery_address"
                placeholder="Delivery address"
                rows={2}
                value={form.delivery_address}
                onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create PO'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
