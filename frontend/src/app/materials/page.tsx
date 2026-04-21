'use client'
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layers, Plus, Bot, Loader2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient, agentJobs } from '@/lib/api'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  match:    { label: 'Match',    color: 'bg-green-100 text-green-700 border-green-200' },
  mismatch: { label: 'Mismatch', color: 'bg-red-100 text-red-700 border-red-200' },
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
}

function fmt(n: number | string) {
  const v = Number(n)
  if (isNaN(v)) return '₹0'
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

const BLANK = { name: '', project_id: '', unit: 'Nos', ordered_qty: '', received_qty: '', installed_qty: '', rate: '', work_package: '' }

export default function MaterialsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [agentStates, setAgentStates] = useState<Record<string, 'idle' | 'running' | 'done' | 'failed'>>({})
  const [agentResults, setAgentResults] = useState<Record<string, unknown>>({})
  const [resultModal, setResultModal] = useState<{ open: boolean; projectId: string; data: unknown }>({ open: false, projectId: '', data: null })

  const { data, isLoading } = useQuery({ queryKey: ['materials'], queryFn: () => apiClient.get('/materials/') })
  const items: any[] = (data?.data as any) ?? []

  const createMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post('/materials/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); toast.success('Material added'); setShowModal(false); setForm(BLANK) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Failed to add material'),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      ordered_qty: Number(form.ordered_qty) || 0,
      received_qty: Number(form.received_qty) || 0,
      installed_qty: Number(form.installed_qty) || 0,
      rate: Number(form.rate) || 0,
    })
  }

  const pollJob = useCallback(async (key: string, jobId: string) => {
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await agentJobs.get(jobId)
        const job = res.data
        if (job.status === 'completed') {
          clearInterval(interval)
          setAgentStates(p => ({ ...p, [key]: 'done' }))
          setAgentResults(p => ({ ...p, [key]: job.output_data }))
        } else if (job.status === 'failed') {
          clearInterval(interval)
          setAgentStates(p => ({ ...p, [key]: 'failed' }))
          toast.error('Reconciliation failed')
        }
      } catch { /* ignore */ }
      if (attempts >= 30) clearInterval(interval)
    }, 2000)
  }, [])

  async function runReconciliation(projectId: string) {
    const key = `recon-${projectId}`
    setAgentStates(p => ({ ...p, [key]: 'running' }))
    try {
      const res = await agentJobs.create({ job_type: 'reconciliation', project_id: projectId })
      pollJob(key, (res.data as any).id)
    } catch {
      setAgentStates(p => ({ ...p, [key]: 'idle' }))
      toast.error('Failed to start reconciliation')
    }
  }

  const totalVAR = items.reduce((s: number, m: any) => {
    if (m.status === 'mismatch') {
      const mismatch = Math.max(0, Number(m.received_qty) - Number(m.installed_qty))
      return s + mismatch * Number(m.rate)
    }
    return s
  }, 0)

  const mismatches = items.filter((m: any) => m.status === 'mismatch').length

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Materials Tracker</h1>
            <p className="text-sm text-gray-500">{items.length} materials tracked</p>
          </div>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-sm">
          <Plus className="w-4 h-4 mr-1" /> New Material
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Materials', value: items.length, color: 'text-gray-900' },
          { label: 'Mismatches', value: mismatches, color: 'text-red-600' },
          { label: 'Matched', value: items.filter((m: any) => m.status === 'match').length, color: 'text-green-600' },
          { label: 'Value at Risk', value: fmt(totalVAR), color: 'text-amber-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-lg border shadow-sm p-4">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className={cn('text-2xl font-bold mt-1', c.color)}>{c.value}</p>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          {[1,2,3,4].map(i => <div key={i} className="h-12 border-b animate-pulse bg-gray-50" />)}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No materials tracked yet. Add your first material.</p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Material', 'Project', 'Unit', 'Ordered', 'Received', 'Installed', 'Rate', 'Value at Risk', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((m: any) => {
                  const mismatchQty = Math.max(0, Number(m.received_qty) - Number(m.installed_qty))
                  const var_ = m.status === 'mismatch' ? mismatchQty * Number(m.rate) : 0
                  const cfg = STATUS_CONFIG[m.status] ?? { label: m.status, color: 'bg-gray-100 text-gray-700 border-gray-200' }
                  const agentKey = `recon-${m.project_id}`
                  const agentState = agentStates[agentKey] ?? 'idle'
                  return (
                    <tr key={m.id} className={cn('hover:bg-gray-50', m.status === 'mismatch' && 'bg-red-50/30')}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div>{m.name}</div>
                        {m.work_package && <div className="text-xs text-gray-400">{m.work_package}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{m.project_name || m.project_id}</td>
                      <td className="px-4 py-3 text-gray-600">{m.unit}</td>
                      <td className="px-4 py-3 text-gray-700">{Number(m.ordered_qty).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-700">{Number(m.received_qty).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-700">{Number(m.installed_qty).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-700">{fmt(m.rate)}</td>
                      <td className="px-4 py-3">
                        {var_ > 0 ? (
                          <span className="text-red-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />{fmt(var_)}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border', cfg.color)}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {agentState === 'running' ? (
                          <span className="text-xs text-indigo-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Running</span>
                        ) : agentState === 'done' ? (
                          <button onClick={() => setResultModal({ open: true, projectId: m.project_id, data: agentResults[agentKey] })}
                            className="text-xs text-emerald-600 flex items-center gap-1 hover:underline">
                            <CheckCircle2 className="w-3 h-3" />Results
                          </button>
                        ) : agentState === 'failed' ? (
                          <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Failed</span>
                        ) : (
                          <button onClick={() => runReconciliation(m.project_id)}
                            className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium hover:bg-indigo-100 transition-colors">
                            <Bot className="w-3 h-3" />Reconcile
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2"><Label>Material Name *</Label><Input value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} required /></div>
              <div className="space-y-1 col-span-2"><Label>Project ID *</Label><Input value={form.project_id} onChange={e => setForm(f => ({...f,project_id:e.target.value}))} placeholder="UUID from Projects page" required /></div>
              <div className="space-y-1">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({...f,unit:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Nos','MT','Sqm','Cum','Mtr','Ltr','Kg','Set','LS'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Work Package</Label><Input value={form.work_package} onChange={e => setForm(f => ({...f,work_package:e.target.value}))} placeholder="e.g. Civil, Structural" /></div>
              <div className="space-y-1"><Label>Ordered Qty</Label><Input type="number" step="0.01" value={form.ordered_qty} onChange={e => setForm(f => ({...f,ordered_qty:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Received Qty</Label><Input type="number" step="0.01" value={form.received_qty} onChange={e => setForm(f => ({...f,received_qty:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Installed Qty</Label><Input type="number" step="0.01" value={form.installed_qty} onChange={e => setForm(f => ({...f,installed_qty:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Rate (₹)</Label><Input type="number" step="0.01" value={form.rate} onChange={e => setForm(f => ({...f,rate:e.target.value}))} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Adding…</> : 'Add Material'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Result Modal */}
      <Dialog open={resultModal.open} onOpenChange={v => setResultModal(r => ({...r, open: v}))}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-indigo-600" />Material Reconciliation Results</DialogTitle></DialogHeader>
          <div className="pt-2">
            {resultModal.data
              ? <pre className="text-xs bg-gray-50 rounded-lg p-4 overflow-auto whitespace-pre-wrap font-mono">{JSON.stringify(resultModal.data, null, 2)}</pre>
              : <p className="text-gray-400 text-sm">No results available.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
