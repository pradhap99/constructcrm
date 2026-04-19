'use client'
import { useState } from 'react'
import { ClipboardList, Users, Truck, Sun, Cloud, Wind, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDate, formatPercent, truncate } from '@/lib/utils'

const DPR_DATA = [
  { id: '1', date: '2024-01-15', project: 'Pune Metro Phase 3', workers: 45, equipment: 8, workDone: 'Concrete pouring for Pier P12 completed. Formwork for P13 in progress.', weather: 'Clear', progress: 2.3, submittedBy: 'Raj Kumar' },
  { id: '2', date: '2024-01-14', project: 'Pune Metro Phase 3', workers: 42, equipment: 7, workDone: 'Reinforcement work for Pier P12 completed. Material delivery for RMC received.', weather: 'Partly Cloudy', progress: 1.8, submittedBy: 'Raj Kumar' },
  { id: '3', date: '2024-01-15', project: 'Nashik Highway Bypass', workers: 32, equipment: 12, workDone: 'Earth excavation for km 14-15 stretch. Compaction of sub-base layer km 12-13.', weather: 'Clear', progress: 3.1, submittedBy: 'Meena Sharma' },
  { id: '4', date: '2024-01-14', project: 'Nashik Highway Bypass', workers: 28, equipment: 10, workDone: 'Base course laying km 12-13. Culvert construction near km 14.', weather: 'Windy', progress: 2.7, submittedBy: 'Meena Sharma' },
  { id: '5', date: '2024-01-13', project: 'Nashik Highway Bypass', workers: 30, equipment: 11, workDone: 'Sub-grade preparation km 13-14. Material testing at lab.', weather: 'Clear', progress: 2.5, submittedBy: 'Meena Sharma' },
  { id: '6', date: '2024-01-15', project: 'Aurangabad Industrial Park', workers: 8, equipment: 3, workDone: 'Survey and layout marking for Phase 1. Soil investigation boring.', weather: 'Clear', progress: 0.5, submittedBy: 'Priya Nair' },
  { id: '7', date: '2024-01-13', project: 'Pune Metro Phase 3', workers: 40, equipment: 6, workDone: 'Holiday. Maintenance work on equipment. Safety inspection completed.', weather: 'Clear', progress: 0.2, submittedBy: 'Raj Kumar' },
]

const PROJECTS = ['All Projects', 'Pune Metro Phase 3', 'Nashik Highway Bypass', 'Aurangabad Industrial Park']

const PROJECT_BADGE_COLORS: Record<string, string> = {
  'Pune Metro Phase 3': 'bg-indigo-100 text-indigo-700',
  'Nashik Highway Bypass': 'bg-amber-100 text-amber-700',
  'Aurangabad Industrial Park': 'bg-emerald-100 text-emerald-700',
}

function WeatherIcon({ weather }: { weather: string }) {
  if (weather === 'Windy') return <Wind className="w-3.5 h-3.5 inline mr-1 text-blue-400" />
  if (weather === 'Partly Cloudy') return <Cloud className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
  return <Sun className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
}

const today = DPR_DATA.filter(d => d.date === '2024-01-15')
const KPI = {
  workers: today.reduce((s, d) => s + d.workers, 0),
  equipment: today.reduce((s, d) => s + d.equipment, 0),
  reports: today.length,
  avgProgress: today.reduce((s, d) => s + d.progress, 0) / today.length,
}

export default function DPRPage() {
  const [projectFilter, setProjectFilter] = useState('All Projects')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = projectFilter === 'All Projects'
    ? DPR_DATA
    : DPR_DATA.filter(d => d.project === projectFilter)

  const selectedDPR = DPR_DATA.find(d => d.id === selectedId) ?? null

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Progress Reports (DPR)</h1>
            <p className="text-sm text-gray-500">Site engineers submit these daily</p>
          </div>
        </div>
        <button
          onClick={() => alert('Coming soon')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          + Submit DPR
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {PROJECTS.map(p => <option key={p}>{p}</option>)}
        </select>
        <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">Last 7 Days</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Workers on Site', value: KPI.workers, icon: <Users className="w-5 h-5 text-indigo-500" />, bg: 'bg-indigo-50 dark:bg-indigo-900/20', sub: 'Today (Jan 15)' },
          { label: 'Equipment Deployed', value: `${KPI.equipment} units`, icon: <Truck className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-900/20', sub: 'Today (Jan 15)' },
          { label: 'Reports Today', value: KPI.reports, icon: <ClipboardList className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-900/20', sub: 'Jan 15, 2024' },
          { label: 'Avg Daily Progress', value: formatPercent(KPI.avgProgress), icon: <Sun className="w-5 h-5 text-rose-500" />, bg: 'bg-rose-50 dark:bg-rose-900/20', sub: 'Today average' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-lg border p-4 flex items-start gap-3`}>
            <div className="mt-0.5">{card.icon}</div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{card.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Date', 'Project', 'Workers', 'Equipment', 'Work Done', 'Weather', 'Progress', 'Submitted By', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(dpr => {
              const isSelected = selectedId === dpr.id
              return (
                <>
                  <tr
                    key={dpr.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => setSelectedId(isSelected ? null : dpr.id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{formatDate(dpr.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${PROJECT_BADGE_COLORS[dpr.project] ?? 'bg-gray-100 text-gray-700'}`}>
                        {dpr.project}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {dpr.workers}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        <Truck className="w-3.5 h-3.5 text-gray-400" />
                        {dpr.equipment}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs text-gray-600 dark:text-gray-400" title={dpr.workDone}>
                      {truncate(dpr.workDone, 60)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                      <WeatherIcon weather={dpr.weather} />
                      {dpr.weather}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {formatPercent(dpr.progress)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{dpr.submittedBy}</td>
                    <td className="px-4 py-3">
                      {isSelected
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </td>
                  </tr>
                  {isSelected && (
                    <tr key={`${dpr.id}-expanded`} className="bg-indigo-50 dark:bg-indigo-900/20">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3 text-sm">
                          <div><span className="text-gray-500 font-medium">Date:</span> <span className="ml-1">{formatDate(dpr.date)}</span></div>
                          <div><span className="text-gray-500 font-medium">Project:</span> <span className="ml-1">{dpr.project}</span></div>
                          <div><span className="text-gray-500 font-medium">Submitted By:</span> <span className="ml-1">{dpr.submittedBy}</span></div>
                          <div><span className="text-gray-500 font-medium">Weather:</span> <span className="ml-1">{dpr.weather}</span></div>
                          <div><span className="text-gray-500 font-medium">Workers:</span> <span className="ml-1">{dpr.workers}</span></div>
                          <div><span className="text-gray-500 font-medium">Equipment:</span> <span className="ml-1">{dpr.equipment} units</span></div>
                          <div><span className="text-gray-500 font-medium">Daily Progress:</span> <span className="ml-1 text-green-600 font-semibold">{formatPercent(dpr.progress)}</span></div>
                        </div>
                        <div>
                          <p className="text-gray-500 font-medium text-sm mb-1">Work Done:</p>
                          <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{dpr.workDone}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
