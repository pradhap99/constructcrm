// TypeScript interfaces for all ConstructCRM models

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'engineer' | 'viewer'
  avatar?: string
  createdAt: string
}

export interface Project {
  id: string
  name: string
  code: string
  description?: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  startDate: string
  endDate: string
  budget: number
  spent: number
  progress: number
  location: string
  projectManager: string
  client: string
  createdAt: string
  updatedAt: string
}

export interface Lead {
  id: string
  title: string
  clientName: string
  clientContact: string
  clientEmail: string
  clientPhone: string
  value: number
  stage: 'inquiry' | 'qualification' | 'proposal' | 'negotiation' | 'won' | 'lost'
  probability: number
  expectedCloseDate: string
  assignedTo: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Vendor {
  id: string
  name: string
  code: string
  gstin: string
  pan: string
  category: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  pincode: string
  rating: number
  onTimeDelivery: number
  rejectionRate: number
  paymentTerms: string
  bankName?: string
  accountNumber?: string
  ifscCode?: string
  status: 'active' | 'inactive' | 'blacklisted'
  createdAt: string
}

export interface IndentItem {
  id: string
  indentId: string
  itemCode: string
  description: string
  unit: string
  quantity: number
  estimatedRate: number
  estimatedAmount: number
  boqRef?: string
  remarks?: string
}

export interface Indent {
  id: string
  indentNumber: string
  projectId: string
  projectName: string
  requestedBy: string
  department: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  requiredByDate: string
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'converted_to_rfq'
  items: IndentItem[]
  totalAmount: number
  approvedBy?: string
  approvedAt?: string
  remarks?: string
  createdAt: string
  updatedAt: string
}

export interface QuoteLineItem {
  id: string
  itemDescription: string
  unit: string
  quantity: number
  unitRate: number
  gstPercent: number
  totalAmount: number
  deliveryDays: number
  remarks?: string
}

export interface VendorQuote {
  id: string
  rfqId: string
  vendorId: string
  vendorName: string
  quoteNumber: string
  submittedAt: string
  validUntil: string
  totalAmount: number
  paymentTerms: string
  deliveryTerms: string
  lineItems: QuoteLineItem[]
  status: 'received' | 'evaluated' | 'selected' | 'rejected'
}

export interface RFQ {
  id: string
  rfqNumber: string
  indentId?: string
  projectId: string
  projectName: string
  title: string
  description?: string
  status: 'draft' | 'sent' | 'quotes_received' | 'compared' | 'po_raised'
  dueDate: string
  vendors: string[]
  quotes: VendorQuote[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ComparativeStatement {
  id: string
  rfqId: string
  createdAt: string
  items: {
    description: string
    unit: string
    quantity: number
    quotes: {
      vendorId: string
      vendorName: string
      unitRate: number
      totalAmount: number
      isL1: boolean
      isH1: boolean
    }[]
  }[]
}

export interface POLineItem {
  id: string
  itemDescription: string
  unit: string
  quantity: number
  unitRate: number
  gstPercent: number
  gstAmount: number
  totalAmount: number
  deliveryDate: string
  boqRef?: string
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  rfqId?: string
  vendorId: string
  vendorName: string
  projectId: string
  projectName: string
  status: 'draft' | 'approved' | 'dispatched' | 'partially_received' | 'completed' | 'cancelled'
  poDate: string
  deliveryDate: string
  paymentTerms: string
  deliveryAddress: string
  lineItems: POLineItem[]
  subtotal: number
  gstAmount: number
  totalAmount: number
  approvedBy?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
}

export interface GRNItem {
  id: string
  grnId: string
  poLineItemId: string
  itemDescription: string
  unit: string
  orderedQty: number
  receivedQty: number
  acceptedQty: number
  rejectedQty: number
  rejectionReason?: string
  unitRate: number
  totalAmount: number
}

export interface GRN {
  id: string
  grnNumber: string
  poId: string
  poNumber: string
  vendorId: string
  vendorName: string
  projectId: string
  status: 'draft' | 'confirmed' | 'quality_checked' | 'posted'
  receivedDate: string
  vehicleNumber?: string
  driverName?: string
  items: GRNItem[]
  totalAmount: number
  qualityCheckPassed: boolean
  threeWayMatchStatus?: 'pending' | 'matched' | 'discrepancy'
  remarks?: string
  createdAt: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  vendorInvoiceNumber: string
  vendorId: string
  vendorName: string
  poId: string
  poNumber: string
  grnId?: string
  projectId: string
  projectName: string
  invoiceDate: string
  dueDate: string
  subtotal: number
  gstAmount: number
  totalAmount: number
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'disputed'
  paymentDate?: string
  paymentReference?: string
  createdAt: string
}

export interface DPR {
  id: string
  dprNumber: string
  projectId: string
  projectName: string
  date: string
  weather: string
  manpowerCount: number
  manpowerBreakdown: { trade: string; count: number }[]
  activities: { description: string; progress: number; unit: string; quantity: number }[]
  materials: { item: string; unit: string; quantity: number }[]
  equipment: { name: string; count: number; workingHours: number }[]
  issues?: string
  remarks?: string
  submittedBy: string
  createdAt: string
}

export interface BOQItem {
  id: string
  projectId: string
  itemCode: string
  description: string
  unit: string
  quantity: number
  unitRate: number
  totalAmount: number
  category: string
  workPackage: string
  completedQty: number
  completedAmount: number
  variance: number
}

export interface Submittal {
  id: string
  submittalNumber: string
  projectId: string
  projectName: string
  title: string
  type: 'shop_drawing' | 'material_sample' | 'method_statement' | 'test_report' | 'certificate'
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'resubmit'
  submittedBy: string
  reviewedBy?: string
  submittedDate: string
  requiredResponseDate: string
  responseDate?: string
  remarks?: string
  revisionNumber: number
  createdAt: string
}

export interface ChangeOrder {
  id: string
  coNumber: string
  projectId: string
  projectName: string
  title: string
  description: string
  type: 'addition' | 'omission' | 'variation'
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
  amount: number
  timeImpact: number
  submittedBy: string
  submittedDate: string
  approvedBy?: string
  approvedDate?: string
  contractReference?: string
  createdAt: string
}

export interface Payment {
  id: string
  paymentReference: string
  invoiceId: string
  amount: number
  paymentDate: string
  paymentMode: 'cheque' | 'neft' | 'rtgs' | 'upi'
  bankReference?: string
  remarks?: string
}

export interface Bill {
  id: string
  billNumber: string
  projectId: string
  clientId: string
  clientName: string
  period: string
  amount: number
  gstAmount: number
  totalAmount: number
  status: 'draft' | 'submitted' | 'approved' | 'paid'
  submittedDate?: string
  dueDate: string
  payments: Payment[]
  createdAt: string
}

export interface DashboardStats {
  totalBudget: number
  activePOs: number
  pendingGRNs: number
  totalManpower: number
  monthlySpend: number
  pendingInvoices: number
  activeProjects: number
  openLeads: number
  spendByMonth: { month: string; amount: number }[]
  topVendors: { name: string; spend: number; rating: number }[]
  recentActivity: {
    id: string
    type: string
    description: string
    timestamp: string
    status: string
  }[]
}

export interface SpendAnalytics {
  totalSpend: number
  byCategory: { category: string; amount: number; percentage: number }[]
  byVendor: { vendorName: string; amount: number; percentage: number }[]
  byProject: { projectName: string; amount: number; budget: number; variance: number }[]
  budgetVsActual: { month: string; budget: number; actual: number }[]
}

export interface ExtractedItem {
  id: string
  itemDescription: string
  unit: string
  quantity: number
  unitRate: number
  gstPercent: number
  totalAmount: number
  confidence: number
  isEdited: boolean
}

export interface AIParserResult {
  sessionId: string
  fileName: string
  documentType: string
  extractedAt: string
  vendorName?: string
  vendorGstin?: string
  quoteNumber?: string
  quoteDate?: string
  validUntil?: string
  items: ExtractedItem[]
  totalAmount: number
  overallConfidence: number
  rawText?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiError {
  message: string
  code?: string
  details?: Record<string, string[]>
}
