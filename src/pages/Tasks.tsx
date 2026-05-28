import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { CheckCircle2, Circle, AlertCircle, Clock, Plus, Target, User, ChevronRight, Activity, Calendar } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  created_by: number;
  created_at: string;
  creator_name: string;
  assignments: { id: number; full_name: string; designation: string }[];
}

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  job_title: string;
}

export default function Tasks() {
  const { user, employee } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  // Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const canManage = user?.role === 'Admin' || user?.role === 'HR Manager';

  const fetchTasksAndTeammates = async () => {
    try {
      setLoading(true);
      const [tasksRes, empsRes] = await Promise.all([
        axios.get('/api/tasks'),
        canManage ? axios.get('/api/employees') : Promise.resolve({ data: { data: [] } })
      ]);
      
      setTasks(tasksRes.data.data || []);
      if (canManage) {
        setEmployees(empsRes.data.data || []);
      }
      setError('');
    } catch (err: any) {
      console.error('Fetch tasks/employees error:', err);
      setError('Failed to download system objective records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndTeammates();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    try {
      setFormLoading(true);
      setError('');
      await axios.post('/api/tasks', {
        title,
        description,
        priority,
        due_date: dueDate,
        assigneeIds: selectedAssignees
      });
      
      setSuccess('Task assigned successfully.');
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setDueDate('');
      setSelectedAssignees([]);
      setShowCreateModal(false);
      fetchTasksAndTeammates();
    } catch (err: any) {
      console.error('Submit task error:', err);
      setError(err.response?.data?.message || 'Failed to dispatch new corporate objective.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, currentStatus: string) => {
    const statuses = ['Todo', 'In Progress', 'Completed'];
    const nextIdx = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    const nextStatus = statuses[nextIdx];

    try {
      await axios.put(`/api/tasks/${id}`, { status: nextStatus });
      
      // Update local state smoothly
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));
    } catch (err: any) {
      console.error('Update status error:', err);
      setError('Could not update task status.');
    }
  };

  const toggleAssignee = (id: number) => {
    setSelectedAssignees(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Filter & Search Logic
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          t.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;

    // Standard employee sees only their assigned tasks unless they are admin/HR
    if (!canManage && employee) {
      const isAssigned = t.assignments.some(a => a.id === employee.id);
      return matchesSearch && matchesStatus && matchesPriority && isAssigned;
    }

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityBadgeColor = (p: string) => {
    switch (p) {
      case 'Critical': return 'bg-rose-50 dark:bg-rose-950/35 text-rose-700 dark:text-rose-450 border-rose-200 dark:border-rose-900/40';
      case 'High': return 'bg-orange-50 dark:bg-orange-950/35 text-orange-700 dark:text-orange-450 border-orange-200 dark:border-orange-900/40';
      case 'Medium': return 'bg-blue-50 dark:bg-blue-950/35 text-blue-700 dark:text-blue-405 border-blue-202 dark:border-blue-900/40';
      default: return 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800';
    }
  };

  const getStatusBadgeIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 size={15} className="text-emerald-500 dark:text-emerald-400" />;
      case 'In Progress': return <Activity size={15} className="text-blue-500 dark:text-blue-400 animate-pulse" />;
      default: return <Circle size={15} className="text-slate-400 dark:text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-250 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="text-blue-600 dark:text-blue-400" size={22} />
            <span>Corporate Tasks & Objectives</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {canManage 
              ? 'Assign, audit, and monitor organizational milestones and squad objectives.' 
              : 'View, track, and update status of your active team assignments.'}
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Assign Objectives</span>
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 text-rose-700 dark:text-rose-400 text-xs rounded-r-lg font-medium flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 text-emerald-700 dark:text-emerald-400 text-xs rounded-r-lg font-medium">
          {success}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5Tracking-wider font-mono">Search Tasks</label>
          <input
            type="text"
            placeholder="Filter by title, keywords, parameters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-202 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg focus:outline-hidden focus:border-blue-500 text-slate-705 dark:text-slate-200"
          />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 w-full lg:w-96">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider font-mono">Status Flow</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-800 rounded-lg focus:outline-hidden focus:border-blue-500 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            >
              <option value="All" className="bg-white dark:bg-slate-900">All Tracks</option>
              <option value="Todo" className="bg-white dark:bg-slate-900">To-do List</option>
              <option value="In Progress" className="bg-white dark:bg-slate-900">In Progress</option>
              <option value="Completed" className="bg-white dark:bg-slate-900">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-505 uppercase mb-1.5 tracking-wider font-mono">Priority Label</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-800 rounded-lg focus:outline-hidden focus:border-blue-500 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            >
              <option value="All" className="bg-white dark:bg-slate-900">All Severity</option>
              <option value="Critical" className="bg-white dark:bg-slate-900">Critical</option>
              <option value="High" className="bg-white dark:bg-slate-900">High</option>
              <option value="Medium" className="bg-white dark:bg-slate-900">Medium</option>
              <option value="Low" className="bg-white dark:bg-slate-900">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task Stream Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-3"></div>
          <p className="text-xs text-slate-400 dark:text-slate-505 font-semibold uppercase font-mono tracking-wider animate-pulse">Retaining Objectives...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-slate-400 dark:text-slate-500 text-sm font-semibold">No objectives match the current search filters.</p>
          <p className="text-xs text-slate-400 dark:text-slate-505 mt-1 font-mono">Excellent job completing goals, check back later!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header line row */}
                <div className="flex justify-between items-start gap-2">
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border rounded-full ${getPriorityBadgeColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  
                  <button
                    onClick={() => handleStatusUpdate(task.id, task.status)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-650 dark:text-slate-300 shadow-xs cursor-pointer"
                    title="Click to cycle status"
                  >
                    {getStatusBadgeIcon(task.status)}
                    <span>{task.status}</span>
                  </button>
                </div>

                {/* Info block */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight tracking-tight">{task.title}</h3>
                  <p className="text-xs text-slate-550 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">{task.description}</p>
                </div>

                {/* Deadlines details */}
                <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg">
                  <span className="flex items-center gap-1 leading-none">
                    <Calendar size={13} className="text-slate-400 dark:text-slate-500" />
                    Due {new Date(task.due_date).toLocaleDateString()}
                  </span>
                  <span className="text-slate-300 dark:text-slate-850">•</span>
                  <span className="flex items-center gap-1 leading-none">
                    <User size={13} className="text-slate-400 dark:text-slate-500" />
                    By {task.creator_name}
                  </span>
                </div>
              </div>

              {/* Assignments team bar list */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 font-mono">Assigned Squad</p>
                <div className="flex flex-wrap gap-1.5">
                  {task.assignments && task.assignments.length > 0 ? (
                    task.assignments.map((emp) => (
                      <span
                        key={emp.id}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30 px-2 py-0.5 rounded-md"
                        title={emp.designation}
                      >
                        <User size={10} />
                        {emp.full_name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-405 dark:text-slate-500 italic">No direct assignments</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL WINDOW FOR ASSIGNING OBJECTIVES */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={() => setShowCreateModal(false)} />
          
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-202 dark:border-slate-800 shadow-2xl p-6 z-10 animate-slide-in">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Assign Corporate Objectives</h2>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-mono">Objective Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Migration of critical legacy code layers"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg focus:outline-hidden focus:border-blue-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-505 dark:text-slate-400 uppercase mb-1 font-mono">Detailed Description</label>
                <textarea
                  rows={3}
                  placeholder="Elaborate on objectives, standards, reference resources..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg focus:outline-hidden focus:border-blue-500 text-slate-800 dark:text-slate-100 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-mono">Priority Category</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-800 rounded-lg focus:outline-hidden focus:border-blue-500 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-250"
                  >
                    <option value="Critical" className="bg-white dark:bg-slate-900">🔴 Critical Severity</option>
                    <option value="High" className="bg-white dark:bg-slate-900">🟠 High Priority</option>
                    <option value="Medium" className="bg-white dark:bg-slate-900">🔵 Medium Priority</option>
                    <option value="Low" className="bg-white dark:bg-slate-900">🟢 Low Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-mono">Due Deadline *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-800 rounded-lg focus:outline-hidden focus:border-blue-500 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Teammates Assign Option */}
              <div>
                <label className="block text-[10px] font-bold text-slate-505 dark:text-slate-400 uppercase mb-2 font-mono">Assign Teammates</label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-950">
                  {employees.map((emp) => (
                    <label key={emp.id} className="flex items-center gap-3 px-1 py-0.5 cursor-pointer text-xs select-none">
                      <input
                        type="checkbox"
                        checked={selectedAssignees.includes(emp.id)}
                        onChange={() => toggleAssignee(emp.id)}
                        className="rounded-sm border-slate-350 dark:border-slate-800 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-700 dark:text-slate-200 truncate">{emp.first_name} {emp.last_name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">{emp.job_title}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-505 rounded-lg shadow-sm font-display cursor-pointer"
                >
                  {formLoading ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
