'use client'
import Link from 'next/link'
import { ArrowLeft, Printer, FileText, CheckCircle2, Clock, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'

const MOCK_INDENT = {
  id: 'IND-2024-001',
  title: 'TMT Steel Bars for Pier Foundation',
  project: 'Pune Metro Phase 3',
  department: 'Civil - Structural',
  requestedBy: 'Ramesh Iyer',
  approvedBy: 'Sunita Patil (Site Manager)',
  priority: 'urgent',
  status: 'approved',
  requestDate: '2024-01-08',
  requiredBy: '2024-01-20',
  approvalDate: '2024-01-10',
  remarks: 'Required for Pier P12 construction. Urgently needed as concrete pour scheduled for Jan 22.',
  items: [
    { id: '1', itemCode: 'TMT-500-12', description: 'TMT Fe500 Grade 12mm dia bars', unit: 'MT', quantity: 15, estimatedRate: 68000, estimatedAmount: 1020000, specification: 'IS:1786, Fe500D grade' },
    { id: '2', itemCode: 'TMT-500-16', description: 'TMT Fe500 Grade 16mm dia bars', unit: 'MT', quantity: 22, estimatedRate: 68500, estimatedAmount: 1507000, specification: 'IS:1786, Fe500D grade' },
    { id: '3', itemCode: 'TMT-500-20', description: 'TMT Fe500 Grade 20mm dia bars', unit: 'MT', quantity: 18, estimatedRate: 69000, estimatedAmount: 1242000, specification: 'IS:1786, Fe500D grade' },
  ],
}

const TIMELINE = [
  { date: 'Jan 08', event: 'Indent created by Ramesh Iyer', icon: FileText, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
  { date: 'Jan 09', event: 'Sent for approval to Sunita Patil', icon: Send, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30' },
  { date: 'Jan 10', event: 'Approved by Sunita Patil', icon: CheckCircle2, color: 'text-green-600 bg-green-50 dark:bg-green-900/30' },
  { date: 'Jan 11', event: 'RFQ initiated (pending)', icon: Clock, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30' },
]

export default function IndentDetailPage() {
  const indent = MOCK_INDENT
  const totalAmount = indent.items.reduce((sum, item) => sum + item.estimatedAmount, 0)

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link href="/indents">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Indents
          </Button>
        </Link>
      </div>

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold font-mono">{indent.id}</h2>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(indent.status)}`}
            >
              {indent.status.replace(/_/g, ' ')}
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${getPriorityColor(indent.priority)}`}
            >
              {indent.priority} priority
            </span>
          </div>
          <p className="text-muted-foreground">{indent.title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => alert('Generate RFQ — coming soon!')}
          >
            <FileText className="w-4 h-4" />
            Generate RFQ
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
      </div>

      {/* 3 info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Project & People */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Project Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Project</p>
              <p className="font-medium">{indent.project}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Department</p>
              <p className="font-medium">{indent.department}</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Requested By</p>
              <p className="font-medium">{indent.requestedBy}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Approved By</p>
              <p className="font-medium">{indent.approvedBy}</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Dates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Request Date</p>
              <p className="font-medium">{formatDate(indent.requestDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Required By</p>
              <p className="font-medium text-orange-600 dark:text-orange-400">{formatDate(indent.requiredBy)}</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Approval Date</p>
              <p className="font-medium text-green-600 dark:text-green-400">{formatDate(indent.approvalDate)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Priority, Status, Remarks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Status & Remarks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground w-16">Priority</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(indent.priority)}`}>
                {indent.priority}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground w-16">Status</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(indent.status)}`}>
                {indent.status}
              </span>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Remarks</p>
              <p className="text-sm text-foreground line-clamp-3">{indent.remarks}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Item Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Specification</TableHead>
              <TableHead className="w-[60px]">Unit</TableHead>
              <TableHead className="w-[70px] text-right">Qty</TableHead>
              <TableHead className="w-[120px] text-right">Est. Rate</TableHead>
              <TableHead className="w-[140px] text-right">Est. Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {indent.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-sm">{item.itemCode}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{item.specification}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.estimatedRate)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(item.estimatedAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Table footer total */}
        <div className="flex justify-end items-center gap-4 px-6 py-4 border-t bg-muted/30">
          <span className="text-sm font-medium text-muted-foreground">Total Estimated Amount</span>
          <span className="text-lg font-bold text-foreground">{formatCurrency(totalAmount)}</span>
        </div>
      </Card>

      {/* Audit Trail / Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative border-l border-border ml-3 space-y-6">
            {TIMELINE.map((entry, idx) => {
              const Icon = entry.icon
              return (
                <li key={idx} className="ml-6">
                  <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ${entry.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <span className="text-xs font-semibold text-muted-foreground w-14 shrink-0">{entry.date}</span>
                    <p className="text-sm text-foreground">{entry.event}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
