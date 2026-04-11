'use client'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
export default function IndentDetailPage() {
  const params = useParams()
  const router = useRouter()
  return (
    <div>
      <Button variant="outline" onClick={() => router.back()} className="mb-4">← Back</Button>
      <Card>
        <CardHeader><CardTitle>Indent {params.id}</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">Indent details for ID: {params.id}</p></CardContent>
      </Card>
    </div>
  )
}
