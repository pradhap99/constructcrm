'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, FileText, CheckCircle, Edit3, Send, Download, Brain, Loader2, Star, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn, formatCurrency } from '@/lib/utils'
import { documents as docsApi } from '@/lib/api'
import type { DocumentExtractedData, DocumentItem, DocumentStatusEvent } from '@/lib/types'
import { toast } from 'sonner'

const STEPS = ['Upload', 'AI Extraction', 'Review & Edit', 'Commit to PO']

// Editable item (adds id + isEdited to DocumentItem)
interface EditableItem extends DocumentItem {
  _id: string
  isEdited: boolean
}

function toEditable(items: DocumentItem[]): EditableItem[] {
  return items.map((it, i) => ({ ...it, _id: String(i), isEdited: false }))
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  return (
    <span className={cn(
      'text-xs font-bold px-2 py-0.5 rounded-full',
      pct >= 90 ? 'bg-green-100 text-green-700' : pct >= 75 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
    )}>
      {pct}%
    </span>
  )
}

function StatusPulse({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    uploaded:   { color: 'bg-slate-400',  label: 'Queued'      },
    processing: { color: 'bg-indigo-500', label: 'Processing…' },
    done:       { color: 'bg-green-500',  label: 'Done'        },
    failed:     { color: 'bg-red-500',    label: 'Failed'      },
  }
  const cfg = map[status] ?? map.uploaded
  return (
    <div className="flex items-center gap-2">
      <span className={cn('inline-block w-2 h-2 rounded-full', cfg.color, status === 'processing' && 'animate-pulse')} />
      <span className="text-sm text-muted-foreground">{cfg.label}</span>
    </div>
  )
}

