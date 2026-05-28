import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Department } from '../types';
import { Building2, DollarSign, Users, User, Plus, X } from 'lucide-react';

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal create states
  const [openModal, setOpenModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [budget, setBudget] = useState('');

  useEffect(() => {
    fetchDepts();
  }, []);

  const fetchDepts = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/departments');
      if (res.data?.success) {
        setDepartments(res.data.data);
      }
    } catch (err: any) {
      console.error('Fetch departments error:', err);
      setError('Could not download departments directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !budget) {
      alert('All fields are requested.');
      return;
    }

    try {
      const res = await axios.post('/api/departments', {
        name,
        code: code.toUpperCase(),
        budget: Number(budget)
      });
      if (res.data?.success) {
        setDepartments([...departments, res.data.data]);
        setOpenModal(false);
        setName('');
        setCode('');
        setBudget('');
        fetchDepts();
      }
    } catch (err: any) {
      console.error('Create dept error:', err);
      alert(err.response?.data?.message || 'Could not instantiate department.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900">Departments Hub</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Corporate sectors, financial budgets, and managers overview.</p>
        </div>
        <button
          onClick={() => setOpenModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer leading-none shadow-xs"
        >
          <Plus size={14} />
          <span>Add Corporate Department</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-mono">Loading divisions...</p>
        </div>
      ) : departments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs font-mono">
          No divisions recorded.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {departments.map((dept) => (
            <div key={dept.id} className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-6 shadow-xs flex flex-col justify-between transition-all">
              <div className="space-y-4">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-150 flex items-center justify-center">
                    <Building2 size={16} className="text-slate-500" />
                  </div>
                  <span className="font-mono text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {dept.code}
                  </span>
                </div>

                {/* Info Text */}
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 leading-tight text-sm select-all">
                    {dept.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-450 pt-1">
                    <User size={12} className="shrink-0 text-slate-400" />
                    <span className="truncate">Manager: <strong className="text-slate-700 font-bold">{dept.manager_name || 'Unassigned'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Budget / headcount indicators */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Budget Allocation</p>
                  <p className="text-xs font-bold text-slate-705 font-mono">₹{dept.budget.toLocaleString()}/yr</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Staff Count</p>
                  <div className="flex items-center justify-end gap-1 font-bold text-slate-700 text-xs">
                    <Users size={12} className="text-slate-400" />
                    <span>{dept.employee_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE NEW DEPT DIALOG MODAL */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setOpenModal(false)} />
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 w-full max-w-md relative z-10 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
              <h2 className="text-sm font-bold text-slate-900">Add Department Sector</h2>
              <button onClick={() => setOpenModal(false)} className="text-slate-455 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateDept} className="space-y-4">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-450 uppercase tracking-wider mb-1">Sector Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Division"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-450 uppercase tracking-wider mb-1">Sector Code (Abbreviation) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SLD"
                  maxLength={5}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-450 uppercase tracking-wider mb-1">Annual Operations Budget (INR/₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 500000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="px-3.5 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
                >
                  Create Department Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
