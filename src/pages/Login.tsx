import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'react-exports';
import axiosInstance from 'axios';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill out all credentials fields.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const response = await axiosInstance.post('/api/auth/login', { username, password });
      if (response.data?.success) {
        const { token, user, employee } = response.data;
        login(token, user, employee);
        navigate('/');
      } else {
        setError(response.data?.message || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      console.error('Login submit error:', err);
      setError(
        err.response?.data?.message || 'Connection failure. Make sure server is active and port is mapped.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to load demo profiles for quick preview workflow testing
  const handleQuickLogin = (role: 'admin' | 'hr' | 'employee') => {
    if (role === 'admin') {
      setUsername('yathin');
      setPassword('password123');
    } else if (role === 'hr') {
      setUsername('sarah_hr');
      setPassword('password123');
    } else {
      setUsername('david_tech');
      setPassword('password123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 relative overflow-hidden font-sans select-none">
      {/* Decorative clean radial gradients */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-sm space-y-6 relative z-10">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/10 mb-4 select-none">
            <Shield className="text-white w-5.5 h-5.5" />
          </div>
          <h2 className="text-2xl font-bold text-slate-905 tracking-tight font-display mb-1.5">
            Enterprise Portal
          </h2>
          <p className="text-xs text-slate-450 font-medium">
            Sign in to access your Employee Management dashboard
          </p>
        </div>

        {/* Credentials Form Box */}
        <div className="bg-white border border-slate-205 rounded-2xl p-6 shadow-xs space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-201 rounded-xl flex gap-3 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10.5px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">
                Username or Email ID
              </label>
              <input
                type="text"
                required
                placeholder="e.g. yathin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Password key"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs leading-none transition-colors shadow-xs focus:outline-hidden flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 border-t-transparent animate-spin" />
                  <span>Validating session...</span>
                </>
              ) : (
                <>
                  <Key size={14} />
                  <span>Authenticate Credentials</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Login / Sandbox testing tool */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-center text-[9.5px] font-bold text-slate-400 uppercase tracking-widest mb-3 select-none">
              Sandbox Role Quick-Load
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[9.5px] text-slate-600 font-bold uppercase leading-none text-center cursor-pointer"
              >
                Yathin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('hr')}
                className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[9.5px] text-slate-600 font-bold uppercase leading-none text-center cursor-pointer"
              >
                HR Lead
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('employee')}
                className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[9.5px] text-slate-600 font-bold uppercase leading-none text-center cursor-pointer"
              >
                Staff
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-400 select-none">
          Secured with Corporate JWT & Bcrypt Salts • Node JS v20 Production Cluster
        </p>
      </div>
    </div>
  );
}
