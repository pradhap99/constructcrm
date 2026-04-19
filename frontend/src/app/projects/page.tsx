'use client'
import { useState } from 'react'
import { Building2, User, CalendarDays, Users, IndianRupee, Plus, FolderKanban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrencyCr, formatDate, formatPercent } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed'

interface MockProject {
  id: string
  name: string
  status: ProjectStatus
  budget: number
  spent: number
  progress: number
  client: string
  pm: string
  startDate: string
  endDate: string
  workers: number
}

const PROJECTS: MockProject[] = [
  {
    id: '1',
    name: 'Pune Metro Phase 3',
    status: 'active',
    budget: 125000000,
    spent: 72000000,
    progress: 58,
    client: 'PMRDA',
    pm: 'Ramesh Iyer',
    startDate: '2023-06-01',
    endDate: '2024-12-31',
    workers: 45,
  },
  {
    id: '2',
    name: 'Nashik Highway Bypass',
    status: 'active',
    budget: 88000000,
    spent: 31000000,
    progress: 35,
    client: 'NHAI',
    pm: 'Sunita Patil',
    startDate: '2023-09-01',
    endDate: '2025-03-31',
    workers: 32,
  },
  {
    id: '3',
    name: 'Aurangabad Industrial Park',
    status: 'planning',
    budget: 220000000,
    spent: 4000000,
    progress: 2,
    client: 'MIDC',
    pm: 'Kiran Shah',
    startDate: '2024-02-01',
    endDate: '2026-06-30',
    workers: 8,
  },
  {
    id: '4',
    name: 'Solapur Water Treatment Plant',
    status: 'completed',
    budget: 42000000,
    spent: 41000000,
    progress: 100,
    client: 'Solapur Municipal',
    pm: 'Deepa Nair',
    startDate: '2022-01-01',
    endDate: '2023-11-30',
    workers: 0,
  },
  {
    id: '5',
    name: 'Mumbai Coastal Road Segment 4',
    status: 'on_hold',
    budget: 180000000,
    spent: 55000000,
    progress: 31,
    client: 'BMC',
    pm: 'Arjun Mehta',
    startDate: '2023-03-01',
    endDate: '2025-09-30',
    workers: 0,
  },
]

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  planning: { label: 'Planning', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  on_hold: { label: 'On Hold', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200' },
}

const FILTER_OPTIONS: { label: string; value: ProjectStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Planning', value: 'planning' },
  { label: 'Active', value: 'active' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Completed', value: 'completed' },
]

const totalBudget = PROJECTS.reduce((sum, p) => sum + p.budget, 0)
const avgCompletion = Math.round(PROJECTS.reduce((sum, p) => sum + p.progress, 0) / PROJECTS.length)

export default function ProjectsPage() {
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')

  const filtered =
    statusFilter === 'all' ? PROJECTS : PROJECTS.filter((p) => p.status === statusFilter)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-sm text-gray-500">{PROJECTS.length} projects total</p>
          </div>
        </div>
        <button
          onClick={() => alert('Coming soon')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: PROJECTS.length, color: 'text-gray-900' },
          {
            label: 'Active Projects',
            value: PROJECTS.filter((p) => p.status === 'active').length,
            color: 'text-indigo-600',
          },
          {
            label: 'Total Budget',
            value: formatCurrencyCr(totalBudget),
            color: 'text-blue-600',
          },
          {
            label: 'Avg Completion',
            value: formatPercent(avgCompletion),
            color: 'text-green-600',
          },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-lg border shadow-sm p-4">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={cn('text-2xl font-bold mt-1', card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              statusFilter === opt.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((project) => {
          const cfg = STATUS_CONFIG[project.status]
          return (
            <div
              key={project.id}
              className="bg-white rounded-lg border shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer space-y-4"
            >
              {/* Name + Status */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-gray-900 text-lg leading-tight">{project.name}</h3>
                <span
                  className={cn(
                    'flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold border',
                    cfg.color
                  )}
                >
                  {cfg.label}
                </span>
              </div>

              {/* Client + PM */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span>{project.client}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{project.pm}</span>
                </div>
              </div>

              {/* Budget vs Spent */}
              <div className="space-y-1 bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gray-500">
                    <IndianRupee className="w-3.5 h-3.5" />
                    <span>Budget</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {formatCurrencyCr(project.budget)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gray-500">
                    <IndianRupee className="w-3.5 h-3.5" />
                    <span>Spent</span>
                  </div>
                  <span
                    className={cn(
                      'font-semibold',
                      project.spent / project.budget > 0.9
                        ? 'text-red-600'
                        : 'text-indigo-600'
                    )}
                  >
                    {formatCurrencyCr(project.spent)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-semibold text-gray-700">
                    {formatPercent(project.progress)}
                  </span>
                </div>
                <Progress
                  value={project.progress}
                  className={cn(
                    'h-2',
                    project.status === 'completed'
                      ? '[&>div]:bg-green-500'
                      : project.status === 'on_hold'
                      ? '[&>div]:bg-amber-500'
                      : '[&>div]:bg-indigo-500'
                  )}
                />
              </div>

              {/* Dates + Workers */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t">
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>
                    {formatDate(project.startDate, 'MMM yyyy')} →{' '}
                    {formatDate(project.endDate, 'MMM yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>{project.workers} workers</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FolderKanban className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No projects match the selected filter.</p>
        </div>
      )}
    </div>
  )
}
