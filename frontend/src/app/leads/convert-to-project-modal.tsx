'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { projects as projectsApi, leads as leadsApi } from '@/lib/api'

type Lead = {
  id: string
  name: string
  phone: string
  email?: string
  company?: string
  location?: string
  estimated_value?: number
  tags?: Array<{ kind?: string; project_id?: string } | string> | null
}

const PROJECT_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'mixed_use', label: 'Mixed Use' },
]

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'project'
  )
}

function tagsHasConversion(lead: Lead): boolean {
  if (!Array.isArray(lead.tags)) return false
  return lead.tags.some(
    (t) => typeof t === 'object' && t !== null && t.kind === 'converted_to_project',
  )
}

/**
 * "Convert to project" modal triggered on leads in WON status. Pre-fills the
 * project create form with the lead's name, company, contact info, and
 * estimated_value. On success it also pushes a tag into the lead so the card
 * can show "✓ Converted" without an extra round-trip.
 */
export function ConvertToProjectButton({ lead }: { lead: Lead }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const alreadyConverted = tagsHasConversion(lead)

  const [form, setForm] = useState({
    name: '',
    project_code: '',
    project_type: 'residential',
    site_address: '',
    city: '',
    state: '',
    pincode: '',
    contract_value: '',
    start_date: '',
    expected_end_date: '',
    description: '',
  })

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm({
      name: lead.name,
      project_code: `PROJ-${slugify(lead.name)}`,
      project_type: 'residential',
      site_address: lead.location ?? '',
      city: '',
      state: '',
      pincode: '',
      contract_value: lead.estimated_value ? String(lead.estimated_value) : '',
      start_date: new Date().toISOString().slice(0, 10),
      expected_end_date: '',
      description: lead.company ? `Converted from tender lead at ${lead.company}` : '',
    })
  }, [open, lead])

  const convertMutation = useMutation({
    mutationFn: async () => {
      // 1. Create the project (legacy schema requires name, project_code,
      //    client_name, site_address, city, state).
      const contractValue = form.contract_value ? Number(form.contract_value) : 0
      const payload: Record<string, unknown> = {
        name: form.name,
        project_code: form.project_code,
        project_type: form.project_type,
        client_name: lead.company || lead.name,
        client_phone: lead.phone || undefined,
        client_email: lead.email || undefined,
        site_address: form.site_address,
        city: form.city,
        state: form.state,
        pincode: form.pincode || undefined,
        budget_amount: contractValue,
        contract_value: contractValue || undefined,
        start_date: form.start_date || undefined,
        expected_end_date: form.expected_end_date || undefined,
        description: form.description || undefined,
      }
      const res = await projectsApi.create(payload as never)
      const projectId = (res.data as { id?: string })?.id
      if (!projectId) throw new Error('Project create returned no id')

      // 2. Tag the lead so the card can show "Converted" and avoid double
      //    conversion. Best-effort — failure here doesn't undo the project.
      try {
        const nextTags = [
          ...(Array.isArray(lead.tags) ? lead.tags : []),
          { kind: 'converted_to_project', project_id: projectId, at: new Date().toISOString() },
        ]
        await leadsApi.update(lead.id, { tags: nextTags } as never)
      } catch {
        /* swallow — the conversion itself succeeded */
      }

      return projectId
    },
    onSuccess: (projectId) => {
      toast.success('Project created from tender')
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setOpen(false)
      // Hop into the new project. /projects has no detail route; land
      // on the list so the user can see it in context.
      router.push('/projects')
      void projectId
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        'Could not create project'
      setError(String(msg))
      toast.error('Failed to convert')
    },
  })

  if (alreadyConverted) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
        <ArrowRight className="h-3 w-3" />
        Converted to project
      </span>
    )
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1 bg-emerald-600 hover:bg-emerald-700"
      >
        <ArrowRight className="h-3 w-3" />
        Convert to project
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Convert to project?</DialogTitle>
            <DialogDescription>
              Pre-filled from the tender. Tweak anything that needs tweaking and create the
              project.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError(null)
              if (!form.name || !form.project_code || !form.site_address || !form.city || !form.state) {
                setError('Name, code, site address, city, and state are required.')
                return
              }
              convertMutation.mutate()
            }}
            className="space-y-3 py-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cp-name">Project name <span className="text-red-500">*</span></Label>
                <Input
                  id="cp-name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cp-code">Project code <span className="text-red-500">*</span></Label>
                <Input
                  id="cp-code"
                  value={form.project_code}
                  onChange={(e) => setForm((p) => ({ ...p, project_code: e.target.value }))}
                  required
                  maxLength={40}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cp-type">Type</Label>
                <Select
                  value={form.project_type}
                  onValueChange={(v) => setForm((p) => ({ ...p, project_type: v }))}
                >
                  <SelectTrigger id="cp-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cp-value">Contract value (₹)</Label>
                <Input
                  id="cp-value"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={form.contract_value}
                  onChange={(e) => setForm((p) => ({ ...p, contract_value: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="cp-site">Site address <span className="text-red-500">*</span></Label>
              <Textarea
                id="cp-site"
                rows={2}
                value={form.site_address}
                onChange={(e) => setForm((p) => ({ ...p, site_address: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cp-city">City <span className="text-red-500">*</span></Label>
                <Input
                  id="cp-city"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cp-state">State <span className="text-red-500">*</span></Label>
                <Input
                  id="cp-state"
                  value={form.state}
                  onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cp-pincode">Pincode</Label>
                <Input
                  id="cp-pincode"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pincode}
                  onChange={(e) => setForm((p) => ({ ...p, pincode: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cp-start">Start date</Label>
                <Input
                  id="cp-start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cp-end">Expected end date</Label>
                <Input
                  id="cp-end"
                  type="date"
                  value={form.expected_end_date}
                  onChange={(e) => setForm((p) => ({ ...p, expected_end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              <p className="font-semibold uppercase tracking-widest text-[10px] text-gray-500">From tender</p>
              <p className="mt-1">
                <span className="font-medium text-foreground">Client:</span> {lead.company || lead.name}
                {lead.phone && <> · {lead.phone}</>}
                {lead.email && <> · {lead.email}</>}
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Maybe later
              </Button>
              <Button type="submit" disabled={convertMutation.isPending} className="gap-1.5">
                {convertMutation.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Creating…
                  </>
                ) : (
                  <>
                    Create project <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
