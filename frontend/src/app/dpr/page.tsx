'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { dpr } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
}

const WEATHER_ICONS: Record<string, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  foggy: '🌫️',
  windy: '💨',
}

const ALL_STATUSES = ['all', 'draft', 'submitted', 'approved']

const today = new Date().toISOString().split('T')[0]

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DPRPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState({
    dpr_number: '',
    project_id: '',
    submitted_by: '',
    report_date: today,
    weather: 'sunny',
    total_workers: '',
    issues: '',
    remarks: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['dpr'],
    queryFn: () => dpr.list(),
  })
  const items = data?.data ?? []

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => dpr.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dpr'] })
      toast.success('DPR submitted successfully')
      setShowDialog(false)
      setForm({ dpr_number: '', project_id: '', submitted_by: '', report_date: today, weather: 'sunny', total_workers: '', issues: '', remarks: '' })
    },
    onError: () => toast.error('Failed to submit DPR'),
  })

  const filtered = statusFilter === 'all' ? items : items.filter((d: any) => d.status === statusFilter)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      total_workers: Number(form.total_workers),
      issues: form.issues || undefined,
      remarks: form.remarks || undefined,
    })
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Progress Reports (DPR)</h1>
            <p className="text-sm text-gray-500">Site engineers submit these daily</p>
          </div>
        </div>
        <Button onClick={() => setShowDialog(true)}>+ New DPR</Button>
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
            {s === 'all' ? 'All DPRs' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Cards / Table */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No daily progress reports yet.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['DPR #', 'Project ID', 'Report Date', 'Status', 'Weather', 'Workers', 'Submitted By'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((d: any) => (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-mono font-semibold text-indigo-600">{d.dpr_number}</td>
                  <td className="px-4 py-3">{d.project_id ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(d.report_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[d.status] ?? d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="mr-1">{WEATHER_ICONS[d.weather] ?? ''}</span>
                    <span className="text-gray-600 capitalize">{d.weather ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{d.total_workers ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{d.submitted_by ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New DPR Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Daily Progress Report</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="dpr_number">DPR Number *</Label>
                <Input
                  id="dpr_number"
                  placeholder="DPR-001"
                  value={form.dpr_number}
                  onChange={e => setForm(f => ({ ...f, dpr_number: e.target.value }))}
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
                <Label htmlFor="submitted_by">Submitted By *</Label>
                <Input
                  id="submitted_by"
                  value={form.submitted_by}
                  onChange={e => setForm(f => ({ ...f, submitted_by: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="report_date">Report Date</Label>
                <Input
                  id="report_date"
                  type="date"
                  value={form.report_date}
                  onChange={e => setForm(f => ({ ...f, report_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Weather</Label>
                <Select value={form.weather} onValueChange={v => setForm(f => ({ ...f, weather: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunny">☀️ Sunny</SelectItem>
                    <SelectItem value="cloudy">☁️ Cloudy</SelectItem>
                    <SelectItem value="rainy">🌧️ Rainy</SelectItem>
                    <SelectItem value="foggy">🌫️ Foggy</SelectItem>
                    <SelectItem value="windy">💨 Windy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="total_workers">Total Workers *</Label>
                <Input
                  id="total_workers"
                  type="number"
                  min="0"
                  value={form.total_workers}
                  onChange={e => setForm(f => ({ ...f, total_workers: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="issues">Issues</Label>
              <Textarea
                id="issues"
                rows={2}
                value={form.issues}
                onChange={e => setForm(f => ({ ...f, issues: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                rows={2}
                value={form.remarks}
                onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Submitting...' : 'Submit DPR'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
