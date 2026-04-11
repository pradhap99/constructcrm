'use client'
import { useState } from 'react'
import { Plus, Check, X, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import type { Indent } from '@/lib/types'

const MOCK_INDENTS: Indent[] = [
  { id: '1', indentNumber: 'IND-2024-001', projectId: 'p1', projectName: 'NH-48 Highway Expansion', requestedBy: 'Rahul Sharma', department: 'Civil', priority: 'high', requiredByDate: '2024-02-01', status: 'pending_approval', items: [], totalAmount: 450000, createdAt: '2024-01-10T00:00:00Z', updatedAt: '2024-01-10T00:00:00Z' },
  { id: '2', indentNumber: 'IND-2024-002', projectId: 'p2', projectName: 'Metro Station B4', requestedBy: 'Priya Patel', department: 'Structural', priority: 'urgent', requiredByDate: '2024-01-28', status: 'approved', items: [], totalAmount: 1200000, approvedBy: 'DGM Procurement', createdAt: '2024-01-08T00:00:00Z', updatedAt: '2024-01-09T00:00:00Z' },
  { id: '3', indentNumber: 'IND-2024-003', projectId: 'p1', projectName: 'NH-48 Highway Expansion', requestedBy: 'Amit Kumar', department: 'Electrical', priority: 'medium', requiredByDate: '2024-02-15', status: 'draft', items: [], totalAmount: 85000, createdAt: '2024-01-12T00:00:00Z', updatedAt: '2024-01-12T00:00:00Z' },
  { id: '4', indentNumber: 'IND-2024-004', projectId: 'p3', projectName: 'Bridge Construction', requestedBy: 'Sneha Reddy', department: 'Civil', priority: 'low', requiredByDate: '2024-03-01', status: 'rejected', items: [], totalAmount: 32000, remarks: 'Budget exceeded', createdAt: '2024-01-05T00:00:00Z', updatedAt: '2024-01-07T00:00:00Z' },
]

const priorityColor: Record<string, string> = { low: 'secondary', medium: 'info', high: 'warning', urgent: 'destructive' }

export default function IndentsPage() {
  const [indents, setIndents] = useState(MOCK_INDENTS)
  const [tab, setTab] = useState('all')

  const stats = {
    total: indents.length,
    pending: indents.filter(i => i.status === 'pending_approval').length,
    approved: indents.filter(i => i.status === 'approved').length,
    rejected: indents.filter(i => i.status === 'rejected').length,
  }

  const filtered = tab === 'all' ? indents : indents.filter(i => i.status === tab || (tab === 'pending' && i.status === 'pending_approval'))

  const approve = (id: string) => setIndents(prev => prev.map(i => i.id === id ? { ...i, status: 'approved' as const, approvedBy: 'Current User' } : i))
  const reject = (id: string) => setIndents(prev => prev.map(i => i.id === id ? { ...i, status: 'rejected' as const } : i))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Indents / Purchase Requests</h2>
          <p className="text-muted-foreground text-sm">Manage material requisitions across projects</p>
        </div>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Create Indent</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-blue-600' },
          { label: 'Pending Approval', value: stats.pending, color: 'text-yellow-600' },
          { label: 'Approved', value: stats.approved, color: 'text-green-600' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indent #</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Required By</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(indent => (
                  <TableRow key={indent.id}>
                    <TableCell className="font-mono font-medium">{indent.indentNumber}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{indent.projectName}</TableCell>
                    <TableCell>{indent.requestedBy}</TableCell>
                    <TableCell>
                      <Badge variant={priorityColor[indent.priority] as 'secondary' | 'info' | 'warning' | 'destructive'}>{indent.priority}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(indent.requiredByDate)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(indent.totalAmount)}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(indent.status)}`}>
                        {indent.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {indent.status === 'pending_approval' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 h-7 w-7 p-0" onClick={() => approve(indent.id)}><Check className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 h-7 w-7 p-0" onClick={() => reject(indent.id)}><X className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
