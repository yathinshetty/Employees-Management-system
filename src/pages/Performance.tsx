import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Award, Star, Award as AwardIcon, Plus, User, Calendar, Smile, BookOpen, AlertCircle, FileSpreadsheet, Percent, Target, X } from 'lucide-react';

interface Review {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  designation: string;
  reviewer_id: number;
  reviewer_name: string;
  review_period: string;
  kpi_score: number;
  goals_met: number;
  feedback: string;
  review_date: string;
}

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  job_title: string;
  employee_id: string;
}

export default function Performance() {
  const { user, employee } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal appraisal Form
  const [showModal, setShowModal] = useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [reviewPeriod, setReviewPeriod] = useState('Annual 2026');
  const [kpiScore, setKpiScore] = useState('3.5');
  const [goalsMet, setGoalsMet] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [formLoading, setFormLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('All');

  const canAppraise = user?.role === 'Admin' || user?.role === 'HR Manager';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reviewsRes, empsRes] = await Promise.all([
        axios.get('/api/performance'),
        canAppraise ? axios.get('/api/employees') : Promise.resolve({ data: { data: [] } })
      ]);

      setReviews(reviewsRes.data.data || []);
      if (canAppraise) {
        setEmployees(empsRes.data.data || []);
      }
      setError('');
    } catch (err: any) {
      console.error('Fetch appraisals data error:', err);
      setError('Could not download employee appraisals matrix.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmitAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmployeeId || !reviewPeriod || !kpiScore || !reviewDate) {
      setError('Please fill in all mandatory evaluation fields.');
      return;
    }

    try {
      setFormLoading(true);
      setError('');
      await axios.post('/api/performance', {
        employee_id: Number(targetEmployeeId),
        review_period: reviewPeriod,
        kpi_score: Number(kpiScore),
        goals_met: goalsMet,
        feedback,
        review_date: reviewDate
      });

      setSuccess('Performance appraisal issued successfully.');
      setTargetEmployeeId('');
      setFeedback('');
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Create review error:', err);
      setError(err.response?.data?.message || 'Failed to file appraisal records in database.');
    } finally {
      setFormLoading(false);
    }
  };

  // Filter listings
  const filteredReviews = reviews.filter(r => {
    const matchesSearch = r.employee_name.toLowerCase().includes(search.toLowerCase()) || 
                          r.feedback.toLowerCase().includes(search.toLowerCase()) ||
                          r.designation.toLowerCase().includes(search.toLowerCase());
    const matchesPeriod = periodFilter === 'All' || r.review_period === periodFilter;

    // Standard employee sees only their own appraisals
    if (!canAppraise && employee) {
      return matchesSearch && matchesPeriod && r.employee_id === employee.id;
    }

    return matchesSearch && matchesPeriod;
  });

  const getKPIBadge = (score: number) => {
    if (score >= 4.5) return 'text-emerald-700 bg-emerald-50 border-emerald-205';
    if (score >= 3.5) return 'text-blue-700 bg-blue-50 border-blue-201';
    if (score >= 2.5) return 'text-amber-705 bg-amber-50 border-amber-205';
    return 'text-rose-700 bg-rose-50 border-rose-201';
  };

  return (
    <div className="space-y-6 select-none font-sans pb-12">
      {/* Upper header action banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-205 pb-5">
        <div>
          <h1 className="text-3xl font-black font-display text-slate-905 leading-none">
            Performance Index Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            {canAppraise 
              ? 'Compile formal feedback appraisals, KPI scores, and organization benchmarks.' 
              : 'Audit your appraisal history, formal supervisor comments, and target KPI scoring.'}
          </p>
        </div>

        {canAppraise && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Issue Performance Appraisal</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-201 text-rose-750 text-xs rounded-xl font-semibold flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-201 text-emerald-800 text-xs rounded-xl font-semibold">
          {success}
        </div>
      )}

      {/* Audit table metrics overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center justify-center">
            <Smile size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Average Rating</span>
            <p className="text-lg font-black text-slate-800 mt-0.5 leading-none">
              {filteredReviews.length > 0 
                ? (filteredReviews.reduce((sum, r) => sum + r.kpi_score, 0) / filteredReviews.length).toFixed(2)
                : '0.00'}{' '}
              <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="w-11 h-11 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl flex items-center justify-center">
            <Target size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Met Commitments</span>
            <p className="text-lg font-black text-slate-800 mt-0.5 leading-none">
              {filteredReviews.length > 0 
                ? ((filteredReviews.filter(r => r.goals_met === 1).length / filteredReviews.length) * 100).toFixed(0)
                : '0'}{' '}
              <span className="text-xs text-slate-400 font-normal">% Targets</span>
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="w-11 h-11 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl flex items-center justify-center">
            <BookOpen size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Compiled Reviews</span>
            <p className="text-lg font-black text-slate-800 mt-0.5 leading-none">
              {filteredReviews.length}{' '}
              <span className="text-xs text-slate-400 font-normal">History Logs</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter and listings grid */}
      <div className="bg-white rounded-2xl border border-slate-222 overflow-hidden shadow-xs">
        {/* Head Bar Search toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center w-full gap-4 p-4.5 border-b border-slate-105">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search evaluations by Employee, designations or feedback keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs px-3.5 py-2.2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 text-slate-705 font-semibold placeholder-slate-400 focus:bg-white"
            />
          </div>
          <div className="w-full sm:w-60 shrink-0">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-550 block cursor-pointer focus:bg-white text-slate-655 font-bold"
            >
              <option value="All">All Period Tracks</option>
              <option value="Annual 2025">Annual Fiscal Year 2025</option>
              <option value="Q1 2026">Q1 2026 Assessment</option>
              <option value="Annual 2026">Annual Fiscal Year 2026</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3"></div>
            <p className="text-xs text-slate-450 uppercase font-bold tracking-wider font-mono animate-pulse">Retrieving appraisal logs...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-16 bg-white">
            <p className="text-slate-400 text-xs font-semibold font-mono">No performance appraisals logged in this segment.</p>
            <p className="text-[10.5px] text-slate-400 mt-2 font-medium">Check filters or contact Human Resources to file new assessments.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-450 select-none">
                  <th className="py-4 px-6">Employee Details</th>
                  <th className="py-4 px-4 text-center">Appraisal Track</th>
                  <th className="py-4 px-4 text-center">KPI Score</th>
                  <th className="py-4 px-4 text-center">Goals Standard</th>
                  <th className="py-4 px-6">Executive Evaluation Summary</th>
                  <th className="py-4 px-4 text-center">Assessed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredReviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-blue-500 font-extrabold text-xs select-none">
                          {rev.employee_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 leading-tight">{rev.employee_name}</p>
                          <p className="text-[10px] text-slate-450 font-mono mt-1 font-bold">{rev.designation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-slate-600">
                      {rev.review_period}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 font-black rounded-full border text-xs ${getKPIBadge(rev.kpi_score)}`}>
                        <Star size={11} className="fill-current" />
                        {rev.kpi_score.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {rev.goals_met === 1 ? (
                        <span className="inline-flex px-2.5 py-0.5 bg-emerald-50 border border-emerald-105 text-emerald-700 rounded-md font-bold text-[9.5px] uppercase">
                          Completed Goals
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-0.5 bg-amber-50 border border-amber-105 text-amber-750 rounded-md font-bold text-[9.5px] uppercase">
                          Pending goals
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      <p className="text-slate-600 leading-relaxed font-semibold">{rev.feedback || 'Satisfactory review completed.'}</p>
                      <p className="text-[9.5px] font-bold text-slate-400 mt-1 font-mono uppercase">Reviewer: {rev.reviewer_name}</p>
                    </td>
                    <td className="py-4 px-4 text-center text-slate-500 font-mono font-bold">
                      {rev.review_date.substring(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* THE APPRAISAL CREATION DIALOG WINDOW */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowModal(false)} />
          
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-202 shadow-lg p-6 sm:p-8 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Smile className="text-blue-650" size={16} />
                <span>Format appraisal evaluation feedback</span>
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-450 hover:text-slate-705">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitAppraisal} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Target Personnel Employee *</label>
                <select
                  required
                  value={targetEmployeeId}
                  onChange={(e) => setTargetEmployeeId(e.target.value)}
                  className="w-full text-xs px-3 py-2.2 bg-slate-50 border border-slate-201 rounded-lg focus:outline-hidden focus:border-blue-500 text-slate-800 block cursor-pointer"
                >
                  <option value="">Select teammate to evaluate...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id}) — {emp.job_title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Assessment Segment *</label>
                  <select
                    value={reviewPeriod}
                    onChange={(e) => setReviewPeriod(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-205 rounded-lg focus:outline-hidden focus:border-blue-500 block cursor-pointer"
                  >
                    <option value="Annual 2026">Annual Fiscal Year 2026</option>
                    <option value="Q1 2026">Q1 2026 Assessment</option>
                    <option value="Annual 2025">Annual Fiscal Year 2025</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">KPI Rating score (1.0 - 5.0) *</label>
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    max="5"
                    required
                    value={kpiScore}
                    onChange={(e) => setKpiScore(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-105 select-none hover:bg-slate-100/50 cursor-pointer">
                <input
                  type="checkbox"
                  id="goalsCheckbox"
                  checked={goalsMet}
                  onChange={(e) => setGoalsMet(e.target.checked)}
                  className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="goalsCheckbox" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Team targets and performance goals were thoroughly completed
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Supervisor feedback commentary</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Elaborate on engineering delivery, technical growth, teamwork metrics and future goals."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-550 focus:bg-white text-slate-800 resize-none leading-normal"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Assessment Date *</label>
                <input
                  type="date"
                  required
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-222 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
                >
                  {formLoading ? 'Submitting...' : 'Issue Appraisal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
