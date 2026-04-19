"use client"
import { useState } from "react"
import { Search, Plus, Star, MapPin, Phone, Mail } from "lucide-react"
import { cn } from "@/lib/utils"

interface Vendor {
  id: string; name: string; gstin: string; rating: "A+"|"A"|"B"|"C"
  onTimeDelivery: number; rejectionRate: number; totalTransacted: number
  contact: string; city: string; state: string; categories: string[]
  email: string; phone: string; status: "active"|"inactive"
}

const VENDORS: Vendor[] = [
  { id:"1", name:"Shree Lakshmi Steel Suppliers", gstin:"29AADCS1234F1Z5", rating:"A+", onTimeDelivery:96, rejectionRate:0.8, totalTransacted:45000000, contact:"Ramesh Sharma", city:"Mumbai", state:"Maharashtra", categories:["Steel","TMT Bars","Structural Steel"], email:"ramesh@shreelakshmi.com", phone:"+91 98201 12345", status:"active" },
  { id:"2", name:"Raj Cement & Building Materials", gstin:"27AAACR5678G2Z6", rating:"A", onTimeDelivery:91, rejectionRate:1.5, totalTransacted:32000000, contact:"Rajiv Kumar", city:"Chennai", state:"Tamil Nadu", categories:["Cement","Sand","Aggregates"], email:"rajiv@rajcement.com", phone:"+91 97890 23456", status:"active" },
  { id:"3", name:"Modern Hardware & Tools", gstin:"33AABCM9012H3Z7", rating:"B", onTimeDelivery:82, rejectionRate:3.2, totalTransacted:18000000, contact:"Suresh Patel", city:"Hyderabad", state:"Telangana", categories:["Hardware","Tools","Fasteners"], email:"suresh@modernhardware.com", phone:"+91 96781 34567", status:"active" },
  { id:"4", name:"Pioneer Electrical Works", gstin:"36AAAPS3456J4Z8", rating:"A", onTimeDelivery:94, rejectionRate:1.1, totalTransacted:27000000, contact:"Anita Singh", city:"Pune", state:"Maharashtra", categories:["Electrical","Cables","Panels"], email:"anita@pioneerelectrical.com", phone:"+91 95672 45678", status:"active" },
  { id:"5", name:"Excel Paints & Chemicals", gstin:"27AACCE7890K5Z9", rating:"B", onTimeDelivery:78, rejectionRate:4.5, totalTransacted:12000000, contact:"Vikram Mehta", city:"Delhi", state:"Delhi", categories:["Paints","Chemicals","Sealants"], email:"vikram@excelpaints.com", phone:"+91 94563 56789", status:"active" },
  { id:"6", name:"National Pipes & Fittings", gstin:"07AACN2345L6Z0", rating:"A+", onTimeDelivery:97, rejectionRate:0.5, totalTransacted:38000000, contact:"Priya Nair", city:"Bangalore", state:"Karnataka", categories:["Plumbing","Pipes","Fittings"], email:"priya@nationalpipes.com", phone:"+91 93454 67890", status:"active" },
]

const RATING_COLORS = { "A+":"bg-emerald-100 text-emerald-700 border-emerald-200", "A":"bg-blue-100 text-blue-700 border-blue-200", "B":"bg-amber-100 text-amber-700 border-amber-200", "C":"bg-red-100 text-red-700 border-red-200" }

function fmt(n: number) {
  if(n>=10000000) return `₹${(n/10000000).toFixed(1)}Cr`
  if(n>=100000) return `₹${(n/100000).toFixed(1)}L`
  return `₹${n.toLocaleString("en-IN")}`
}

export default function VendorsPage() {
  const [search, setSearch] = useState("")
  const [ratingFilter, setRatingFilter] = useState("all")

  const filtered = VENDORS.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.city.toLowerCase().includes(search.toLowerCase())
    const matchRating = ratingFilter === "all" || v.rating === ratingFilter
    return matchSearch && matchRating
  })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Master</h1>
          <p className="text-gray-500 text-sm mt-1">{VENDORS.length} vendors registered</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4"/> Add Vendor
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search vendors..." className="pl-9 pr-4 py-2 border rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <select value={ratingFilter} onChange={e=>setRatingFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Ratings</option>
          {["A+","A","B","C"].map(r=><option key={r} value={r}>Rating {r}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(v=>(
          <div key={v.id} className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight">{v.name}</h3>
                <p className="text-xs text-gray-500 mt-1">GSTIN: {v.gstin}</p>
              </div>
              <span className={cn("ml-2 px-2 py-1 rounded-full text-xs font-bold border flex-shrink-0", RATING_COLORS[v.rating])}>
                <Star className="w-3 h-3 inline mr-0.5"/>{v.rating}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-gray-500">On-time Delivery</div>
                <div className="font-semibold text-green-600">{v.onTimeDelivery}%</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-gray-500">Rejection Rate</div>
                <div className={cn("font-semibold", v.rejectionRate>3?"text-red-600":"text-amber-600")}>{v.rejectionRate}%</div>
              </div>
            </div>

            <div className="bg-blue-50 rounded p-2 mb-3 text-xs">
              <span className="text-gray-500">Total Transacted: </span>
              <span className="font-bold text-blue-700">{fmt(v.totalTransacted)}</span>
            </div>

            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <MapPin className="w-3 h-3"/>{v.city}, {v.state}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <Phone className="w-3 h-3"/>{v.phone}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
              <Mail className="w-3 h-3"/>{v.email}
            </div>

            <div className="flex flex-wrap gap-1">
              {v.categories.map(cat=>(
                <span key={cat} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs">{cat}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
