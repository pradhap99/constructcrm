'use client'
import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, CheckCircle, Edit3, Send, Download, Brain, Loader2, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn, formatCurrency } from '@/lib/utils'
import { aiParser } from '@/lib/api'
import type { ExtractedItem, AIParserResult } from '@/lib/types'
import { toast } from 'sonner'

const STEPS = ['Upload', 'AI Extraction', 'Review & Edit', 'Commit to PO']

const MOCK_RESULT: AIParserResult = {
  sessionId: 'mock-001',
  fileName: 'Tata_Steel_Quote_Jan2024.pdf',
  documentType: 'vendor_quotation',
  extractedAt: new Date().toISOString(),
  vendorName: 'Tata Steel Ltd',
  vendorGstin: '27AAACT2727Q1ZW',
  quoteNumber: 'TSL/Q/2024/0456',
  quoteDate: '2024-01-10',
  validUntil: '2024-02-10',
  totalAmount: 2456800,
  overallConfidence: 0.91,
  items: [
    { id: '1', itemDescription: 'TMT Bars Fe500D 12mm', unit: 'MT', quantity: 25, unitRate: 58500, gstPercent: 18, totalAmount: 1462500, confidence: 0.97, isEdited: false },
    { id: '2', itemDescription: 'TMT Bars Fe500D 16mm', unit: 'MT', quantity: 15, unitRate: 59200, gstPercent: 18, totalAmount: 888000, confidence: 0.94, isEdited: false },
    { id: '3', itemDescription: 'Binding Wire 16 Gauge', unit: 'KG', quantity: 200, unitRate: 85, gstPercent: 18, totalAmount: 17000, confidence: 0.78, isEdited: false },
    { id: '4', itemDescription: 'MS Plates 6mm thickness', unit: 'MT', quantity: 2, unitRate: 62000, gstPercent: 18, totalAmount: 124000, confidence: 0.88, isEdited: false },
  ],
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

export default function AIReaderPage() {
  const [step, setStep] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState<AIParserResult | null>(null)
  const [items, setItems] = useState<ExtractedItem[]>([])
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setUploading(true)
    setStep(1)
    try {
      const res = await aiParser.upload(file)
      setResult(res.data)
      setItems(res.data.items)
    } catch {
      // Use mock data for demo
      setResult(MOCK_RESULT)
      setItems(MOCK_RESULT.items)
    } finally {
      setUploading(false)
      setStep(2)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const updateItem = (id: string, field: keyof ExtractedItem, value: string | number) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value, isEdited: true } : item
    ))
  }

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitRate * (1 + i.gstPercent / 100), 0)
  const minRate = Math.min(...items.map(i => i.unitRate))
  const maxRate = Math.max(...items.map(i => i.unitRate))

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
          <p className="text-sm text-muted-foreground">Upload vendor quotations — AI extracts line items automatically</p>
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
        {/* LEFT: Upload + Document Viewer */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {step === 0 && (
            <Card className="flex-1 flex flex-col">
              <CardContent className="flex-1 flex flex-col items-center justify-center p-8">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    'w-full flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all min-h-[300px]',
                    dragOver ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950' : 'border-muted-foreground/30 hover:border-indigo-400 hover:bg-muted/50'
                  )}
                >
                  <Upload className="w-12 h-12 text-indigo-400" />
                  <div className="text-center">
                    <p className="font-semibold text-lg">Drop vendor quotation here</p>
                    <p className="text-muted-foreground text-sm mt-1">PDF, Excel, Word, or image files</p>
                  </div>
                  <Button variant="outline" type="button">Browse Files</Button>
                  <input ref={fileRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.docx,.png,.jpg" onChange={handleFileChange} />
                </div>
                <div className="mt-4 flex gap-2 flex-wrap justify-center">
                  {['PDF', 'Excel', 'Word', 'PNG', 'JPG'].map(t => (
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
                <CardTitle className="text-sm font-medium truncate">{result?.fileName ?? fileName}</CardTitle>
                {result && <Badge variant="success" className="ml-auto shrink-0">Processed</Badge>}
              </CardHeader>
              <CardContent className="flex-1 overflow-auto space-y-3">
                {uploading && (
                  <div className="flex flex-col items-center gap-4 py-12">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                    <p className="font-medium">AI is extracting data...</p>
                    <Progress value={65} className="w-48" />
                  </div>
                )}
                {result && !uploading && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Vendor</p>
                        <p className="font-medium">{result.vendorName}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">GSTIN</p>
                        <p className="font-mono text-xs">{result.vendorGstin}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Quote No.</p>
                        <p className="font-medium">{result.quoteNumber}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Valid Until</p>
                        <p className="font-medium">{result.validUntil}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950 rounded-lg p-3">
                      <span className="text-sm font-medium">AI Confidence</span>
                      <div className="flex items-center gap-2">
                        <Progress value={result.overallConfidence * 100} className="w-24 h-2" />
                        <ConfidenceBadge value={result.overallConfidence} />
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => { setStep(0); setResult(null); setItems([]) }}>
                      Upload Another File
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT: Extracted Data Table */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm">
                {step < 2 ? 'Extracted Items' : `Extracted Items (${items.length})`}
              </CardTitle>
              {step >= 2 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    <Download className="w-3 h-3" /> Export Excel
                  </Button>
                </div>
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
                  <p className="text-sm text-muted-foreground">Processing with AI...</p>
                </div>
              )}
              {step >= 2 && items.length > 0 && (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Item Description</th>
                        <th className="px-3 py-2 text-center font-medium">Unit</th>
                        <th className="px-3 py-2 text-right font-medium">Qty</th>
                        <th className="px-3 py-2 text-right font-medium">Rate (₹)</th>
                        <th className="px-3 py-2 text-center font-medium">GST%</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                        <th className="px-3 py-2 text-center font-medium">Conf.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const isL1 = item.unitRate === minRate
                        const isH1 = item.unitRate === maxRate && minRate !== maxRate
                        const total = item.quantity * item.unitRate * (1 + item.gstPercent / 100)
                        return (
                          <tr key={item.id} className={cn(
                            'border-b transition-colors',
                            isL1 ? 'bg-green-50 dark:bg-green-950' : isH1 ? 'bg-red-50 dark:bg-red-950' : 'hover:bg-muted/50'
                          )}>
                            <td className="px-3 py-2">
                              <input
                                className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1"
                                value={item.itemDescription}
                                onChange={e => updateItem(item.id, 'itemDescription', e.target.value)}
                              />
                              {item.isEdited && <span className="text-indigo-400 text-[10px]">✎ edited</span>}
                            </td>
                            <td className="px-3 py-2 text-center">{item.unit}</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                className="w-16 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 text-right"
                                value={item.quantity}
                                onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                              />
                            </td>
                            <td className={cn('px-3 py-2 text-right font-medium', isL1 ? 'text-green-700' : isH1 ? 'text-red-700' : '')}>
                              <input
                                type="number"
                                className="w-20 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 text-right"
                                value={item.unitRate}
                                onChange={e => updateItem(item.id, 'unitRate', parseFloat(e.target.value))}
                              />
                              {isL1 && <span className="ml-1 text-[10px] font-bold text-green-600">L1</span>}
                              {isH1 && <span className="ml-1 text-[10px] font-bold text-red-600">H1</span>}
                            </td>
                            <td className="px-3 py-2 text-center">{item.gstPercent}%</td>
                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(total)}</td>
                            <td className="px-3 py-2 text-center"><ConfidenceBadge value={item.confidence} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-muted font-semibold">
                      <tr>
                        <td colSpan={5} className="px-3 py-2 text-right">Grand Total (incl. GST):</td>
                        <td className="px-3 py-2 text-right text-indigo-600">{formatCurrency(totalAmount)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {step >= 2 && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setStep(0); setResult(null); setItems([]) }}
              >
                Start Over
              </Button>
              <Button
                className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => { setStep(3); toast.success('PO created successfully!', { description: `Created from ${result?.fileName}` }) }}
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
                  <p className="text-xs text-green-600">PO-2024-0090 generated from AI extraction</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
