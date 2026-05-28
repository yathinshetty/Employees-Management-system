import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Payroll } from '../types';
import { useAuth } from '../context/AuthContext';
import { CircleDollarSign, Coins, TrendingUp, ShieldAlert, CreditCard, Receipt, Award } from 'lucide-react';

export default function PayrollPage() {
  const { user } = useAuth();
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active target month selector
  const [targetMonth, setTargetMonth] = useState('2026-05');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchPayroll();
  }, []);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/payroll');
      if (res.data?.success) {
        setPayroll(res.data.data);
      }
    } catch (err: any) {
      console.error('Fetch payroll error:', err);
      setError('Could not fetch payroll databases records.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) {
      alert('Please select a valid month.');
      return;
    }

    try {
      setGenerating(true);
      const res = await axios.post('/api/payroll', { month: targetMonth });
      if (res.data?.success) {
        alert(res.data.message);
        fetchPayroll(); // Reload database records
      }
    } catch (err: any) {
      console.error('Generate payroll error:', err);
      alert(err.response?.data?.message || 'Calculation generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleProcessPayment = async (id: number) => {
    try {
      const res = await axios.put(`/api/payroll/${id}`, { status: 'Paid' });
      if (res.data?.success) {
        setPayroll(payroll.map(p => p.id === id ? { ...p, payment_status: 'Paid', payment_date: new Date().toISOString().split('T')[0] } : p));
      }
    } catch (err: any) {
      console.error('Process payment failure:', err);
      alert('Action error: could not approve net compensation payout.');
    }
  };

  return (
    <div className="space-y-6 font-sans select-none pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-205 pb-5">
        <div>
          <h1 className="text-3xl font-black font-display text-slate-900 leading-none">Compensation Ledger</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">Calculate, generate and approve monthly staff payroll records.</p>
        </div>

        {/* Generate Payroll configuration widgets for HR/Admin */}
        {user?.role !== 'Employee' && (
          <div className="flex items-center gap-2 text-xs bg-white border border-slate-200 p-2 rounded-xl shrink-0 shadow-xs">
            <span className="font-bold text-slate-500 font-mono text-[10.5px]">Month:</span>
            <input
              type="month"
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-hidden"
            />
            <button
              onClick={handleGeneratePayroll}
              disabled={generating}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg leading-none flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {generating ? 'Processing...' : 'Run Calculations'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-202 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
            <p className="text-xs text-slate-400 font-mono">Loading registers...</p>
          </div>
        ) : payroll.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs font-mono">
            No payments registers logged. Run monthly calculations first.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-450 uppercase tracking-widest select-none">
                  <th className="py-3.5 px-6">Personnel Name</th>
                  <th className="py-3.5 px-6">Month Cycle</th>
                  <th className="py-3.5 px-6">Base Salary Block</th>
                  <th className="py-3.5 px-6">Bonuses Added</th>
                  <th className="py-3.5 px-6">Deductions Applied</th>
                  <th className="py-3.5 px-6">Net Take-home</th>
                  <th className="py-3.5 px-6">Payout Status</th>
                  {user?.role !== 'Employee' && <th className="py-3.5 px-6 text-right">Approvals</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {payroll.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-205 text-slate-500 font-black flex items-center justify-center text-[10px] select-none shrink-0 uppercase font-mono">
                        {pay.employee_name ? pay.employee_name.substring(0, 2) : 'EM'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-905 leading-tight">
                          {pay.employee_name}
                        </p>
                        <p className="text-[10px] text-slate-450 leading-none mt-1 font-semibold">
                          {pay.job_title} • {pay.department_name}
                        </p>
                      </div>
                    </td>

                    <td className="py-4 px-6 font-mono font-bold text-slate-500">
                      {pay.month}
                    </td>

                    <td className="py-4 px-6 font-mono text-slate-500">
                      ₹{pay.basic_salary.toLocaleString()}
                    </td>

                    <td className="py-4 px-6 font-mono text-emerald-600 font-bold">
                      +₹{pay.bonuses.toLocaleString()}
                    </td>

                    <td className="py-4 px-6 font-mono text-rose-500 font-bold">
                      -₹{pay.deductions.toLocaleString()}
                    </td>

                    <td className="py-4 px-6 font-mono font-extrabold text-slate-900 text-sm">
                      ₹{pay.net_salary.toLocaleString()}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          pay.payment_status === 'Paid'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : pay.payment_status === 'Processing'
                            ? 'bg-amber-50 border-amber-200 text-amber-750'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${
                          pay.payment_status === 'Paid' ? 'bg-emerald-500' : pay.payment_status === 'Processing' ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                        <span>{pay.payment_status}</span>
                      </span>
                      {pay.payment_date && (
                        <p className="text-[9.5px] text-slate-400 font-mono mt-0.5 font-bold">
                          Paid: {pay.payment_date.substring(0, 10)}
                        </p>
                      )}
                    </td>

                    {user?.role !== 'Employee' && (
                      <td className="py-4 px-6 text-right">
                        {pay.payment_status !== 'Paid' ? (
                          <button
                            onClick={() => handleProcessPayment(pay.id)}
                            className="px-3 py-1.8 bg-blue-602 bg-blue-600 hover:bg-blue-700 text-white text-[10.5px] font-bold rounded-lg leading-none cursor-pointer inline-flex items-center gap-1 transition-all shadow-xs"
                          >
                            <CreditCard size={11} />
                            <span>Authorize Payout</span>
                          </button>
                        ) : (
                          <span className="text-[10.5px] text-blue-600 font-bold inline-flex items-center justify-end gap-1 select-none">
                            <Receipt size={12} className="text-blue-500" />
                            <span>Remitted Slip</span>
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
    </div>
  );
}
