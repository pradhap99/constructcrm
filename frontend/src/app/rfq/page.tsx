'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Users, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { rfq as rfqApi } from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  quotes_received: 'bg-amber-100 text-amber-700',
  compared: 'bg-purple-100 text-purple-700',
  po_raised: 'bg-green-100 text-green-700',
}

interface NewRFQForm {
  rfq_number: string
  title: string
  project_id: string
  created_by: string
  deadline: string
  description: string
}

const EMPTY_FORM: NewRFQForm = {
  rfq_number: '',
  title: '',
  project_id: '',
  created_by: '',
  deadline: '',
  description: '',
}

export default function RFQPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<NewRFQForm>(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['rfq'],
    queryFn: () => rfqApi.list(),
  })

  const items = data?.data ?? []

  const createMutation = useMutation({
    mutationFn: (payload: Partial<NewRFQForm>) => rfqApi.create(payload),
    onSuccess: () => {
      toast.success('RFQ created successfully')
      queryClient.invalidateQueries({ queryKey: ['rfq'] })
      setDialogOpen(false)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error('Failed to create RFQ'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.rfq_number || !form.title || !form.project_id || !form.created_by) {
      toast.error('Please fill in all required fields')
      return
    }
    createMutation.mutate(form)
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RFQ Management</h1>
          <p className="text-gray-500 text-sm mt-1">Request for Quotation pipeline</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" /> Create RFQ
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-500">Loading RFQs...</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No RFQs yet. Create your first RFQ.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item: any) => (
            <div
              key={item.id}
              className="bg-white rounded-lg border shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-blue-600 font-mono text-sm">
                  {item.rfq_number}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                    STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {item.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">Project: {item.project_id}</p>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500">
                {Array.isArray(item.vendor_ids) && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {item.vendor_ids.length} vendor{item.vendor_ids.length !== 1 ? 's' : ''}
                  </span>
                )}
                {item.deadline && (
                  <span className="flex items-center gap-1 text-red-500">
                    <Calendar className="w-3 h-3" />
                    Due: {item.deadline}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New RFQ</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="rfq_number">
                  RFQ Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="rfq_number"
                  placeholder="RFQ-001"
                  value={form.rfq_number}
                  onChange={(e) => setForm({ ...form, rfq_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="RFQ title"
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
            </div>

            <div className="space-y-1">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the RFQ requirements..."
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create RFQ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
