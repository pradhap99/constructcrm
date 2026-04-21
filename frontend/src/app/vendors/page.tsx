'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Building2, Plus, MapPin, Phone, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { vendors } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

type VendorStatus = 'active' | 'inactive' | 'blacklisted' | 'pending_approval'
type VendorCategory =
  | 'material_supplier'
  | 'subcontractor'
  | 'equipment_rental'
  | 'service_provider'
  | 'consultant'
  | 'labour_contractor'

interface Vendor {
  id: string
  name: string
  vendor_code: string
  category: VendorCategory
  status: VendorStatus
  contact_person?: string
  email?: string
  phone: string
  address?: string
  city?: string
  state?: string
  gstin?: string
  pan?: string
  bank_name?: string
  bank_account_no?: string
  bank_ifsc?: string
  credit_limit?: number
  payment_terms_days?: number
  rating?: number
  is_msme?: boolean
  created_at: string
}

const STATUS_CONFIG: Record<VendorStatus, { label: string; color: string }> = {
  active:           { label: 'Active',           color: 'bg-green-100 text-green-700 border-green-200' },
  inactive:         { label: 'Inactive',         color: 'bg-gray-100 text-gray-600 border-gray-200' },
  blacklisted:      { label: 'Blacklisted',      color: 'bg-red-100 text-red-700 border-red-200' },
  pending_approval: { label: 'Pending Approval', color: 'bg-amber-100 text-amber-700 border-amber-200' },
}

const CATEGORY_LABELS: Record<VendorCategory, string> = {
  material_supplier:  'Material Supplier',
  subcontractor:      'Subcontractor',
  equipment_rental:   'Equipment Rental',
  service_provider:   'Service Provider',
  consultant:         'Consultant',
  labour_contractor:  'Labour Contractor',
}

const CATEGORY_COLORS: Record<VendorCategory, string> = {
  material_supplier:  'bg-blue-50 text-blue-700',
  subcontractor:      'bg-violet-50 text-violet-700',
  equipment_rental:   'bg-orange-50 text-orange-700',
  service_provider:   'bg-teal-50 text-teal-700',
  consultant:         'bg-indigo-50 text-indigo-700',
  labour_contractor:  'bg-rose-50 text-rose-700',
}

const STATUS_FILTERS: { label: string; value: VendorStatus | 'all' }[] = [
  { label: 'All',     value: 'all' },
  { label: 'Active',  value: 'active' },
  { label: 'Inactive',value: 'inactive' },
  { label: 'Pending', value: 'pending_approval' },
]

