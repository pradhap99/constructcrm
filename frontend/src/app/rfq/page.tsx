"use client"
import { useState } from "react"
import { Plus, List, LayoutGrid, Calendar, Users, Package } from "lucide-react"
import { cn } from "@/lib/utils"

const STAGES = ["Draft","Sent to Vendors","Quotes Received","Compared","PO Raised"] as const
type Stage = typeof STAGES[number]

interface RFQCard {
  id: string; rfqNumber: string; project: string; vendorCount: number
  deadline: string; itemCount: number; stage: Stage
}

const DEMO: RFQCard[] = [
  { id:"1", rfqNumber:"RFQ-2024-001", project:"Phoenix Commercial Tower", vendorCount:4, deadline:"2024-02-15", itemCount:12, stage:"Draft" },
  { id:"2", rfqNumber:"RFQ-2024-002", project:"Green Valley Residential", vendorCount:3, deadline:"2024-02-10", itemCount:8, stage:"Sent to Vendors" },
  { id:"3", rfqNumber:"RFQ-2024-003", project:"Marina Bay Infrastructure", vendorCount:5, deadline:"2024-02-05", itemCount:20, stage:"Quotes Received" },
  { id:"4", rfqNumber:"RFQ-2024-004", project:"Phoenix Commercial Tower", vendorCount:3, deadline:"2024-01-28", itemCount:6, stage:"Compared" },
  { id:"5", rfqNumber:"RFQ-2024-005", project:"Green Valley Residential", vendorCount:4, deadline:"2024-01-20", itemCount:15, stage:"PO Raised" },
  { id:"6", rfqNumber:"RFQ-2024-006", project:"Marina Bay Infrastructure", vendorCount:2, deadline:"2024-02-20", itemCount:9, stage:"Sent to Vendors" },
]

const STAGE_COLORS: Record<Stage, string> = {
  "Draft": "bg-gray-100 border-gray-300",
  "Sent to Vendors": "bg-blue-50 border-blue-300",
  "Quotes Received": "bg-amber-50 border-amber-300",
  "Compared": "bg-purple-50 border-purple-300",
  "PO Raised": "bg-green-50 border-green-300",
}

export default function RFQPage() {
  const [view, setView] = useState<"kanban"|"list">("kanban")
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RFQ Management</h1>
          <p className="text-gray-500 text-sm mt-1">Request for Quotation pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border rounded-lg overflow-hidden">
            <button onClick={()=>setView("kanban")} className={cn("px-3 py-2",view==="kanban"?"bg-blue-600 text-white":"bg-white text-gray-600")}><LayoutGrid className="w-4 h-4"/></button>
            <button onClick={()=>setView("list")} className={cn("px-3 py-2",view==="list"?"bg-blue-600 text-white":"bg-white text-gray-600")}><List className="w-4 h-4"/></button>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4"/> Create RFQ
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const cards = DEMO.filter(r=>r.stage===stage)
            return (
              <div key={stage} className="flex-shrink-0 w-72">
                <div className={cn("rounded-t-lg border-2 border-b-0 px-4 py-2 font-semibold text-sm",STAGE_COLORS[stage])}>
                  {stage} <span className="ml-2 bg-white rounded-full px-2 text-xs">{cards.length}</span>
                </div>
                <div className={cn("border-2 border-t-0 rounded-b-lg min-h-[400px] p-2 space-y-2",STAGE_COLORS[stage])}>
                  {cards.map(c=>(
                    <div key={c.id} className="bg-white rounded-lg border shadow-sm p-4 space-y-2 cursor-pointer hover:shadow-md transition-shadow">
                      <div className="font-semibold text-sm text-blue-600">{c.rfqNumber}</div>
                      <div className="text-gray-800 text-sm font-medium">{c.project}</div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3"/>{c.vendorCount} vendors</span>
                        <span className="flex items-center gap-1"><Package className="w-3 h-3"/>{c.itemCount} items</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-red-500">
                        <Calendar className="w-3 h-3"/> Due: {c.deadline}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>{["RFQ #","Project","Stage","Vendors","Items","Deadline"].map(h=><th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {DEMO.map(r=>(
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-blue-600 font-medium">{r.rfqNumber}</td>
                  <td className="px-4 py-3 text-gray-800">{r.project}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">{r.stage}</span></td>
                  <td className="px-4 py-3">{r.vendorCount}</td>
                  <td className="px-4 py-3">{r.itemCount}</td>
                  <td className="px-4 py-3 text-red-500">{r.deadline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
