'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { AlertCircle, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { computeBill } from '@/lib/bill-math'
import { formatINR } from '@/lib/currency'
import { todayISO } from '@/lib/date'
import { createBillAction, suggestNextBillNumber } from '@/actions/bills'

type ProjectOption = { id: string; name: string; code: string; clientName: string }
type BillDefaults = { gstRate: number; tdsRate: number; retentionRate: number }

export function CreateBillButton({
  projects,
  defaults,
  presetProjectId,
}: {
  projects: ProjectOption[]
  defaults: BillDefaults
  presetProjectId?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5" disabled={projects.length === 0}>
        <Plus className="h-3.5 w-3.5" />
        New bill
      </Button>
      <BillFormModal
        open={open}
        onOpenChange={setOpen}
        projects={projects}
        defaults={defaults}
        presetProjectId={presetProjectId}
      />
    </>
  )
}

function BillFormModal({
  open,
  onOpenChange,
  projects,
  defaults,
  presetProjectId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  projects: ProjectOption[]
  defaults: BillDefaults
  presetProjectId?: string
}) {
  const router = useRouter()
  const [state, formAction] = useFormState(createBillAction, null)

  // Local controlled state so we can do the live breakdown.
  const [projectId, setProjectId] = useState(presetProjectId ?? projects[0]?.id ?? '')
  const [billNumber, setBillNumber] = useState('RA-001')
  const [billDate, setBillDate] = useState(todayISO())
  const [gross, setGross] = useState<number>(0)
  const [gstRate, setGstRate] = useState<number>(defaults.gstRate)
  const [tdsRate, setTdsRate] = useState<number>(defaults.tdsRate)
  const [retentionRate, setRetentionRate] = useState<number>(defaults.retentionRate)
  const [mobAdvance, setMobAdvance] = useState<number>(0)
  const [other, setOther] = useState<number>(0)

  // Suggest next bill number whenever the project changes.
  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    suggestNextBillNumber(projectId).then((next) => {
      if (!cancelled) setBillNumber(next)
    })
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (open) {
      // Reset on every open so re-opening starts fresh.
      setBillDate(todayISO())
      setGross(0)
      setGstRate(defaults.gstRate)
      setTdsRate(defaults.tdsRate)
      setRetentionRate(defaults.retentionRate)
      setMobAdvance(0)
      setOther(0)
    }
  }, [open, defaults])

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false)
      router.refresh()
    }
  }, [state, onOpenChange, router])

  const breakdown = useMemo(() => {
    try {
      return computeBill({
        grossAmount: gross,
        gstRate,
        tdsRate,
        retentionRate,
        mobAdvanceRecovery: mobAdvance,
        otherDeductions: other,
      })
    } catch {
      return null
    }
  }, [gross, gstRate, tdsRate, retentionRate, mobAdvance, other])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New bill</DialogTitle>
          <DialogDescription>
            Tax math is live — the net updates with every keystroke. All numbers are stored on
            insert; you can&rsquo;t change rates after creation.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="projectId">Project</Label>
              <select
                id="projectId"
                name="projectId"
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="" disabled>
                  Pick a project
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name} ({p.clientName})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="billNumber">Bill no.</Label>
              <Input
                id="billNumber"
                name="billNumber"
                required
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                maxLength={40}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="billDate">Bill date</Label>
              <Input
                id="billDate"
                name="billDate"
                type="date"
                required
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="grossAmount">Gross amount (₹)</Label>
              <Input
                id="grossAmount"
                name="grossAmount"
                type="number"
                required
                min={0}
                step={0.01}
                inputMode="numeric"
                value={gross || ''}
                onChange={(e) => setGross(e.target.valueAsNumber || 0)}
                placeholder="1000000"
              />
            </div>
          </div>

          <fieldset className="space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-3">
            <legend className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Rates &amp; deductions
            </legend>
            <div className="grid grid-cols-3 gap-2">
              <PercentField
                id="gstRate"
                label="GST %"
                value={gstRate}
                onChange={setGstRate}
              />
              <PercentField
                id="tdsRate"
                label="TDS %"
                value={tdsRate}
                onChange={setTdsRate}
              />
              <PercentField
                id="retentionRate"
                label="Retention %"
                value={retentionRate}
                onChange={setRetentionRate}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <RupeeField
                id="mobAdvanceRecovery"
                label="Mob advance recovery"
                value={mobAdvance}
                onChange={setMobAdvance}
              />
              <RupeeField
                id="otherDeductions"
                label="Other deductions"
                value={other}
                onChange={setOther}
              />
            </div>
          </fieldset>

          {breakdown && (
            <div className="rounded-md border bg-card p-3 text-xs">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Live breakdown
              </p>
              <dl className="space-y-1.5">
                <Line label="Gross" value={formatINR(breakdown.grossAmount)} />
                <Line label={`+ GST (${gstRate}%)`} value={formatINR(breakdown.gstAmount)} positive />
                <Line label={`− TDS (${tdsRate}%)`} value={formatINR(breakdown.tdsAmount)} negative />
                <Line
                  label={`− Retention (${retentionRate}%)`}
                  value={formatINR(breakdown.retentionAmount)}
                  negative
                />
                {mobAdvance > 0 && (
                  <Line label="− Mob advance recovery" value={formatINR(mobAdvance)} negative />
                )}
                {other > 0 && (
                  <Line label="− Other deductions" value={formatINR(other)} negative />
                )}
                <div className="border-t pt-1.5 text-sm font-semibold">
                  <Line label="Net" value={formatINR(breakdown.netAmount)} />
                </div>
              </dl>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="attachmentUrl" className="text-xs">
              Attachment URL (optional)
            </Label>
            <Input
              id="attachmentUrl"
              name="attachmentUrl"
              type="url"
              placeholder="https://drive.google.com/…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">
              Notes (optional)
            </Label>
            <Textarea id="notes" name="notes" className="min-h-[60px]" />
          </div>

          {state && !state.ok && (
            <p
              role="alert"
              className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PercentField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        type="number"
        min={0}
        max={50}
        step={0.01}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.valueAsNumber || 0)}
        className="h-8 text-xs"
      />
    </div>
  )
}

function RupeeField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        type="number"
        min={0}
        step={0.01}
        inputMode="numeric"
        value={value || ''}
        onChange={(e) => onChange(e.target.valueAsNumber || 0)}
        placeholder="0"
        className="h-8 text-xs"
      />
    </div>
  )
}

function Line({
  label,
  value,
  positive,
  negative,
}: {
  label: string
  value: string
  positive?: boolean
  negative?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt
        className={
          positive
            ? 'text-emerald-700 dark:text-emerald-400'
            : negative
              ? 'text-rose-700 dark:text-rose-400'
              : 'text-muted-foreground'
        }
      >
        {label}
      </dt>
      <dd className="font-mono">{value}</dd>
    </div>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating…' : 'Create bill'}
    </Button>
  )
}