export default function AIReaderPage() {
  const [step, setStep]           = useState(0)
  const [uploading, setUploading] = useState(false)
  const [docStatus, setDocStatus] = useState<string>('')
  const [docId, setDocId]         = useState<string | null>(null)
  const [excelUrl, setExcelUrl]   = useState<string | null>(null)
  const [extracted, setExtracted] = useState<DocumentExtractedData | null>(null)
  const [items, setItems]         = useState<EditableItem[]>([])
  const [fileName, setFileName]   = useState('')
  const [error, setError]         = useState<string | null>(null)
  const fileRef  = useRef<HTMLInputElement>(null)
  const esRef    = useRef<EventSource | null>(null)

  // Clean up SSE on unmount
  useEffect(() => () => esRef.current?.close(), [])

  const openSSE = useCallback((id: string) => {
    if (esRef.current) esRef.current.close()
    const url = docsApi.statusUrl(id)
    const es = new EventSource(url)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const data: DocumentStatusEvent = JSON.parse(e.data)
        setDocStatus(data.status)

        if (data.status === 'done' && data.extracted_data) {
          setExtracted(data.extracted_data)
          setItems(toEditable(data.extracted_data.items ?? []))
          if (data.excel_url) setExcelUrl(data.excel_url)
          setUploading(false)
          setStep(2)
          es.close()
          toast.success('AI extraction complete!', { description: `${data.extracted_data.items?.length ?? 0} items extracted` })
        }

        if (data.status === 'failed') {
          setError(data.error_message ?? 'Processing failed')
          setUploading(false)
          es.close()
          toast.error('Extraction failed', { description: data.error_message ?? undefined })
        }
      } catch { /* ignore parse errors */ }
    }
    es.onerror = () => {
      es.close()
      setUploading(false)
    }
  }, [])

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setUploading(true)
    setError(null)
    setExtracted(null)
    setItems([])
    setExcelUrl(null)
    setStep(1)

    try {
      const res = await docsApi.upload(file)
      const id = res.data.id
      setDocId(id)
      setDocStatus(res.data.status)
      openSSE(id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
      setUploading(false)
      toast.error('Upload failed', { description: msg })
    }
  }, [openSSE])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const updateItem = (id: string, field: keyof DocumentItem, value: string | number) => {
    setItems(prev => prev.map(it =>
      it._id === id ? { ...it, [field]: value, isEdited: true } : it
    ))
  }

  const reset = () => {
    esRef.current?.close()
    setStep(0); setDocId(null); setDocStatus(''); setExtracted(null)
    setItems([]); setExcelUrl(null); setError(null); setUploading(false)
  }

  const minRate = items.length ? Math.min(...items.map(i => i.rate)) : 0
  const maxRate = items.length ? Math.max(...items.map(i => i.rate)) : 0
  const totalAmount = items.reduce((s, i) => s + i.quantity * i.rate * (1 + i.gst_percent / 100), 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
          <Brain className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            AI Draft Reader
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-0">
              <Star className="w-3 h-3 mr-1" /> STAR FEATURE
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground">Upload vendor quotations — Claude AI extracts BOQ line items automatically</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 bg-card border rounded-lg p-4">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
              i < step ? 'bg-green-500 text-white' : i === step ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground'
            )}>
              {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn('text-sm hidden sm:block', i === step ? 'font-semibold' : 'text-muted-foreground')}>{s}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-0.5 bg-muted ml-2" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-280px)]">
        {/* LEFT: Upload + Document info */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {step === 0 && (
            <Card className="flex-1 flex flex-col">
              <CardContent className="flex-1 flex flex-col items-center justify-center p-8">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all min-h-[300px] border-muted-foreground/30 hover:border-indigo-400 hover:bg-muted/50"
                >
                  <Upload className="w-12 h-12 text-indigo-400" />
                  <div className="text-center">
                    <p className="font-semibold text-lg">Drop vendor quotation here</p>
                    <p className="text-muted-foreground text-sm mt-1">PDF, Excel, Word, or text files</p>
                  </div>
                  <Button variant="outline" type="button">Browse Files</Button>
                  <input ref={fileRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.docx,.txt,.csv" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
                </div>
                <div className="mt-4 flex gap-2 flex-wrap justify-center">
                  {['PDF', 'Excel', 'Word', 'TXT', 'CSV'].map(t => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {step >= 1 && (
            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="pb-2 flex-row items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-500" />
                <CardTitle className="text-sm font-medium truncate flex-1">{fileName}</CardTitle>
                {docStatus && <StatusPulse status={docStatus} />}
              </CardHeader>
              <CardContent className="flex-1 overflow-auto space-y-3">
                {uploading && (
                  <div className="flex flex-col items-center gap-4 py-12">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                    <p className="font-medium">Claude AI is extracting BOQ data…</p>
                    <Progress value={65} className="w-48" />
                    <p className="text-xs text-muted-foreground">This usually takes 10–30 seconds</p>
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg text-red-600">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
                {extracted && !uploading && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Vendor</p>
                        <p className="font-medium">{extracted.vendor_name ?? '—'}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">GSTIN</p>
                        <p className="font-mono text-xs">{extracted.vendor_gstin ?? '—'}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Quote No.</p>
                        <p className="font-medium">{extracted.quote_number ?? '—'}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Valid Until</p>
                        <p className="font-medium">{extracted.valid_until ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950 rounded-lg p-3">
                      <span className="text-sm font-medium">AI Confidence</span>
                      <div className="flex items-center gap-2">
                        <Progress value={(extracted.overall_confidence ?? 0) * 100} className="w-24 h-2" />
                        <ConfidenceBadge value={extracted.overall_confidence ?? 0} />
                      </div>
                    </div>
                    {excelUrl && (
                      <a href={excelUrl} download>
                        <Button variant="outline" size="sm" className="w-full gap-2 text-green-700 border-green-300 hover:bg-green-50">
                          <Download className="w-3 h-3" /> Download Excel (BOQ Extract)
                        </Button>
                      </a>
                    )}
                    <Button variant="outline" size="sm" className="w-full" onClick={reset}>
                      Upload Another File
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT: Extracted Items Table */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm">
                {step < 2 ? 'Extracted Items' : `Extracted Items (${items.length})`}
              </CardTitle>
              {step >= 2 && excelUrl && (
                <a href={excelUrl} download>
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    <Download className="w-3 h-3" /> Export Excel
                  </Button>
                </a>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              {step < 2 && !uploading && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-8">
                  <Edit3 className="w-10 h-10 opacity-30" />
                  <p className="text-sm">Upload a document to see extracted items</p>
                </div>
              )}
              {uploading && (
                <div className="flex flex-col items-center justify-center h-full gap-2 p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="text-sm text-muted-foreground">Claude is reading your document…</p>
                </div>
              )}
              {step >= 2 && items.length > 0 && (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Description</th>
                        <th className="px-3 py-2 text-center font-medium">Unit</th>
                        <th className="px-3 py-2 text-right font-medium">Qty</th>
                        <th className="px-3 py-2 text-right font-medium">Rate (₹)</th>
                        <th className="px-3 py-2 text-center font-medium">GST%</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const isL1 = item.rate === minRate
                        const isH1 = item.rate === maxRate && minRate !== maxRate
                        const total = item.quantity * item.rate * (1 + item.gst_percent / 100)
                        return (
                          <tr key={item._id} className={cn(
                            'border-b transition-colors',
                            isL1 ? 'bg-green-50 dark:bg-green-950' : isH1 ? 'bg-red-50 dark:bg-red-950' : 'hover:bg-muted/50'
                          )}>
                            <td className="px-3 py-2">
                              <input
                                className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1"
                                value={item.description}
                                onChange={e => updateItem(item._id, 'description', e.target.value)}
                              />
                              {item.section && <span className="text-muted-foreground text-[10px]">{item.section}</span>}
                              {item.isEdited && <span className="text-indigo-400 text-[10px] ml-1">✎</span>}
                            </td>
                            <td className="px-3 py-2 text-center">{item.unit}</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                className="w-16 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 text-right"
                                value={item.quantity}
                                onChange={e => updateItem(item._id, 'quantity', parseFloat(e.target.value))}
                              />
                            </td>
                            <td className={cn('px-3 py-2 text-right font-medium', isL1 ? 'text-green-700' : isH1 ? 'text-red-700' : '')}>
                              <input
                                type="number"
                                className="w-20 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 text-right"
                                value={item.rate}
                                onChange={e => updateItem(item._id, 'rate', parseFloat(e.target.value))}
                              />
                              {isL1 && <span className="ml-1 text-[10px] font-bold text-green-600">L1</span>}
                              {isH1 && <span className="ml-1 text-[10px] font-bold text-red-600">H1</span>}
                            </td>
                            <td className="px-3 py-2 text-center">{item.gst_percent}%</td>
                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(total)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-muted font-semibold">
                      <tr>
                        <td colSpan={5} className="px-3 py-2 text-right">Grand Total (incl. GST):</td>
                        <td className="px-3 py-2 text-right text-indigo-600">{formatCurrency(totalAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {step >= 2 && (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={reset}>
                Start Over
              </Button>
              <Button
                className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  setStep(3)
                  toast.success('PO created!', { description: `Generated from ${fileName}` })
                }}
              >
                <Send className="w-4 h-4" /> Commit & Create PO
              </Button>
            </div>
          )}

          {step === 3 && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-200">Purchase Order Created!</p>
                  <p className="text-xs text-green-600">PO generated from AI extraction · {items.length} line items</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
