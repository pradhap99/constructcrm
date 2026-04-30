'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import {
  Settings, Building2, Key, Globe, Bell, Shield,
  Save, CheckCircle2, Brain, Zap,
} from 'lucide-react';

const SECTIONS = [
  { key: 'firm',          label: 'Firm',           icon: Building2 },
  { key: 'ai',            label: 'AI & Integrations', icon: Brain },
  { key: 'notifications', label: 'Notifications',  icon: Bell },
  { key: 'security',      label: 'Security',       icon: Shield },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [section, setSection] = useState('firm');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your workspace, integrations, and preferences</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar nav */}
        <div className="w-52 shrink-0">
          <nav className="space-y-0.5">
            {SECTIONS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setSection(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  section === key
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl space-y-6">

          {/* ── FIRM ── */}
          {section === 'firm' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="font-semibold text-slate-900 mb-5">Firm Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Company Name</label>
                  <input defaultValue="ABC Constructions Pvt Ltd"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Workspace Slug</label>
                  <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                    <span className="px-3 py-2.5 bg-slate-50 text-slate-500 text-sm border-r border-slate-300">civiliq.app/</span>
                    <input defaultValue="abc-constructions"
                      className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Default Currency</label>
                    <select defaultValue="INR"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="INR">INR — Indian Rupee</option>
                      <option value="USD">USD — US Dollar</option>
                      <option value="AED">AED — UAE Dirham</option>
                      <option value="SAR">SAR — Saudi Riyal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Timezone</label>
                    <select defaultValue="Asia/Kolkata"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      <option value="Asia/Riyadh">Asia/Riyadh (AST)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Plan</label>
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Starter Plan</p>
                      <p className="text-xs text-blue-600 mt-0.5">Up to 5 users · 10 projects · 100 documents/month</p>
                    </div>
                    <button className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                      Upgrade
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── AI ── */}
          {section === 'ai' && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">Claude AI (Anthropic)</h2>
                    <p className="text-xs text-slate-500">Powers document extraction, reconciliation, and intelligence agents</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">API Key</label>
                    <input type="password" defaultValue="sk-ant-xxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="sk-ant-api03-..." />
                    <p className="text-xs text-slate-400 mt-1">Get your key at <span className="text-blue-600">console.anthropic.com</span></p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Model</label>
                    <select defaultValue="claude-sonnet-4-6"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (Recommended)</option>
                      <option value="claude-opus-4-6">Claude Opus 4.6 (Best accuracy, slower)</option>
                      <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Fast, economical)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">AI Agents</h2>
                    <p className="text-xs text-slate-500">Configure which agents run automatically</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Intake Agent', desc: 'Auto-process uploaded documents (PDF → OCR → JSON)', default: true },
                    { label: 'Reconciliation Agent', desc: 'Detect quantity mismatches between BOQ, delivery, and bills', default: true },
                    { label: 'Risk Agent', desc: 'Flag project delays and budget overruns proactively', default: true },
                    { label: 'Chase Agent', desc: 'Draft follow-up messages for pending certifications', default: false },
                    { label: 'Client Intelligence Agent', desc: 'Compute relationship scores from payment history', default: false },
                  ].map(agent => (
                    <div key={agent.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{agent.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{agent.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={agent.default} className="sr-only peer" />
                        <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {section === 'notifications' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="font-semibold text-slate-900 mb-5">Notification Preferences</h2>
              <div className="space-y-3">
                {[
                  { label: 'Document processed', desc: 'When AI finishes extracting a document', default: true },
                  { label: 'Material mismatch', desc: 'When spec or quantity discrepancies are found', default: true },
                  { label: 'Bill certification', desc: 'When an RA bill status changes', default: true },
                  { label: 'Agent risk alert', desc: 'When risk agent flags a critical issue', default: true },
                  { label: 'Team member joined', desc: 'When a new user accepts an invitation', default: false },
                  { label: 'Weekly summary', desc: 'Weekly digest of project activity', default: false },
                ].map(n => (
                  <div key={n.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{n.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{n.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={n.default} className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SECURITY ── */}
          {section === 'security' && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h2 className="font-semibold text-slate-900 mb-5">Your Account</h2>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{user?.name || '—'}</p>
                    <p className="text-sm text-slate-500">{user?.email || '—'}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium mt-1 inline-block">
                      {user?.role || '—'}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">New Password</label>
                    <input type="password" placeholder="••••••••••••"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirm Password</label>
                    <input type="password" placeholder="••••••••••••"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h2 className="font-semibold text-slate-900 mb-4">Security Info</h2>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Row-Level Security', status: 'Active', color: 'green', desc: 'All data is isolated per firm using Postgres RLS' },
                    { label: 'JWT Authentication', status: 'Active', color: 'green', desc: '7-day access tokens with 30-day refresh' },
                    { label: 'HTTPS / TLS', status: 'Active', color: 'green', desc: 'All connections encrypted in transit' },
                    { label: 'Two-Factor Auth', status: 'Coming Soon', color: 'slate', desc: 'TOTP-based 2FA will be available in Q2 2026' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 bg-${item.color}-400`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-800">{item.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            item.color === 'green' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}>{item.status}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          <div className="flex justify-end">
            <button onClick={handleSave}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                saved
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}>
              {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
