'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { accessToken, user } = await api.login(email, password);
      setAuth(accessToken, user);
      router.push('/projects');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}} />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xl font-bold">CivilIQ</span>
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            The intelligence layer between your site and your office.
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            AI-native CRM built for civil construction. Turn BOQs and site measurements into structured data in seconds.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { value: '95%', label: 'OCR accuracy' },
              { value: '10×', label: 'Faster BOQ processing' },
              { value: '₹0', label: 'Data entry for standard docs' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-blue-300 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-500 text-xs relative z-10">© 2026 CivilIQ. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">CivilIQ</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-8">Sign in to your firm's workspace</p>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Work email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="you@yourfirm.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
              </div>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            New to CivilIQ?{' '}
            <Link href="/register" className="text-blue-600 hover:underline font-medium">
              Register your firm
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