function StarRating({ rating }: { rating: number }) {
  const full = Math.round(rating)
  return (
    <div className="flex items-center gap-0.5" title={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn('w-3 h-3', i <= full ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200')}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{rating.toFixed(1)}</span>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
        <div className="h-6 bg-gray-200 rounded-full w-20 ml-3" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
      </div>
    </div>
  )
}

const EMPTY_FORM = {
  name: '',
  vendor_code: '',
  phone: '',
  email: '',
  contact_person: '',
  category: 'material_supplier' as VendorCategory,
  city: '',
  state: '',
  gstin: '',
  pan: '',
  credit_limit: '',
  payment_terms_days: '',
  is_msme: false,
}

export default function VendorsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<VendorStatus | 'all'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendors.list(),
  })

  const items: Vendor[] = (data?.data ?? []) as Vendor[]

  const filtered =
    statusFilter === 'all' ? items : items.filter((v) => v.status === statusFilter)

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Vendor>) => vendors.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor created')
      setDialogOpen(false)
      setForm(EMPTY_FORM)
    },
    onError: () => {
      toast.error('Failed to create vendor')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: Partial<Vendor> = {
      name: form.name,
      vendor_code: form.vendor_code,
      phone: form.phone,
      category: form.category,
      is_msme: form.is_msme,
    }
    if (form.email)              payload.email = form.email
    if (form.contact_person)     payload.contact_person = form.contact_person
    if (form.city)               payload.city = form.city
    if (form.state)              payload.state = form.state
    if (form.gstin)              payload.gstin = form.gstin
    if (form.pan)                payload.pan = form.pan
    if (form.credit_limit)       payload.credit_limit = Number(form.credit_limit)
    if (form.payment_terms_days) payload.payment_terms_days = Number(form.payment_terms_days)
    createMutation.mutate(payload)
  }

  function setField(key: keyof typeof EMPTY_FORM, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Master</h1>
            <p className="text-sm text-gray-500">
              {isLoading ? 'Loading…' : `${items.length} vendor${items.length !== 1 ? 's' : ''} registered`}
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Vendor
        </Button>
      </div>

      {/* Status Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              statusFilter === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Vendor Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {items.length === 0
              ? 'No vendors yet. Add your first vendor.'
              : 'No vendors match the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((vendor) => {
            const statusCfg = STATUS_CONFIG[vendor.status] ?? STATUS_CONFIG.inactive
            const catColor = CATEGORY_COLORS[vendor.category] ?? 'bg-gray-50 text-gray-600'
            const catLabel = CATEGORY_LABELS[vendor.category] ?? vendor.category
            return (
              <div
                key={vendor.id}
                className="bg-white rounded-lg border shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                {/* Top row: name + status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                      {vendor.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">{vendor.vendor_code}</p>
                  </div>
                  <span
                    className={cn(
                      'ml-2 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold border',
                      statusCfg.color
                    )}
                  >
                    {statusCfg.label}
                  </span>
                </div>

                {/* Category badge */}
                <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium mb-3', catColor)}>
                  {catLabel}
                </span>

                {/* Rating */}
                {vendor.rating != null && (
                  <div className="mb-3">
                    <StarRating rating={vendor.rating} />
                  </div>
                )}

                {/* Details */}
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span>{vendor.phone}</span>
                  </div>
                  {vendor.city && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span>{[vendor.city, vendor.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {vendor.contact_person && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400 w-3 flex-shrink-0" />
                      <span className="text-gray-500">Contact: {vendor.contact_person}</span>
                    </div>
                  )}
                  {vendor.is_msme && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium">
                      MSME
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Vendor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Vendor</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="v-name">Name <span className="text-red-500">*</span></Label>
              <Input
                id="v-name"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Vendor / company name"
                required
              />
            </div>

            {/* Vendor Code */}
            <div className="space-y-1">
              <Label htmlFor="v-code">Vendor Code <span className="text-red-500">*</span></Label>
              <Input
                id="v-code"
                value={form.vendor_code}
                onChange={(e) => setField('vendor_code', e.target.value)}
                placeholder="e.g. VEN-001"
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <Label htmlFor="v-phone">Phone <span className="text-red-500">*</span></Label>
              <Input
                id="v-phone"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="+91 98xxx xxxxx"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="v-email">Email</Label>
              <Input
                id="v-email"
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="email@vendor.com"
              />
            </div>

            {/* Contact Person */}
            <div className="space-y-1">
              <Label htmlFor="v-contact">Contact Person</Label>
              <Input
                id="v-contact"
                value={form.contact_person}
                onChange={(e) => setField('contact_person', e.target.value)}
                placeholder="Primary contact name"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setField('category', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material_supplier">Material Supplier</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  <SelectItem value="equipment_rental">Equipment Rental</SelectItem>
                  <SelectItem value="service_provider">Service Provider</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                  <SelectItem value="labour_contractor">Labour Contractor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div className="space-y-1">
              <Label htmlFor="v-city">City</Label>
              <Input
                id="v-city"
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                placeholder="City"
              />
            </div>

            {/* State */}
            <div className="space-y-1">
              <Label htmlFor="v-state">State</Label>
              <Input
                id="v-state"
                value={form.state}
                onChange={(e) => setField('state', e.target.value)}
                placeholder="State"
              />
            </div>

            {/* GSTIN */}
            <div className="space-y-1">
              <Label htmlFor="v-gstin">GSTIN</Label>
              <Input
                id="v-gstin"
                value={form.gstin}
                onChange={(e) => setField('gstin', e.target.value)}
                placeholder="29AADCS1234F1Z5"
              />
            </div>

            {/* PAN */}
            <div className="space-y-1">
              <Label htmlFor="v-pan">PAN</Label>
              <Input
                id="v-pan"
                value={form.pan}
                onChange={(e) => setField('pan', e.target.value)}
                placeholder="AADCS1234F"
              />
            </div>

            {/* Credit Limit */}
            <div className="space-y-1">
              <Label htmlFor="v-credit">Credit Limit (₹)</Label>
              <Input
                id="v-credit"
                type="number"
                min="0"
                value={form.credit_limit}
                onChange={(e) => setField('credit_limit', e.target.value)}
                placeholder="e.g. 500000"
              />
            </div>

            {/* Payment Terms */}
            <div className="space-y-1">
              <Label htmlFor="v-payment-terms">Payment Terms (days)</Label>
              <Input
                id="v-payment-terms"
                type="number"
                min="0"
                value={form.payment_terms_days}
                onChange={(e) => setField('payment_terms_days', e.target.value)}
                placeholder="e.g. 30"
              />
            </div>

            {/* MSME Checkbox */}
            <div className="flex items-center gap-2">
              <input
                id="v-msme"
                type="checkbox"
                checked={form.is_msme}
                onChange={(e) => setField('is_msme', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="v-msme" className="cursor-pointer">MSME registered vendor</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                {createMutation.isPending ? 'Creating…' : 'Create Vendor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
