'use client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
export default function NewIndentPage() {
  const router = useRouter()
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Create New Indent</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Project</Label><Input placeholder="Select project" /></div>
          <div><Label>Department</Label><Input placeholder="Enter department" /></div>
          <div><Label>Required By Date</Label><Input type="date" /></div>
          <div><Label>Priority</Label><Input placeholder="Select priority" /></div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button onClick={() => router.push('/indents')}>Submit Indent</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
