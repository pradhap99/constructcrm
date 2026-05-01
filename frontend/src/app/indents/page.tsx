'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { indents as indentsApi } from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  converted_to_rfq: 'bg-purple-100 text-purple-700',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700',
  normal: 'bg-gray-100 text-gray-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
}

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'converted_to_rfq', label: 'Converted' },
]

interface NewIndentForm {
  indent_number: string
  project_id: string
  requested_by: string
  priority: string
  required_date: string
  site_location: string
  purpose: string
}

const EMPTY_FORM: NewIndentForm = {
  indent_number: '',
  project_id: '',
  requested_by: '',
  priority: 'normal',
  required_date: '',
  site_location: '',
  purpose: '',
}

export default function IndentsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<NewIndentForm>(EMPTY_FORM)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectRemarks, setRejectRemarks] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['indents'],
    queryFn: () => indentsApi.list(),
  })

  const items: any[] = Array.isArray(data?.data) ? data.data : []

  const filtered = tab === 'all' ? items : items.filter((i: any) => i.status === tab)

  const createMutation = useMutation({
    mutationFn: (payload: Partial<NewIndentForm>) => indentsApi.create(payload as any),
    onSuccess: () => {
      toast.success('Indent created successfully')
      queryClient.invalidateQueries({ queryKey: ['indents'] })
      setDialogOpen(false)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error('Failed to create indent'),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => indentsApi.approve(id),
    onSuccess: () => {
      toast.success('Indent approved')
      queryClient.invalidateQueries({ queryKey: ['indents'] })
    },
    onError: () => toast.error('Failed to approve indent'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks: string }) =>
      indentsApi.reject(id, remarks),
    onSuccess: () => {
      toast.success('Indent rejected')
      queryClient.invalidateQueries({ queryKey: ['indents'] })
      setRejectingId(null)
      setRejectRemarks('')
    },
    onError: () => toast.error('Failed to reject indent'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.indent_number || !form.project_id || !form.requested_by) {
      toast.error('Please fill in all required fields')
      return
    }
    createMutation.mutate(form)
  }

  const stats = {
    total: items.length,
    pending: items.filter((i: any) => i.status === 'pending_approval').length,
    approved: items.filter((i: any) => i.status === 'approved').length,
    rejected: items.filter((i: any) => i.status === 'rejected').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Indents / Purchase Requests</h2>
          <p className="text-muted-foreground text-sm">Manage material requisitions across projects</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" /> New Indent
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-blue-600' },
          { label: 'Pending Approval', value: stats.pending, color: 'text-amber-600' },
          { label: 'Approved', value: stats.approved, color: 'text-green-600' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
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
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading indents...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No indents yet. Create your first purchase request.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Indent #</TableHead>
                <TableHead>Project ID</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Required Date</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((indent: any) => (
                <TableRow key={indent.id}>
                  <TableCell className="font-mono font-medium">{indent.indent_number}</TableCell>
                  <TableCell>{indent.project_id}</TableCell>
                  <TableCell>{indent.requested_by}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        PRIORITY_COLORS[indent.priority] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {indent.priority}
                    </span>
                  </TableCell>
                  <TableCell>{indent.required_date ?? '—'}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{indent.purpose ?? '—'}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        STATUS_COLORS[indent.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {indent.status.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {indent.status === 'pending_approval' && (
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 h-7 w-7 p-0"
                            onClick={() => approveMutation.mutate(indent.id)}
                            disabled={approveMutation.isPending}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 h-7 w-7 p-0"
                            onClick={() => {
                              setRejectingId(indent.id)
                              setRejectRemarks('')
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        {rejectingId === indent.id && (
                          <div className="flex gap-1 items-center mt-1">
                            <Input
                              className="h-7 text-xs w-32"
                              placeholder="Remarks..."
                              value={rejectRemarks}
                              onChange={(e) => setRejectRemarks(e.target.value)}
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs px-2"
                              disabled={rejectMutation.isPending}
                              onClick={() => {
                                if (!rejectRemarks.trim()) {
                                  toast.error('Please enter rejection remarks')
                                  return
                                }
                                rejectMutation.mutate({ id: indent.id, remarks: rejectRemarks })
                              }}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={() => setRejectingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Indent</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="indent_number">
                  Indent Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="indent_number"
                  placeholder="IND-001"
                  value={form.indent_number}
                  onChange={(e) => setForm({ ...form, indent_number: e.target.value })}
                  required
                />
              </div>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="requested_by">
                  Requested By <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="requested_by"
                  placeholder="Your name"
                  value={form.requested_by}
                  onChange={(e) => setForm({ ...form, requested_by: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="required_date">Required Date</Label>
                <Input
                  id="required_date"
                  type="date"
                  value={form.required_date}
                  onChange={(e) => setForm({ ...form, required_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="site_location">Site Location</Label>
                <Input
                  id="site_location"
                  placeholder="Site location"
                  value={form.site_location}
                  onChange={(e) => setForm({ ...form, site_location: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea
                id="purpose"
                placeholder="Describe the purpose of this indent..."
                rows={3}
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Indent'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
