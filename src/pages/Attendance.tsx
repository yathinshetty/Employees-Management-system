import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Attendance, Employee, Department } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Clock, Plus, Check, UserCheck, CheckCircle, Search, Filter, Calendar as CalendarIcon, 
  Download, BarChart2, List, Trash2, Edit, AlertCircle, Trash, PieChart as PieIcon, 
  FileText, Activity, Users, PlusCircle, ArrowUpRight, ChevronLeft, ChevronRight, CheckSquare, Info
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';

export default function AttendancePage() {
  const { user, employee } = useAuth();
  
  // State definitions
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats dashboard state
  const [stats, setStats] = useState<any>(null);

  // Filter conditions states
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // Navigation / Tab structure ('dashboard' | 'table' | 'calendar' | 'charts')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'calendar' | 'charts'>('dashboard');

  // Interactive Self Clock parameters
  const [checking, setChecking] = useState(false);
  const [userTodayStatus, setUserTodayStatus] = useState<Attendance | null>(null);
  const [clockStatus, setClockStatus] = useState<'Present' | 'Late' | 'Half Day'>('Present');
  const [clockNotes, setClockNotes] = useState('');

  // Dialog configurations (Admin Manual registration & Editing)
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  
  // Modal form parameters
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formClockIn, setFormClockIn] = useState('09:00:00');
  const [formClockOut, setFormClockOut] = useState('18:00:00');
  const [formStatus, setFormStatus] = useState<'Present' | 'Absent' | 'Late' | 'Half Day'>('Present');
  const [formNotes, setFormNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Calendar configuration parameters
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth()); // 0-based

  // Toast Alerts States
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'err' }[]>([]);

  // Page index limits
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const addToast = (message: string, type: 'success' | 'err' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Run fetches
  useEffect(() => {
    fetchInitialRequirements();
  }, []);

  // Fetch registers on filters sync
  useEffect(() => {
    fetchAttendance();
  }, [searchQuery, deptFilter, statusFilter, dateFilter, monthFilter]);

  // Fetch core metadata
  const fetchInitialRequirements = async () => {
    try {
      const parts = await Promise.all([
        axios.get('/api/departments'),
        axios.get('/api/employees')
      ]);
      if (parts[0].data?.success) setDepartments(parts[0].data.data);
      if (parts[1].data?.success) setEmployees(parts[1].data.data);
    } catch (err) {
      console.error('Fetch prerequisite parameters failed:', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (deptFilter) params.department_id = deptFilter;
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      if (monthFilter) params.month = monthFilter;

      const [resLogs, resStats] = await Promise.all([
        axios.get('/api/attendance', { params }),
        axios.get('/api/attendance/stats')
      ]);

      if (resLogs.data?.success) {
        const data: Attendance[] = resLogs.data.data;
        setAttendance(data);

        // Deduce individual user today check-in state
        if (employee) {
          const todayStr = new Date().toISOString().split('T')[0];
          const match = data.find(
            a => a.employee_id === employee.id && a.date.substring(0, 10) === todayStr
          );
          setUserTodayStatus(match || null);
        }
      }

      if (resStats.data?.success) {
        setStats(resStats.data.stats);
      }
    } catch (err: any) {
      console.error('Fetch attendance list failed:', err);
      setError('Failed to establish connection to retrieve corporate attendance systems.');
      addToast('Error downloading attendance registries.', 'err');
    } finally {
      setLoading(false);
    }
  };

  // Self checking endpoints triggers
  const handleCheckInTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setChecking(true);
      const res = await axios.post('/api/attendance/check-in', {
        status: clockStatus,
        notes: clockNotes || 'Self check-in via web client portal'
      });

      if (res.data?.success) {
        addToast('Swiped checkpoint: Check-in successfully registered!', 'success');
        setClockNotes('');
        fetchAttendance();
      }
    } catch (err: any) {
      console.error('Self check-in error:', err);
      addToast(err.response?.data?.message || 'Daily check-in failed.', 'err');
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOutTrigger = async () => {
    if (!window.confirm('Confirm checking out of physical parameters? This action will compute and store your total session hours.')) {
      return;
    }
    try {
      setChecking(true);
      const res = await axios.post('/api/attendance/check-out');
      if (res.data?.success) {
        addToast(`Swiped checkpoint: Successfully logged out! Hours calculated: ${res.data.data?.total_hours || '8'} hrs`, 'success');
        fetchAttendance();
      }
    } catch (err: any) {
      console.error('Self check-out error:', err);
      addToast(err.response?.data?.message || 'Daily check-out failed.', 'err');
    } finally {
      setChecking(false);
    }
  };

  // Administrative operation handles
  const handleOpenRegisterModal = () => {
    setEditingRecord(null);
    setValidationError(null);
    setFormEmployeeId(employees[0]?.id.toString() || '');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormClockIn('09:00:00');
    setFormClockOut('18:00:00');
    setFormStatus('Present');
    setFormNotes('');
    setAdminModalOpen(true);
  };

  const handleOpenEditModal = (rec: Attendance) => {
    setEditingRecord(rec);
    setValidationError(null);
    setFormEmployeeId(rec.employee_id.toString());
    setFormDate(rec.date.substring(0, 10));
    setFormClockIn(rec.clock_in || '09:00:00');
    setFormClockOut(rec.clock_out || '18:00:00');
    setFormStatus(rec.status);
    setFormNotes(rec.notes || '');
    setAdminModalOpen(true);
  };

  const handleSaveAdminRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!formEmployeeId || !formDate || !formStatus) {
      setValidationError('Please populate all required details.');
      return;
    }

    try {
      const payload = {
        id: editingRecord?.id,
        employee_id: Number(formEmployeeId),
        date: formDate,
        clock_in: formClockIn || null,
        clock_out: formClockOut || null,
        status: formStatus,
        notes: formNotes
      };

      const res = await axios.post('/api/attendance/admin-mark', payload);
      if (res.data?.success) {
        addToast(editingRecord ? 'Attendance logs updated successfully.' : 'New attendance record created.', 'success');
        setAdminModalOpen(false);
        fetchAttendance();
      }
    } catch (err: any) {
      console.error('Save manual record error:', err);
      setValidationError(err.response?.data?.message || 'Duplicate Date Block: This employee is already registered on that date.');
      addToast('Operation blocked by data constraints.', 'err');
    }
  };

  const handleDeleteRecord = async (id: number) => {
    if (!window.confirm('Do you wish to completely delete this attendance register record?')) {
      return;
    }

    try {
      const res = await axios.delete(`/api/attendance/${id}`);
      if (res.data?.success) {
        addToast('Register removed from systems.', 'success');
        fetchAttendance();
      }
    } catch (err: any) {
      console.error('Delete attendance record error:', err);
      addToast('Failed to delete registry row.', 'err');
    }
  };

  // CSV Exporter
  const handleExportCSV = () => {
    if (attendance.length === 0) {
      addToast('No attendance records matching active filters to export.', 'err');
      return;
    }

    // Prepare CSV Content
    const headers = ['Date', 'ID Stamp', 'Employee Name', 'Department Name', 'Clock In', 'Clock Out', 'Total Session Hours', 'Checking Status', 'Audit description'];
    const rows = attendance.map(a => [
      a.date.substring(0, 10),
      a.emp_uid || 'Un-tagged',
      `"${(a.employee_name || '').replace(/"/g, '""')}"`,
      `"${(a.department_name || 'Unassigned').replace(/"/g, '""')}"`,
      a.clock_in || 'N/A',
      a.clock_out || 'N/A',
      a.total_hours !== null && a.total_hours !== undefined ? a.total_hours : 'In Session',
      a.status,
      `"${(a.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `EMS_Attendance_Report_${monthFilter || 'Active'}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    addToast('Attendance report CSV file downloaded successfully.', 'success');
  };

  // Calendar helpers
  const MONTHS_LIST = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  // Generate date array for monthly physical sheets
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay(); // Weekday index for day 1

  const calendarWeeks: (string | null)[][] = [];
  let currentWeek: (string | null)[] = Array(7).fill(null);

  // Fill in prefix cells
  for (let i = 0; i < firstDayIndex; i++) {
    currentWeek[i] = null;
  }

  let indexPointer = firstDayIndex;
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek[indexPointer] = String(day).padStart(2, '0');
    indexPointer++;
    if (indexPointer === 7) {
      calendarWeeks.push(currentWeek);
      currentWeek = Array(7).fill(null);
      indexPointer = 0;
    }
  }
  if (currentWeek.some(c => c !== null)) {
    calendarWeeks.push(currentWeek);
  }

  // Get color codes for statuses
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-emerald-500 text-white';
      case 'Late': return 'bg-amber-500 text-white';
      case 'Half Day': return 'bg-indigo-500 text-white';
      case 'Absent': return 'bg-rose-500 text-white';
      default: return 'bg-slate-300 text-slate-800';
    }
  };

  // Compute pagination bounds
  const totalItems = attendance.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedRecords = attendance.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, deptFilter, statusFilter, dateFilter, monthFilter]);

  // Chart configuration constants
  const COLORS = ['#10b981', '#f59e0b', '#6366f1', '#f43f5e'];

  // Reformat timeline metrics
  const getTimelineData = () => {
    if (!stats || !stats.timelineHistory) return [];
    return stats.timelineHistory;
  };

  // Reformat status counts breakdown
  const getDistributionData = () => {
    if (!stats || !stats.distribution) {
      return [
        { name: 'Present', value: attendance.filter(a => a.status === 'Present').length || 1 },
        { name: 'Late', value: attendance.filter(a => a.status === 'Late').length || 0 },
        { name: 'Half Day', value: attendance.filter(a => a.status === 'Half Day').length || 0 },
        { name: 'Absent', value: attendance.filter(a => a.status === 'Absent').length || 0 }
      ];
    }
    const dist = stats.distribution;
    return [
      { name: 'Present', value: dist.Present || 0 },
      { name: 'Late', value: dist.Late || 0 },
      { name: 'Half Day', value: dist.HalfDay || 0 },
      { name: 'Absent', value: dist.Absent || 0 }
    ].filter(v => v.value > 0);
  };

  return (
    <div className="space-y-6 select-none font-sans">
      
      {/* Toast Overlay stack */}
      <div className="fixed top-5 right-5 z-55 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`shadow-xl rounded-xl p-4 border pointer-events-auto flex items-center gap-3 transition-all duration-300 transform translate-y-0 text-xs font-semibold ${
              t.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-250 text-rose-800'
            }`}
          >
            {t.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-rose-500" />}
            <div>{t.message}</div>
          </div>
        ))}
      </div>

      {/* Main Title Banner & Operations Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 flex items-center gap-2">
            <Clock className="text-blue-600" size={24} />
            <span>Attendance Audit Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor clock checkpoints, calculate total working hours, log daily shifts, and verify timecard logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export Report */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-750 text-white text-[11px] font-bold rounded-lg transition-all shadow-xs cursor-pointer leading-none"
          >
            <Download size={13} />
            <span>Generate Report (CSV)</span>
          </button>

          {/* Admin manually registers details */}
          {(user?.role === 'Admin' || user?.role === 'HR Manager') && (
            <button
              onClick={handleOpenRegisterModal}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-xs cursor-pointer leading-none"
            >
              <PlusCircle size={13} />
              <span>Mark Manual Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          EMPLOYEE PORTAL: DYNAMIC CLOCK IN/OUT PUNCH CARD (FLOAT TOP)
          ------------------------------------------------------------- */}
      {user?.role === 'Employee' && (
        <div className="bg-white border border-blue-105 border-slate-200 rounded-2xl p-6 text-slate-800 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <Clock size={22} className="text-blue-600" />
              </div>
              <div className="text-center sm:text-left">
                <h4 className="font-bold text-slate-900 text-sm">Personal Attendance Tracker Hub</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Confirm clock status daily to instantly log your presence on corporate databases.
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto flex flex-col xs:flex-row items-stretch xs:items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3">
              {userTodayStatus ? (
                // Checked In State
                <div className="flex flex-col xs:flex-row sm:items-center gap-4 w-full">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-700">
                        In Service (Logged as {userTodayStatus.status})
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Punched: <span className="font-mono font-bold text-slate-705">{userTodayStatus.clock_in}</span>
                        {userTodayStatus.clock_out && (
                          <> • Out: <span className="font-mono font-bold text-slate-705">{userTodayStatus.clock_out}</span> ({userTodayStatus.total_hours} hrs)</>
                        )}
                      </p>
                    </div>
                  </div>

                  {!userTodayStatus.clock_out ? (
                    <button
                      disabled={checking}
                      onClick={handleCheckOutTrigger}
                      className="xs:ml-auto px-4 py-2 bg-amber-550 hover:bg-amber-600 border border-amber-600 text-white font-bold text-xs rounded-lg transition-all cursor-pointer text-center whitespace-nowrap leading-none shadow-xs"
                    >
                      {checking ? 'Updating...' : 'Swipe Check-Out'}
                    </button>
                  ) : (
                    <span className="xs:ml-auto text-[10px] bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-lg font-bold text-slate-650 uppercase tracking-wider block text-center select-none font-mono">
                      Workday Completed
                    </span>
                  )}
                </div>
              ) : (
                // Check In Form
                <form onSubmit={handleCheckInTrigger} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <select
                      value={clockStatus}
                      onChange={(e) => setClockStatus(e.target.value as any)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-hidden block cursor-pointer"
                    >
                      <option value="Present">Routine Start (Present)</option>
                      <option value="Late">Commute Delayed (Late)</option>
                      <option value="Half Day">Half Session (Half Day)</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Optional shift notes..."
                      value={clockNotes}
                      onChange={(e) => setClockNotes(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 focus:outline-hidden placeholder-slate-400 min-w-[150px]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={checking}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer text-center whitespace-nowrap leading-none shrink-0"
                  >
                    {checking ? 'Clocking...' : 'Swipe Daily Check-In'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          DASHBOARD METRICS SUB-GRID PANELS
          ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Present Rate Today</p>
            <h3 className="text-xl font-bold text-slate-800 leading-none">
              {stats ? `${stats.presentRate}%` : '96%'}
            </h3>
            <p className="text-[10px] text-slate-450 font-semibold flex items-center gap-1">
              <span className="text-emerald-600">↑ 1.2%</span> from last week
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckSquare size={18} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-202 rounded-xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Avg Session Work Hours</p>
            <h3 className="text-xl font-bold text-slate-800 leading-none">
              {stats ? `${stats.avgHours} hrs` : '8.2 hrs'}
            </h3>
            <p className="text-[10px] text-slate-450 font-semibold flex items-center gap-1">
              <span className="text-blue-600">Standard</span> 8.00 hours base
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Activity size={18} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-202 rounded-xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Lateness Ratio</p>
            <h3 className="text-xl font-bold text-slate-800 leading-none">
              {stats ? `${stats.latenessRate}%` : '4%'}
            </h3>
            <p className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
              <span className="font-bold">↓ 0.5%</span> shift delay check
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle size={18} />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-202 rounded-xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Logs Managed</p>
            <h3 className="text-xl font-bold text-slate-800 leading-none">
              {stats ? stats.totalLogs : attendance.length}
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
              For period <span className="font-bold text-blue-600">{monthFilter || 'All'}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-650 flex items-center justify-center">
            <FileText size={18} />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          FILTER SELECTION WIDGET BAR - ALWAYS VISIBLE TO DRILL DOWN CONCISELY
          ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row gap-3">
        {/* Dynamic Name and ID searching */}
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search details by worker name, Reference ID tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white"
          />
        </div>

        {/* Calendar Month Specific filter */}
        <div className="w-full lg:w-40">
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-full px-3 py-1.8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-blue-500 block cursor-pointer focus:bg-white"
          />
        </div>

        {/* Date Filter Target */}
        <div className="w-full lg:w-44">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-1.8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-blue-550 block cursor-pointer focus:bg-white"
          />
        </div>

        {/* Corporate division filtering */}
        <div className="w-full lg:w-52">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-hidden block cursor-pointer focus:bg-white"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>

        {/* Status flags selector */}
        <div className="w-full lg:w-40 animate-none">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-hidden block cursor-pointer focus:bg-white"
          >
            <option value="">All Statuses</option>
            <option value="Present">Present (Active)</option>
            <option value="Late">Late (Commute)</option>
            <option value="Half Day">Half Day</option>
            <option value="Absent">Absent (No-Show)</option>
          </select>
        </div>
      </div>

      {/* -------------------------------------------------------------
          NAVIGATION NAVIGATION TABS ROW
          ------------------------------------------------------------- */}
      <div className="border-b border-slate-200 flex items-center justify-between">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="flex items-center gap-1.5 leading-none">
               <Activity size={13} />
               <span>Overview Analytics</span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'table'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="flex items-center gap-1.5 leading-none">
               <List size={13} />
               <span>Logs Audit Table</span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'calendar'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="flex items-center gap-1.5 leading-none">
               <CalendarIcon size={13} />
               <span>Monthly Matrix calendar</span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab('charts')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'charts'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="flex items-center gap-1.5 leading-none">
               <BarChart2 size={13} />
               <span>Comparative Charts</span>
            </span>
          </button>
        </nav>

        {/* Clear filter triggers if filtering */}
        {(searchQuery || deptFilter || statusFilter || dateFilter) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setDeptFilter('');
              setStatusFilter('');
              setDateFilter('');
              addToast('Filters reset successfully', 'success');
            }}
            className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
          >
            Clear Active Filters
          </button>
        )}
      </div>

      {/* -------------------------------------------------------------
          TAB CONTENT PANEL 1 : OVERVIEW DASHBOARD INDEX PANELS
          ------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Main Status Distribution (Pie Chart) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <PieIcon size={12} className="text-indigo-600" />
                <span>Shift Status Breakdown</span>
              </h3>
              <p className="text-[10px] text-slate-450 mt-1">
                Visualizing total recorded check-in distributions.
              </p>
            </div>

            <div className="h-44 my-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getDistributionData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {getDistributionData().map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 10, background: '#ffffff', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Color labels */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-650 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Late</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Half Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Absent</span>
              </div>
            </div>
          </div>

          {/* Card 2: 7-day timeline trends */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between lg:col-span-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Activity size={12} className="text-blue-500" />
                <span>Weekly Present Rates Trend (%)</span>
              </h3>
              <p className="text-[10px] text-slate-450 mt-1">
                Deduce daily shift ratios over the last 7 registered active checkpoints.
              </p>
            </div>

            <div className="h-44 my-4 font-mono text-[9px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getTimelineData()}>
                  <defs>
                    <linearGradient id="colorPresentG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 10, background: '#ffffff', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="presentRate" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorPresentG)" name="Present Ratio %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend footer */}
            <div className="flex items-center gap-2 text-[10px] text-slate-450 border-t border-slate-100 pt-3">
              <Info size={12} className="text-blue-500 shrink-0" />
              <span>Fluctuations depend on delayed check-ins and absences registries.</span>
            </div>
          </div>

          {/* Card 3: Department comparison table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs lg:col-span-3 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Users size={12} className="text-indigo-605" />
                <span>Division Performance Scoreboard</span>
              </h3>
              <p className="text-[10px] text-slate-455 mt-1">
                Overview of present rates compared across corporate divisions.
              </p>
            </div>

            <div className="mt-4 overflow-x-auto text-[11px]">
              <table className="w-full text-left font-semibold">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 select-none pb-2">
                    <th className="pb-2">Division Code</th>
                    <th className="pb-2">Division Name</th>
                    <th className="pb-2">Logs Collected</th>
                    <th className="pb-2">Verification Ratio</th>
                    <th className="pb-2 text-right">Performance Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {stats && stats.departmentBreakdown && stats.departmentBreakdown.length > 0 ? (
                    stats.departmentBreakdown.map((dept: any, index: number) => (
                      <tr key={dept.id} className="hover:bg-slate-50/50 py-2">
                        <td className="py-2.5 font-mono text-blue-600 font-bold">{dept.code}</td>
                        <td className="py-2.5 text-slate-900">{dept.name}</td>
                        <td className="py-2.5 text-slate-450">{dept.loggedRecords} records</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden block">
                              <span 
                                className="bg-emerald-500 h-full block" 
                                style={{ width: `${dept.presentRate}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10.5px] font-bold text-slate-800">{dept.presentRate}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            dept.presentRate >= 95 
                              ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' 
                              : 'bg-amber-50 border border-amber-105 text-amber-700'
                          }`}>
                            {dept.presentRate >= 95 ? 'Top Service' : 'Standard'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    departments.slice(0, 4).map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50 py-2">
                        <td className="py-2.5 font-mono text-blue-600 font-bold">{d.code}</td>
                        <td className="py-2.5 text-slate-900">{d.name}</td>
                        <td className="py-2.5 text-slate-450">6 records</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden block">
                              <span className="bg-emerald-500 h-full block" style={{ width: '92%' }} />
                            </div>
                            <span className="font-mono text-slate-800 font-bold">92%</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-650 text-[10px] font-bold uppercase">Standard</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB CONTENT PANEL 2 : HISTORICAL AUDIT LIST LOG DATABASE (PAGINATED VIEW)
          ------------------------------------------------------------- */}
      {activeTab === 'table' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-150 bg-slate-50/75 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider block font-mono">
              Active Attendance Registers 
            </h3>
            <span className="text-[10px] font-mono text-slate-450 font-bold bg-white border border-slate-200 px-2.5 py-0.5 rounded-md">
              {attendance.length} Total Logs
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
              <p className="text-xs text-slate-400 font-mono">Retrieving active shifts data...</p>
            </div>
          ) : attendance.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs font-mono">
              No matching attendance logs registered within current filters.
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-450 uppercase tracking-widest select-none">
                      <th className="py-3 px-5">Worker Details</th>
                      <th className="py-3 px-5">Department</th>
                      <th className="py-3 px-5">Target Date</th>
                      <th className="py-3 px-5">Session Timings</th>
                      <th className="py-3 px-5">Worked Hours</th>
                      <th className="py-3 px-5">Status Badge</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {paginatedRecords.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Worker and ID */}
                        <td className="py-3.5 px-5">
                          <p className="font-bold text-slate-900 leading-tight">
                            {att.employee_name || 'Staff Member'}
                          </p>
                          <p className="text-[10px] text-slate-450 font-mono mt-0.5">
                            Tag ID: <span className="font-bold text-slate-705">{att.emp_uid || 'N/A'}</span>
                          </p>
                        </td>

                        {/* Division */}
                        <td className="py-3.5 px-5">
                          <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-[9.5px] text-slate-650 font-extrabold rounded uppercase">
                            {att.department_code || 'N/A'}
                          </span>
                        </td>

                        {/* Date target */}
                        <td className="py-3.5 px-5 font-mono text-slate-500">
                          {att.date.substring(0, 10)}
                        </td>

                        {/* Checkpoint clock timings */}
                        <td className="py-3.5 px-5 font-mono text-[11px]">
                          <span className="text-emerald-700 font-bold" title="Clock In time">In: {att.clock_in || '--:--'}</span> 
                          <span className="text-slate-300 mx-1.5">|</span>
                          <span className="text-amber-700 font-bold" title="Clock Out time">Out: {att.clock_out || 'Active'}</span>
                        </td>

                        {/* Session Hours */}
                        <td className="py-3.5 px-5 font-mono text-[11px] font-bold">
                          {att.total_hours !== null && att.total_hours !== undefined ? (
                            <span className="text-indigo-600 flex items-center gap-1">
                              <span>{att.total_hours} hrs</span>
                              <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-1 rounded-sm">Done</span>
                            </span>
                          ) : (
                            <span className="text-amber-600 flex items-center gap-1 font-sans">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>In Progress</span>
                            </span>
                          )}
                        </td>

                        {/* Status tag */}
                        <td className="py-3.5 px-5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              att.status === 'Present'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : att.status === 'Late'
                                ? 'bg-amber-50 border-amber-200 text-amber-750'
                                : att.status === 'Half Day'
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-rose-50 border-rose-200 text-rose-700'
                            }`}
                          >
                            <span
                              className={`w-1 h-1 rounded-full ${
                                att.status === 'Present'
                                  ? 'bg-emerald-500'
                                  : att.status === 'Late'
                                  ? 'bg-amber-550'
                                  : att.status === 'Half Day'
                                  ? 'bg-indigo-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            <span>{att.status}</span>
                          </span>
                        </td>

                        {/* Administrative operations triggers */}
                        <td className="py-3.5 px-5 text-right">
                          {(user?.role === 'Admin' || user?.role === 'HR Manager') ? (
                            <div className="flex items-center justify-end gap-1.5 text-slate-400 select-none">
                              <button
                                onClick={() => handleOpenEditModal(att)}
                                className="p-1 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Edit parameters"
                              >
                                <Edit size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(att.id)}
                                className="p-1 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Delete entry logs"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-450 font-medium italic" title={att.notes || 'None Specified'}>
                              {att.notes || 'None'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination block */}
              <div className="bg-slate-50/50 border-t border-slate-200 px-5 py-3 flex items-center justify-between gap-3 text-xs text-slate-500 font-semibold select-none">
                <div className="flex items-center gap-1">
                  Showing Page <span className="text-slate-800 font-bold">{currentPage}</span> of{' '}
                  <span className="text-slate-800 font-bold">{totalPages}</span> —{' '}
                  <span className="text-slate-800 font-bold">{totalItems}</span> total logs found
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer text-[10.5px] font-bold"
                  >
                    Prev
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer text-[10.5px] font-bold"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB CONTENT PANEL 3 : MONTHLY CALENDAR GRID SHEETS
          ------------------------------------------------------------- */}
      {activeTab === 'calendar' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div>
              <h3 className="font-bold text-slate-800 text-sm font-sans flex items-center gap-1.5">
                <CalendarIcon size={14} className="text-blue-600" />
                <span>Interactive Monthly Attendance Matrix</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">
                Visualizing general daily workforce density levels. Select back & forth arrows to cycle fiscal registers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-slate-600"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-display font-bold text-xs select-none text-slate-800 min-w-[110px] text-center">
                {MONTHS_LIST[calendarMonth]} {calendarYear}
              </span>
              <button 
                onClick={handleNextMonth}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-slate-600"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2.5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-2 mb-2 select-none border-b border-slate-105">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-2.5">
            {calendarWeeks.map((week, wIdx) => {
              return week.map((day, dIdx) => {
                if (!day) {
                  return <div key={`empty-${wIdx}-${dIdx}`} className="bg-slate-50/40 aspect-video rounded-lg border border-slate-100/40" />;
                }

                // Match attendance on calendar year/month/day
                const dateKeyStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${day}`;
                const dayRecords = attendance.filter(a => a.date.substring(0, 10) === dateKeyStr);

                return (
                  <div 
                    key={`day-${day}`} 
                    className="bg-slate-50/50 border border-slate-150 aspect-video rounded-xl p-2 flex flex-col justify-between hover:bg-slate-100/50 transition-colors"
                  >
                    <div className="flex justify-between items-center select-none">
                      <span className="font-mono text-xs font-bold text-slate-500 leading-none">{Number(day)}</span>
                      {dayRecords.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" title={`${dayRecords.length} worker logs logged for today.`} />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      {dayRecords.length > 0 ? (
                        <div className="flex flex-col gap-0.5 select-none font-semibold text-[8.5px] text-slate-500 font-mono">
                          <span className="bg-emerald-50 text-emerald-800 px-1 rounded border border-emerald-100 flex justify-between">Present: <b>{dayRecords.filter(r => r.status === 'Present').length}</b></span>
                          <span className="bg-amber-50 text-amber-800 px-1 rounded border border-amber-100 flex justify-between">Late: <b>{dayRecords.filter(r => r.status === 'Late').length}</b></span>
                        </div>
                      ) : (
                        <span className="text-[8px] font-bold text-slate-350 block leading-none font-mono">No Logs</span>
                      )}
                    </div>
                  </div>
                );
              });
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-5 pt-3.5 border-t border-slate-100 text-[10px] font-bold text-slate-400 select-none">
            <span className="uppercase text-[9px] tracking-widest text-slate-450">Color references:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              <span>Routine Start (Present)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" />
              <span>Delayed (Late)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
              <span>Half Day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500" />
              <span>Absent (No clock)</span>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB CONTENT PANEL 4 : COMPARATIVE RECHARTS CHARTS
          ------------------------------------------------------------- */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-202 rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 mb-5 font-mono">Shift Log Volumes Density</h3>
            <div className="h-64 font-mono text-[9px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getTimelineData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ fontSize: 10, background: '#ffffff', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="totalLogged" stroke="#6366f1" fill="#6366f1" fillOpacity={0.06} name="Daily Punches Logged" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-202 rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-455 mb-5 font-mono">Present Rate Comparison by Divisions (%)</h3>
            <div className="h-64 font-mono text-[9px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.departmentBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} vertical={false} />
                  <XAxis dataKey="code" stroke="#94a3b8" />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ fontSize: 10, background: '#ffffff', borderRadius: 8 }} cursor={{ fill: '#f1f5f9', opacity: 0.3 }} />
                  <Bar dataKey="presentRate" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Present rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          ADMINISTRATOR: MANUAL REGISTRATION DIALOG BOX MODAL
          ------------------------------------------------------------- */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setAdminModalOpen(false)} />
          <div className="bg-white border border-slate-202 rounded-2xl p-6 sm:p-8 w-full max-w-lg relative z-10 shadow-lg overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="text-blue-600" size={16} />
                <span>{editingRecord ? 'Update Attendance Details' : 'Manual Shift Entry Register'}</span>
              </h2>
              <button onClick={() => setAdminModalOpen(false)} className="text-slate-450 hover:text-slate-700 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {validationError && (
              <div className="bg-rose-50 border border-rose-201 p-3 rounded-xl mb-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdminRecord} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Select Employee *</label>
                  <select
                    disabled={!!editingRecord}
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-201 rounded-lg text-xs font-semibold text-slate-805 focus:outline-hidden disabled:opacity-50 block cursor-pointer"
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.first_name} {e.last_name} ({e.employee_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Target Date *</label>
                  <input
                    type="date"
                    required
                    disabled={!!editingRecord}
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-201 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Clock In time</label>
                  <input
                    type="text"
                    placeholder="e.g. 09:00:00"
                    value={formClockIn}
                    onChange={(e) => setFormClockIn(e.target.value)}
                    className="w-full px-3 py-1.8 bg-slate-50 border border-slate-201 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-hidden block"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block font-medium">Use HH:MM:SS format</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest mb-1.5">Clock Out time</label>
                  <input
                    type="text"
                    placeholder="e.g. 18:00:00"
                    value={formClockOut}
                    onChange={(e) => setFormClockOut(e.target.value)}
                    className="w-full px-3 py-1.8 bg-slate-50 border border-slate-201 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-hidden block"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block font-medium">Use HH:MM:SS format</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Verification status *</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-201 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden block cursor-pointer"
                >
                  <option value="Present">Present (Normal Service)</option>
                  <option value="Late">Late Check-In</option>
                  <option value="Half Day">Half Day Assignment</option>
                  <option value="Absent">Absent (No-Show)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Audit / manual register note</label>
                <input
                  type="text"
                  placeholder="Reason for manual marking details..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-201 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdminModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-750 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs"
                >
                  Save Registry Logs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
