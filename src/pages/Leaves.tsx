import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LeaveRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import { Calendar, Plus, Check, X, ClipboardCheck, Clock, UserCheck } from 'lucide-react';

export default function Leaves() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form apply states
  const [openModal, setOpenModal] = useState(false);
  const [leaveType, setLeaveType] = useState<'Annual' | 'Sick' | 'Maternity' | 'Unpaid' | 'Paternity'>('Annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/leaves');
      if (res.data?.success) {
        setLeaves(res.data.data);
      }
    } catch (err: any) {
      console.error('Fetch leaves error:', err);
      setError('Could not download active leave schedules.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      alert('Please fill out all mandatory leave parameters.');
      return;
    }

    try {
      const res = await axios.post('/api/leaves', {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason
      });

      if (res.data?.success) {
        setOpenModal(false);
        setReason('');
        setStartDate('');
        setEndDate('');
        fetchLeaves(); // Refresh
      }
    } catch (err: any) {
      console.error('Apply leave error:', err);
      alert(err.response?.data?.message || 'Could not verify leave request submission.');
    }
  };

  const handleReviewLeave = async (id: number, decision: 'Approved' | 'Rejected') => {
    try {
      const res = await axios.put(`/api/leaves/${id}`, { status: decision });
      if (res.data?.success) {
        setLeaves(leaves.map(l => l.id === id ? { ...l, status: decision } : l));
      }
    } catch (err: any) {
      console.error('Review leave failure:', err);
      alert('Action error: Could not complete leave review process.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900">Leaves & Absences</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Monitor and file personnel leave, vacations, and sick reports.</p>
        </div>

        {/* Show Self-Service Apply Button to staff only */}
        {user?.role === 'Employee' && (
          <button
            onClick={() => setOpenModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer leading-none shadow-xs"
          >
            <Plus size={14} />
            <span>Apply For Leave</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
            <p className="text-xs text-slate-400 font-mono">Loading schedules...</p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs font-mono">
            No absences entries currently recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest select-none">
                  <th className="py-3.5 px-6">Personnel</th>
                  <th className="py-3.5 px-6">Leave Type</th>
                  <th className="py-3.5 px-6">Duration Range</th>
                  <th className="py-3.5 px-6">Total Days</th>
                  <th className="py-3.5 px-6">Reason Statement</th>
                  <th className="py-3.5 px-6">Log Status</th>
                  {user?.role !== 'Employee' && <th className="py-3.5 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900 leading-tight">
                        {leave.employee_name || 'Staff Member'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {leave.job_title}
                      </p>
                    </td>

                    <td className="py-4 px-6">
                      <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-[10px] text-slate-650 font-bold rounded">
                        {leave.leave_type}
                      </span>
                    </td>

                    <td className="py-4 px-6 font-mono text-slate-500">
                      {leave.start_date.substring(0, 10)} to {leave.end_date.substring(0, 10)}
                    </td>

                    <td className="py-4 px-6 font-bold font-mono text-slate-800">
                      {leave.total_days} days
                    </td>

                    <td className="py-4 px-6 max-w-xs truncate text-slate-505 font-medium" title={leave.reason}>
                      {leave.reason}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                          leave.status === 'Approved'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : leave.status === 'Rejected'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}
                      >
                        {leave.status}
                      </span>
                    </td>

                    {user?.role !== 'Employee' && (
                      <td className="py-4 px-6 text-right">
                        {leave.status === 'Pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReviewLeave(leave.id, 'Approved')}
                              className="p-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10.5px] font-bold rounded-md cursor-pointer flex items-center gap-0.5 transition-all"
                            >
                              <Check size={11} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleReviewLeave(leave.id, 'Rejected')}
                              className="p-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10.5px] font-bold rounded-md cursor-pointer flex items-center gap-0.5 transition-all"
                            >
                              <X size={11} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono flex items-center justify-end gap-1 select-none font-bold">
                            <UserCheck size={11} />
                            <span>Reviewed</span>
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE DIALOG MODAL FOR EXTENDING APPLY REQUESTS */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setOpenModal(false)} />
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 w-full max-w-md relative z-10 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
              <h2 className="text-sm font-bold text-slate-900">Apply for Vacation Leave</h2>
              <button onClick={() => setOpenModal(false)} className="text-slate-450 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-450 uppercase tracking-wider mb-1">Absence Type *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500 text-slate-800 focus:bg-white"
                >
                  <option value="Annual">Annual Paid Holiday</option>
                  <option value="Sick">Medical / Dental Absences</option>
                  <option value="Maternity">Maternity Allocation</option>
                  <option value="Paternity">Paternity Allocation</option>
                  <option value="Unpaid">Unpaid Personal Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-450 uppercase tracking-wider mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500 text-slate-800 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-450 uppercase tracking-wider mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500 text-slate-800 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-450 uppercase tracking-wider mb-1">Reason statement *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide an explanation or statement for the requested absence..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white text-slate-800 resize-none"
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
                  File Leave Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
