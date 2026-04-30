'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firmName: '', firmSlug: '', name: '', email: '', password: '',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { accessToken, user } = await api.register(form);
      setAuth(accessToken, user);
      router.push('/projects');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">CivilIQ</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Register your firm</h1>
          <p className="text-slate-500 text-sm mt-1">Set up your construction intelligence workspace</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Company name</label>
              <input
                value={form.firmName}
                onChange={e => { set('firmName')(e); setForm(f => ({ ...f, firmSlug: autoSlug(e.target.value) })); }}
                required placeholder="ABC Constructions Pvt Ltd"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Workspace URL
                <span className="text-slate-400 font-normal ml-1">(auto-generated)</span>
              </label>
              <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                <span className="px-3 py-2.5 bg-slate-50 text-slate-500 text-sm border-r border-slate-300">civiliq.app/</span>
                <input
                  value={form.firmSlug} onChange={set('firmSlug')} required
                  className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                  placeholder="abc-constructions"
                />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Your account</p>
              <div className="space-y-3">
                <input value={form.name} onChange={set('name')} required placeholder="Your full name"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="email" value={form.email} onChange={set('email')} required placeholder="you@yourfirm.com"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="password" value={form.password} onChange={set('password')} required placeholder="Choose a strong password" minLength={8}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating workspace...' : 'Create workspace'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
