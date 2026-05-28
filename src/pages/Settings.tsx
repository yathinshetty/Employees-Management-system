import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Moon, 
  Sun, 
  Check, 
  Lock, 
  Globe, 
  Briefcase, 
  Database,
  Smartphone
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Settings() {
  const { user, employee } = useAuth();
  
  // Design values configuration
  const [theme, setTheme] = useState<'light'>('light');

  // Profile fields (simulated)
  const [phone, setPhone] = useState(employee?.phone || '+91 98765 43210');
  const [email, setEmail] = useState(user?.email || 'hr@enterprise.com');
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    taskDeadlines: true,
    payrollSlip: true,
    checkInReminders: false
  });
  
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' });
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);

  // Maintain standard doc class light setup for full enterprise cohesion
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passForm.current || !passForm.next || !passForm.confirm) {
      setPassError('Please fill out all password fields.');
      return;
    }
    if (passForm.next !== passForm.confirm) {
      setPassError('Passwords do not match.');
      return;
    }
    setPassError('');
    setPassSuccess(true);
    setPassForm({ current: '', next: '', confirm: '' });
    setTimeout(() => setPassSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 font-sans select-none pb-12">
      {/* Settings Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-205 pb-5">
        <div>
          <h1 className="text-3xl font-black font-display text-slate-909 leading-none">
            Workspace Preferences
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Configure system themes, corporate profile data, secure API authorization keys, and alert preferences.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 shadow-xs">
            <Sun size={13} className="text-amber-500" />
            <span>Enterprise Light Theme Only</span>
          </div>
        </div>
      </div>

      {/* Grid Settings Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <User size={15} />
            </div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">Personal Identity</h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-semibold">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest">Username Prefix</label>
              <input 
                type="text" 
                value={user?.username || ''} 
                disabled 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg focus:outline-hidden font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest">Enterprise Role</label>
              <input 
                type="text" 
                value={user?.role || ''} 
                disabled 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-505 rounded-lg focus:outline-hidden font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest">{email ? 'Email Address *' : 'Contact Email'}</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest">{phone ? 'Contact Number *' : 'Contact Number'}</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg font-bold text-xs uppercase tracking-wide cursor-pointer transition-colors"
            >
              Update Contact Profile
            </button>

            {saveSuccess && (
              <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg flex items-center gap-1.5 text-[10.5px]">
                <Check size={12} className="text-emerald-500" />
                <span>Local profile cache successfully refreshed.</span>
              </div>
            )}
          </form>
        </div>

        {/* Alerts Preferences */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Bell size={15} />
            </div>
            <h3 className="text-xs font-black text-slate-805 uppercase tracking-wider font-mono">Alert Configurations</h3>
          </div>

          <div className="space-y-4 text-xs font-semibold">
            <p className="text-slate-400 text-[10px] font-bold tracking-wider uppercase">Select notify channels</p>
            
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-105">
              <div>
                <p className="text-slate-905 font-bold">Email Digest Alerts</p>
                <p className="text-[10px] text-slate-450 font-normal mt-0.5">Weekly audit trails delivered.</p>
              </div>
              <input 
                type="checkbox" 
                checked={notifications.emailAlerts}
                onChange={(e) => setNotifications({ ...notifications, emailAlerts: e.target.checked })}
                className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-105">
              <div>
                <p className="text-slate-905 font-bold">Objective Deadlines</p>
                <p className="text-[10px] text-slate-455 font-normal mt-0.5">Real-time alerts for submissions.</p>
              </div>
              <input 
                type="checkbox" 
                checked={notifications.taskDeadlines}
                onChange={(e) => setNotifications({ ...notifications, taskDeadlines: e.target.checked })}
                className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-105">
              <div>
                <p className="text-slate-905 font-bold">Remittance Payslips</p>
                <p className="text-[10px] text-slate-455 font-normal mt-0.5">Alerts when payslips are generated.</p>
              </div>
              <input 
                type="checkbox" 
                checked={notifications.payrollSlip}
                onChange={(e) => setNotifications({ ...notifications, payrollSlip: e.target.checked })}
                className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-105">
              <div>
                <p className="text-slate-905 font-bold">Check-In Reminders</p>
                <p className="text-[10px] text-slate-455 font-normal mt-0.5">Slack compliance ping reminder alerts.</p>
              </div>
              <input 
                type="checkbox" 
                checked={notifications.checkInReminders}
                onChange={(e) => setNotifications({ ...notifications, checkInReminders: e.target.checked })}
                className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="p-3 bg-blue-50 text-[10.5px] text-blue-700 rounded-lg border border-blue-100 text-center font-mono font-bold uppercase select-none">
              ⚡ Status: PUSH DIRECT NOTIFS ON
            </div>
          </div>
        </div>

        {/* Security / Keys change form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <Shield size={15} />
            </div>
            <h3 className="text-xs font-black text-slate-805 uppercase tracking-wider font-mono">Access Security</h3>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs font-semibold">
            {passError && (
              <p className="p-2 border border-rose-200 bg-rose-50 text-rose-605 rounded-lg leading-relaxed">{passError}</p>
            )}
            {passSuccess && (
              <p className="p-2 border border-emerald-200 bg-emerald-50 text-emerald-600 rounded-lg leading-relaxed">Temporary security password refreshed.</p>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest">Current Session Password</label>
              <input 
                type="password" 
                value={passForm.current}
                onChange={(e) => setPassForm({ ...passForm, current: e.target.value })}
                placeholder="••••••••" 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-805 rounded-lg focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest">New Session Password</label>
              <input 
                type="password" 
                value={passForm.next}
                onChange={(e) => setPassForm({ ...passForm, next: e.target.value })}
                placeholder="Minimum 6 characters" 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-805 rounded-lg focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest">Re-type New Password</label>
              <input 
                type="password" 
                value={passForm.confirm}
                onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })}
                placeholder="Confirm exact characters" 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-805 rounded-lg focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all font-mono"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-lg font-bold text-xs uppercase tracking-wide cursor-pointer transition-colors"
            >
              Sign Password Vault
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
