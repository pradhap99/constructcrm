'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate, timeAgo } from '@/lib/utils';
import { Users, Plus, Loader2, X, Shield, Mail, Phone } from 'lucide-react';

const ROLES = [
  { value: 'OWNER',            label: 'Owner',             desc: 'Full admin access' },
  { value: 'PROJECT_MANAGER',  label: 'Project Manager',   desc: 'Manage projects & documents' },
  { value: 'QUANTITY_SURVEYOR', label: 'Quantity Surveyor', desc: 'BOQ, bills, measurements' },
  { value: 'SITE_ENGINEER',    label: 'Site Engineer',     desc: 'Site progress entries' },
  { value: 'PROCUREMENT_HEAD', label: 'Procurement Head',  desc: 'Materials & procurement' },
  { value: 'FINANCE_CONTROLLER', label: 'Finance Controller', desc: 'Bills & payments' },
  { value: 'SUBCONTRACTOR',    label: 'Subcontractor',     desc: 'Limited to own work packages' },
  { value: 'CLIENT',           label: 'Client',            desc: 'Read-only portal access' },
];

const ROLE_COLORS: Record<string, string> = {
  OWNER:              'bg-purple-100 text-purple-700',
  PROJECT_MANAGER:    'bg-blue-100 text-blue-700',
  QUANTITY_SURVEYOR:  'bg-teal-100 text-teal-700',
  SITE_ENGINEER:      'bg-green-100 text-green-700',
  PROCUREMENT_HEAD:   'bg-orange-100 text-orange-700',
  FINANCE_CONTROLLER: 'bg-amber-100 text-amber-700',
  SUBCONTRACTOR:      'bg-slate-100 text-slate-600',
  CLIENT:             'bg-indigo-100 text-indigo-700',
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500',
  'bg-pink-500', 'bg-teal-500', 'bg-orange-500', 'bg-indigo-500',
];

export default function TeamPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'SITE_ENGINEER' });

  const { data: team = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: api.getTeam,
  });

  const inviteMutation = useMutation({
    mutationFn: api.inviteUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); setShowModal(false); setForm({ name: '', email: '', role: 'SITE_ENGINEER' }); },
  });

  const getRoleLabel = (role: string) => ROLES.find(r => r.value === role)?.label || role;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-500 text-sm mt-1">{(team as any[]).length} member{(team as any[]).length !== 1 ? 's' : ''} in your firm</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      {/* Role legend */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Role Permissions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ROLES.map(role => (
            <div key={role.value} className="flex items-start gap-2.5">
              <span className={`mt-0.5 shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[role.value]}`}>{role.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Team list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : (team as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 bg-white border border-slate-200 rounded-2xl text-center">
          <Users className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">No team members yet</p>
          <p className="text-slate-400 text-sm mt-1">Invite your first team member to collaborate</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Invite Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(team as any[]).map((member: any, i: number) => {
            const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
            const initials = member.name
              ?.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase() || '?';

            return (
              <div key={member.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-blue-200 transition-all">
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl ${avatarColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-900 truncate">{member.name}</p>
                      {member.role === 'OWNER' && <Shield className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.role] || 'bg-slate-100 text-slate-600'}`}>
                      {getRoleLabel(member.role)}
                    </span>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${member.isActive ? 'bg-green-400' : 'bg-slate-300'}`} />
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {member.lastLoginAt ? `Last seen ${timeAgo(member.lastLoginAt)}` : 'Never logged in'}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${member.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Invite Team Member</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ravi Kumar"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Work Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="ravi@yourfirm.com"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Role *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ROLES.filter(r => r.value !== 'OWNER').map(role => (
                    <option key={role.value} value={role.value}>{role.label} — {role.desc}</option>
                  ))}
                </select>
              </div>
              {inviteMutation.error && (
                <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                  {(inviteMutation.error as any).message}
                </p>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                disabled={inviteMutation.isPending || !form.name || !form.email}
                onClick={() => inviteMutation.mutate(form)}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {inviteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
