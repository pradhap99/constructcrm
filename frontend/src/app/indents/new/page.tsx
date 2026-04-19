'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'

// ── Schema ──────────────────────────────────────────────────────────────────
const indentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  project: z.string().min(1, 'Please select a project'),
  department: z.string().min(1, 'Please select a department'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  requiredBy: z.string().min(1, 'Required by date is needed'),
  remarks: z.string().optional(),
})

type IndentFormData = z.infer<typeof indentSchema>

// ── Item row type ────────────────────────────────────────────────────────────
interface ItemRow {
  id: string
  description: string
  unit: string
  quantity: number | ''
  estimatedRate: number | ''
}

const EMPTY_ITEM = (): ItemRow => ({
  id: crypto.randomUUID(),
  description: '',
  unit: 'MT',
  quantity: '',
  estimatedRate: '',
})

// ── Lookup data ──────────────────────────────────────────────────────────────
const PROJECTS = [
  'Pune Metro Phase 3',
  'Nashik Highway Bypass',
  'Aurangabad Industrial Park',
  'Mumbai Coastal Road',
]

const DEPARTMENTS = [
  'Civil-Structural',
  'Civil-Finishing',
  'Electrical',
  'Mechanical',
  'Procurement',
]

const UNITS = ['MT', 'Nos', 'Sqm', 'Cum', 'Mtr', 'Ltr', 'Kg']

// ── Component ────────────────────────────────────────────────────────────────
export default function NewIndentPage() {
  const router = useRouter()
  const [items, setItems] = useState<ItemRow[]>([EMPTY_ITEM()])

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IndentFormData>({
    resolver: zodResolver(indentSchema),
    defaultValues: { priority: 'medium' },
  })

  // ── Item helpers ──────────────────────────────────────────────────────────
  const addItem = () => setItems((prev) => [...prev, EMPTY_ITEM()])

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((r) => r.id !== id))

  const updateItem = <K extends keyof ItemRow>(id: string, key: K, value: ItemRow[K]) =>
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)))

  const rowAmount = (row: ItemRow) => {
    const q = Number(row.quantity) || 0
    const r = Number(row.estimatedRate) || 0
    return q * r
  }

  const totalAmount = items.reduce((s, r) => s + rowAmount(r), 0)

  // ── Submit handlers ───────────────────────────────────────────────────────
  const onSubmit = (data: IndentFormData) => {
    console.log('Submitting indent:', { ...data, items })
    toast.success('Indent submitted for approval!')
    router.push('/indents')
  }

  const onDraft = () => {
    console.log('Saving draft')
    toast.success('Indent saved as draft')
    router.push('/indents')
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <div>
        <Link href="/indents">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Indents
          </Button>
        </Link>
      </div>

      {/* Page title */}
      <div>
        <h2 className="text-2xl font-bold">Create New Indent</h2>
        <p className="text-sm text-muted-foreground">Fill in the details and add line items for approval</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Main details card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Indent Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Row 1: Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g. TMT Steel Bars for Pier Foundation"
                {...register('title')}
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            {/* Row 2: Project | Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Project <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="project"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.project ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECTS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.project && (
                  <p className="text-xs text-destructive">{errors.project.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>
                  Department <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="department"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.department ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.department && (
                  <p className="text-xs text-destructive">{errors.department.message}</p>
                )}
              </div>
            </div>

            {/* Row 3: Priority | Required By */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Priority <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="requiredBy">
                  Required By Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="requiredBy"
                  type="date"
                  {...register('requiredBy')}
                  className={errors.requiredBy ? 'border-destructive' : ''}
                />
                {errors.requiredBy && (
                  <p className="text-xs text-destructive">{errors.requiredBy.message}</p>
                )}
              </div>
            </div>

            {/* Row 4: Remarks */}
            <div className="space-y-1.5">
              <Label htmlFor="remarks">Remarks (optional)</Label>
              <Textarea
                id="remarks"
                rows={3}
                placeholder="Any additional notes or urgency details..."
                {...register('remarks')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items section */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button type="button" size="sm" variant="outline" className="gap-2" onClick={addItem}>
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[240px]">Item Description</TableHead>
                  <TableHead className="w-[100px]">Unit</TableHead>
                  <TableHead className="w-[100px]">Quantity</TableHead>
                  <TableHead className="w-[130px]">Est. Rate (₹)</TableHead>
                  <TableHead className="w-[130px] text-right">Amount (₹)</TableHead>
                  <TableHead className="w-[48px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="py-2">
                      <Input
                        placeholder="Description"
                        value={row.description}
                        onChange={(e) => updateItem(row.id, 'description', e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Select
                        value={row.unit}
                        onValueChange={(val) => updateItem(row.id, 'unit', val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={row.quantity}
                        onChange={(e) =>
                          updateItem(row.id, 'quantity', e.target.value === '' ? '' : Number(e.target.value))
                        }
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={row.estimatedRate}
                        onChange={(e) =>
                          updateItem(row.id, 'estimatedRate', e.target.value === '' ? '' : Number(e.target.value))
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium py-2 pr-4">
                      {formatCurrency(rowAmount(row))}
                    </TableCell>
                    <TableCell className="py-2 pr-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive h-8 w-8"
                        onClick={() => removeItem(row.id)}
                        disabled={items.length === 1}
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Items total */}
          <div className="flex justify-end items-center gap-4 px-6 py-4 border-t bg-muted/30">
            <span className="text-sm font-medium text-muted-foreground">Total Estimated Amount</span>
            <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
          </div>
        </Card>

        {/* Action bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/indents')}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950"
            onClick={onDraft}
            disabled={isSubmitting}
          >
            Save as Draft
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={isSubmitting}
          >
            Submit for Approval
          </Button>
        </div>
      </form>
    </div>
  )
}
