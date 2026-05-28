import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { FileBarChart, IndianRupee, Calculator, CalendarClock, ShieldAlert, Award, ArrowUpRight, TrendingUp, Presentation } from 'lucide-react';

interface ReportData {
  departments: {
    id: number;
    name: string;
    code: string;
    budget: number;
    employee_count: number;
    total_salary_expense: number;
    avg_salary: number;
  }[];
  attendance: {
    Present: number;
    Late: number;
    Absent: number;
    HalfDay: number;
    total: number;
  };
  leaves: {
    Pending: number;
    Approved: number;
    Rejected: number;
    types: {
      Annual: number;
      Sick: number;
      Maternity: number;
      Unpaid: number;
      Paternity: number;
    };
  };
  payroll: {
    total_basic: number;
    total_bonus: number;
    total_deductions: number;
    total_net: number;
    count: number;
  };
  performance: {
    Excellent: number;
    Good: number;
    Average: number;
    NeedsImprovement: number;
  };
  summary: {
    total_employees: number;
    active_employees: number;
    total_budget_allocated: number;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const PERFORMANCE_COLORS = {
  Excellent: '#10b981',
  Good: '#3b82f6',
  Average: '#fbbf24',
  NeedsImprovement: '#f87171'
};

export default function Reports() {
  const { user } = useAuth();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/reports');
      setData(res.data.data);
      setError('');
    } catch (err: any) {
      console.error('Fetch reports analytical error:', err);
      setError('Could not compiled enterprise dashboards. Access restricted.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-slate-202 shadow-xs">
        <div className="w-10 h-10 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mb-4"></div>
        <p className="text-xs text-slate-400 font-bold uppercase font-mono tracking-wider animate-pulse">Running Analytics Calculations...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
        <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
          <ShieldAlert size={18} />
          <span>Analytical Reports Gateway Blocked</span>
        </div>
        <p className="text-xs text-rose-600 leading-relaxed">
          {error || 'Unauthorized request detected.'}
        </p>
      </div>
    );
  }

  // Formatting departmental chart structures
  const deptChartData = data.departments.map(d => ({
    name: d.code,
    fullName: d.name,
    Employees: d.employee_count,
    SalaryExpense: d.total_salary_expense / 1000, // Show in thousands
    Budget: d.budget / 1000 // In thousands
  }));

  // Attendance formatting chart
  const attendanceChartData = [
    { name: 'On-time', value: data.attendance.Present },
    { name: 'Late Arrivals', value: data.attendance.Late },
    { name: 'Excusable Half Day', value: data.attendance.HalfDay },
    { name: 'Unexplained Absences', value: data.attendance.Absent }
  ].filter(x => x.value > 0);

  // Performance breakdown
  const performanceChartData = [
    { name: 'Excellent', count: data.performance.Excellent },
    { name: 'Good', count: data.performance.Good },
    { name: 'Average', count: data.performance.Average },
    { name: 'Needs Imp.', count: data.performance.NeedsImprovement }
  ];

  return (
    <div className="space-y-6 select-none font-sans pb-12">
      {/* Upper header banner description */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-205 pb-5">
        <div>
          <h1 className="text-3xl font-black font-display text-slate-909 leading-none">
            Corporate Intel Core
          </h1>
          <p className="text-xs sm:text-sm text-slate-505 mt-2">
            Real-time cross-sectional analytics computing payroll audits, budgets, performance rankings and team attendance.
          </p>
        </div>

        <button
          onClick={fetchReportsData}
          className="flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors cursor-pointer leading-none"
        >
          <TrendingUp size={14} />
          <span>Refresh Analytics Grid</span>
        </button>
      </div>

      {/* Numerical overview metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Total Active Squad</span>
            <span className="p-1 px-1.5 rounded-md bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-bold">Headcount</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-800">{data.summary.active_employees}</p>
            <span className="text-[11px] text-slate-450 font-semibold">/ {data.summary.total_employees} members</span>
          </div>
          <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 leading-none font-mono">
            <ArrowUpRight size={12} />
            <span>Stable operating capacity</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Fiscal Budget Cap</span>
            <IndianRupee className="text-slate-400" size={16} />
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-black text-slate-800">
              ₹{(data.summary.total_budget_allocated / 1000000).toFixed(2)}M
            </p>
          </div>
          <p className="text-[10px] text-slate-450 font-bold font-mono">Approved annual departmental allocations</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase font-mono">Net Monthly Remittance</span>
            <Calculator className="text-slate-400" size={16} />
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-black text-slate-800">
              ₹{(data.payroll.total_net / 100).toFixed(2)}K
            </p>
          </div>
          <p className="text-[10px] text-slate-450 font-bold font-mono">May 2026 total verified expenditures</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Leaves Deficit</span>
            <CalendarClock className="text-slate-400" size={16} />
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-black text-slate-850">{data.leaves.Pending}</p>
            <span className="text-[11px] text-slate-450 font-bold">Filings pending audit</span>
          </div>
          <p className="text-[10px] text-amber-600 font-bold font-mono">Needs supervisor clearance</p>
        </div>
      </div>

      {/* Visual Recharts graphs cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Department budges vs Expenditures */}
        <div className="bg-white p-5 rounded-2xl border border-slate-202 shadow-xs space-y-4">
          <div>
            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Corporate Capital structures</span>
            <p className="text-xs font-bold text-slate-600 mt-1">Division Budget Allocations vs Salary Expenses (₹ in Thousands)</p>
          </div>
          <div className="h-64 text-[10px] font-semibold font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Legend />
                <Bar dataKey="Budget" fill="#2563eb" radius={[3, 3, 0, 0]} />
                <Bar dataKey="SalaryExpense" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Headcount structures */}
        <div className="bg-white p-5 rounded-2xl border border-slate-202 shadow-xs space-y-4">
          <div>
            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Organizational Headcounts</span>
            <p className="text-xs font-bold text-slate-600 mt-1">Squad member distribution across corporate pillars</p>
          </div>
          <div className="h-64 text-[10px] font-semibold font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={deptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} />
                <YAxis stroke="#94a3b8" precision={0} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="Employees" stroke="#10b981" fill="url(#areaColor)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Performance Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-202 shadow-xs space-y-4">
          <div>
            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Performance Reviews Overview</span>
            <p className="text-xs font-bold text-slate-600 mt-1">Employee scores distributed by score buckets</p>
          </div>
          <div className="h-64 text-[10px] font-semibold font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.6} />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} />
                <YAxis stroke="#94a3b8" precision={0} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {performanceChartData.map((entry, index) => {
                    let color = '#3b82f6';
                    if (entry.name === 'Excellent') color = PERFORMANCE_COLORS.Excellent;
                    else if (entry.name === 'Good') color = PERFORMANCE_COLORS.Good;
                    else if (entry.name === 'Average') color = PERFORMANCE_COLORS.Average;
                    else color = PERFORMANCE_COLORS.NeedsImprovement;
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: Attendance tracking graphs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-202 shadow-xs space-y-4">
          <div>
            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Clock-In Trends Punctuality</span>
            <p className="text-xs font-bold text-slate-600 mt-1">Recorded clockings for active schedule tracks</p>
          </div>
          {attendanceChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center border border-dashed border-slate-200 rounded-xl">
              <span className="text-slate-400 text-[11px] font-semibold font-mono">No clock-ins recorded for today's track.</span>
            </div>
          ) : (
            <div className="h-64 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono">
              <div className="w-full sm:w-1/2 h-full font-semibold">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendanceChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {attendanceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 space-y-2 db-slate-50 border border-slate-100 p-4 rounded-xl">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Punctuality Legend Details</p>
                {attendanceChartData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between font-bold text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span>{entry.name}</span>
                    </div>
                    <span className="text-slate-800">{entry.value} logs</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
