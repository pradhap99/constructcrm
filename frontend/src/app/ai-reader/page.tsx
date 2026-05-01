'use client'
import { useState, useCallback, useRef } from 'react'
import {
  FileText, Brain, Loader2, Download, CheckCircle,
  X, Plus, Sparkles, AlertCircle, FileUp, Copy, RotateCcw,
  FileSpreadsheet, FileType,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────────────────────
interface UploadedFile {
  file: File
  id: string
}

interface TextResult {
  kind: 'text'
  filled_text: string
  vendor_count: number
  vendor_names: string[]
  template_name: string
  provider: string
  used_ai: boolean
}

interface FileResult {
  kind: 'file'
  blob: Blob
  filename: string
  vendor_count: number
  vendor_names: string[]
  template_name: string
  provider: string
  mimeType: string
}

type FillResult = TextResult | FileResult

// ── Helpers ───────────────────────────────────────────────────────────────────
function getExt(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function isExcel(name: string) {
  return ['xlsx', 'xls'].includes(getExt(name))
}

function isWord(name: string) {
  return ['docx', 'doc'].includes(getExt(name))
}

function providerLabel(p: string) {
  if (p === 'gemini') return 'Google Gemini'
  if (p === 'groq') return 'Groq / Llama 3'
  if (p === 'anthropic') return 'Claude AI'
  return p
}

// ── File chip ─────────────────────────────────────────────────────────────────
function FileChip({ name, onRemove }: { name: string; onRemove: () => void }) {
  const ext = name.split('.').pop()?.toUpperCase() ?? 'FILE'
  const extColors: Record<string, string> = {
    PDF: 'bg-red-100 text-red-700',
    DOCX: 'bg-blue-100 text-blue-700',
    DOC: 'bg-blue-100 text-blue-700',
    XLSX: 'bg-green-100 text-green-700',
    XLS: 'bg-green-100 text-green-700',
    CSV: 'bg-orange-100 text-orange-700',
    TXT: 'bg-slate-100 text-slate-700',
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-lg group hover:border-indigo-300 transition-colors">
      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', extColors[ext] ?? 'bg-slate-100 text-slate-700')}>
        {ext}
      </span>
      <span className="text-sm truncate max-w-[160px]" title={name}>{name}</span>
      <button onClick={onRemove} className="ml-auto text-muted-foreground hover:text-red-500 transition-colors shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Drop zone ─────────────────────────────────────────────────────────────────
function DropZone({
  label, subLabel, accept, multiple, onFiles, active, disabled,
}: {
  label: string
  subLabel: string
  accept: string
  multiple: boolean
  onFiles: (files: File[]) => void
  active?: boolean
  disabled?: boolean
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onFiles(multiple ? files : [files[0]])
  }, [onFiles, multiple, disabled])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer min-h-[140px]',
        dragging ? 'border-indigo-400 bg-indigo-50/60 scale-[1.01]' : 'border-muted-foreground/25',
        active ? 'border-indigo-400 bg-indigo-50/40' : 'hover:border-indigo-300 hover:bg-muted/40',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <div className={cn('p-3 rounded-xl', active ? 'bg-indigo-100' : 'bg-muted')}>
        <FileUp className={cn('w-6 h-6', active ? 'text-indigo-600' : 'text-muted-foreground')} />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subLabel}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) onFiles(multiple ? files : [files[0]])
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const ACCEPTED = '.pdf,.docx,.doc,.xlsx,.xls,.txt,.csv,.md'

export default function AIReaderPage() {
  const [vendorFiles, setVendorFiles] = useState<UploadedFile[]>([])
  const [templateFile, setTemplateFile] = useState<UploadedFile | null>(null)
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FillResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const addVendorFiles = (files: File[]) => {
    setVendorFiles(prev => [
      ...prev,
      ...files.map(f => ({ file: f, id: Math.random().toString(36).slice(2) })),
    ])
  }

  const removeVendor = (id: string) =>
    setVendorFiles(prev => prev.filter(f => f.id !== id))

  const setTemplate = (files: File[]) => {
    if (files[0]) setTemplateFile({ file: files[0], id: 'template' })
  }

  const reset = () => {
    setVendorFiles([])
    setTemplateFile(null)
    setInstructions('')
    setResult(null)
    setError(null)
  }

  const canProcess = vendorFiles.length > 0 && templateFile !== null && !loading

  const processDocuments = async () => {
    if (!canProcess) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const fd = new FormData()
      vendorFiles.forEach(f => fd.append('vendor_docs', f.file, f.file.name))
      fd.append('template', templateFile!.file, templateFile!.file.name)
      if (instructions.trim()) fd.append('instructions', instructions.trim())

      // Get the auth token from localStorage (same key used by apiClient)
      const token = localStorage.getItem('auth_token') || ''

      // Use fetch directly so we can handle both blob and JSON responses
      // NEXT_PUBLIC_API_URL already includes /api/v1 (e.g. http://localhost:8000/api/v1)
      const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '')
      const res = await fetch(`${apiBase}/ai-reader/fill`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
        signal: AbortSignal.timeout(120_000),
      })

      if (!res.ok) {
        let detail = `Server error ${res.status}`
        try {
          const json = await res.json()
          detail = json.detail ?? detail
        } catch {}
        throw new Error(detail)
      }

      const contentType = res.headers.get('content-type') ?? ''
      const disposition = res.headers.get('content-disposition') ?? ''
      const provider = res.headers.get('x-provider') ?? 'unknown'
      const vendorCount = parseInt(res.headers.get('x-vendor-count') ?? '0', 10)

      // Extract filename from Content-Disposition header
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch?.[1] ?? `filled_${templateFile!.file.name}`

      if (
        contentType.includes('spreadsheet') ||
        contentType.includes('excel') ||
        contentType.includes('wordprocessingml') ||
        contentType.includes('msword') ||
        disposition.includes('attachment')
      ) {
        // ── Binary file response (Excel or Word) ──────────────────────────
        const blob = await res.blob()
        const vendorNames = vendorFiles.map(f => f.file.name)

        setResult({
          kind: 'file',
          blob,
          filename,
          vendor_count: vendorCount || vendorFiles.length,
          vendor_names: vendorNames,
          template_name: templateFile!.file.name,
          provider,
          mimeType: contentType,
        })
        toast.success('Template filled!', {
          description: `Filled from ${vendorFiles.length} vendor doc(s) — ready to download`,
        })
      } else {
        // ── JSON text response ────────────────────────────────────────────
        const json = await res.json()
        setResult({
          kind: 'text',
          filled_text: json.filled_text ?? '',
          vendor_count: json.vendor_count ?? vendorFiles.length,
          vendor_names: json.vendor_names ?? vendorFiles.map(f => f.file.name),
          template_name: json.template_name ?? templateFile!.file.name,
          provider: json.provider ?? provider,
          used_ai: json.used_ai ?? false,
        })
        toast.success('Done!', {
          description: `Filled template from ${json.vendor_count} vendor doc(s)`,
        })
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Processing failed'
      setError(msg)
      toast.error('Processing failed', { description: msg })
    } finally {
      setLoading(false)
    }
  }

  // Download a file-type result
  const downloadFile = () => {
    if (!result || result.kind !== 'file') return
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded!', { description: result.filename })
  }

  // Copy text result
  const copyResult = () => {
    if (!result || result.kind !== 'text') return
    navigator.clipboard.writeText(result.filled_text)
    toast.success('Copied to clipboard')
  }

  // Download text result as plain text file
  const downloadText = () => {
    if (!result || result.kind !== 'text') return
    const blob = new Blob([result.filled_text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `filled_${result.template_name ?? 'result.txt'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Icon for template type
  const TemplateIcon = templateFile
    ? isExcel(templateFile.file.name)
      ? FileSpreadsheet
      : isWord(templateFile.file.name)
        ? FileType
        : FileText
    : FileText

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-amber-100 rounded-xl">
          <Brain className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            AI Draft Reader
            <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
              <Sparkles className="w-2.5 h-2.5 mr-1" />AI POWERED
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload vendor documents and a result template — AI reads and fills it automatically
          </p>
        </div>
      </div>

      <div className={cn(
        'grid gap-6',
        result ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-3xl',
      )}>

        {/* ── LEFT: Inputs ──────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Vendor docs zone */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">1</div>
                  Vendor Documents
                  {vendorFiles.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{vendorFiles.length} file{vendorFiles.length > 1 ? 's' : ''}</Badge>
                  )}
                </CardTitle>
                {vendorFiles.length > 0 && (
                  <button
                    onClick={() => setVendorFiles([])}
                    className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <DropZone
                label="Drop vendor documents here"
                subLabel="PDF, Word, Excel, CSV, TXT · Multiple files allowed"
                accept={ACCEPTED}
                multiple={true}
                onFiles={addVendorFiles}
                active={vendorFiles.length > 0}
                disabled={loading}
              />
              {vendorFiles.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {vendorFiles.map(f => (
                    <FileChip
                      key={f.id}
                      name={f.file.name}
                      onRemove={() => removeVendor(f.id)}
                    />
                  ))}
                  <button
                    onClick={() => {
                      const inp = document.createElement('input')
                      inp.type = 'file'
                      inp.multiple = true
                      inp.accept = ACCEPTED
                      inp.onchange = (e) => {
                        const files = Array.from((e.target as HTMLInputElement).files ?? [])
                        addVendorFiles(files)
                      }
                      inp.click()
                    }}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium px-3 py-2 transition-colors"
                    disabled={loading}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add more files
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Template zone */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold">2</div>
                Result Template
                <span className="text-xs text-muted-foreground font-normal">— the format you want filled</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!templateFile ? (
                <DropZone
                  label="Drop your result template here"
                  subLabel="Single file · Excel → returns Excel · Word → returns Word"
                  accept={ACCEPTED}
                  multiple={false}
                  onFiles={setTemplate}
                  disabled={loading}
                />
              ) : (
                <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                  <div className="p-2 bg-teal-100 rounded-lg shrink-0">
                    <TemplateIcon className="w-4 h-4 text-teal-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{templateFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(templateFile.file.size / 1024).toFixed(0)} KB
                      {isExcel(templateFile.file.name) && ' · Will return filled Excel file'}
                      {isWord(templateFile.file.name) && ' · Will return filled Word document'}
                    </p>
                  </div>
                  <button
                    onClick={() => setTemplateFile(null)}
                    disabled={loading}
                    className="text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Optional instructions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-slate-400 text-white flex items-center justify-center text-[10px] font-bold">3</div>
                Instructions
                <span className="text-xs text-muted-foreground font-normal">— optional</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                disabled={loading}
                placeholder='e.g. "Focus on unit rates only" or "Compare prices across vendors" or "Extract only items with GST above 18%"'
                className="w-full h-20 text-sm px-3 py-2.5 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-muted-foreground/60 disabled:opacity-50"
              />
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-3">
            {(vendorFiles.length > 0 || templateFile || result) && (
              <Button variant="outline" className="gap-2" onClick={reset} disabled={loading}>
                <RotateCcw className="w-4 h-4" /> Reset
              </Button>
            )}
            <Button
              className={cn(
                'flex-1 gap-2 font-semibold',
                canProcess
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
              disabled={!canProcess}
              onClick={processDocuments}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI is reading your documents…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {vendorFiles.length === 0 || !templateFile
                    ? 'Upload files to continue'
                    : `Fill Template with ${vendorFiles.length} Document${vendorFiles.length > 1 ? 's' : ''}`}
                </>
              )}
            </Button>
          </div>

          {/* Requirements hint */}
          {(vendorFiles.length === 0 || !templateFile) && !loading && !result && (
            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground px-1">
              <div className={cn('flex items-center gap-2', vendorFiles.length > 0 && 'text-green-600')}>
                {vendorFiles.length > 0 ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current" />}
                {vendorFiles.length > 0 ? `${vendorFiles.length} vendor doc(s) ready` : 'Add at least one vendor document'}
              </div>
              <div className={cn('flex items-center gap-2', templateFile && 'text-green-600')}>
                {templateFile ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current" />}
                {templateFile ? 'Template ready' : 'Add a result template'}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Result ──────────────────────────────────────────────── */}
        {result && (
          <div className="space-y-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Filled Template
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-[9px]">
                      <Sparkles className="w-2.5 h-2.5 mr-1" />
                      {providerLabel(result.provider)}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Filled from {result.vendor_count} vendor doc{result.vendor_count > 1 ? 's' : ''}{' '}
                    into <span className="font-medium">{result.template_name}</span>
                  </p>
                </div>

                {/* Action buttons differ by result type */}
                {result.kind === 'file' ? (
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white shrink-0"
                    onClick={downloadFile}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download{' '}
                    {isExcel(result.filename) ? 'Excel' : isWord(result.filename) ? 'Word' : 'File'}
                  </Button>
                ) : (
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={copyResult}>
                      <Copy className="w-3 h-3" /> Copy
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs text-green-700 border-green-300 hover:bg-green-50" onClick={downloadText}>
                      <Download className="w-3 h-3" /> Download
                    </Button>
                  </div>
                )}
              </CardHeader>

              {/* Source doc badges */}
              <div className="px-6 pb-3 flex flex-wrap gap-1.5">
                {result.vendor_names.map((name) => (
                  <span key={name} className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium truncate max-w-[180px]" title={name}>
                    {name}
                  </span>
                ))}
              </div>

              <CardContent className="flex-1 p-0">
                {result.kind === 'file' ? (
                  /* ── File result: show download card ── */
                  <div className="flex flex-col items-center justify-center gap-4 p-10 bg-slate-50 rounded-b-xl border-t min-h-[200px]">
                    {isExcel(result.filename) ? (
                      <div className="p-4 bg-green-100 rounded-2xl">
                        <FileSpreadsheet className="w-12 h-12 text-green-600" />
                      </div>
                    ) : (
                      <div className="p-4 bg-blue-100 rounded-2xl">
                        <FileType className="w-12 h-12 text-blue-600" />
                      </div>
                    )}
                    <div className="text-center space-y-1">
                      <p className="font-semibold text-base">{result.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        Your filled template is ready — click Download to save it
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(result.blob.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <Button
                      className="gap-2 bg-green-600 hover:bg-green-700 text-white px-6"
                      onClick={downloadFile}
                    >
                      <Download className="w-4 h-4" />
                      Download Filled {isExcel(result.filename) ? 'Excel' : 'Document'}
                    </Button>
                  </div>
                ) : (
                  /* ── Text result: show pre-formatted text ── */
                  <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap p-6 overflow-auto max-h-[600px] bg-slate-50 rounded-b-xl border-t">
                    {result.filled_text}
                  </pre>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
