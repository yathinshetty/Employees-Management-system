import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Employee, Department } from '../types';
import { 
  Search, Plus, Edit, Trash2, X, Check, Eye, Upload, 
  Phone, Mail, MapPin, DollarSign, Calendar, User, ShieldAlert, Award, FileText
} from 'lucide-react';

export default function Personnel() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination parameters
  const [page, setPage] = useState(1);
  const [limit] = useState(6); // 6 is beautiful for directory density
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);

  // Search and Filter configuration States
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Toast notifications state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);

  // Modal configuration states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [profileViewOpen, setProfileViewOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  // Form states and field validations
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [salary, setSalary] = useState('');
  const [deptId, setDeptId] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [empStatus, setEmpStatus] = useState<'Active' | 'On Leave' | 'Terminated'>('Active');
  const [perfScore, setPerfScore] = useState<'Excellent' | 'Good' | 'Average' | 'Needs Improvement'>('Good');
  const [gender, setGender] = useState('Male');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Add toast notification helper
  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Fetch departments list
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Fetch employees list (syncs with pagination, searching, and filters)
  useEffect(() => {
    fetchEmployees();
  }, [page, searchQuery, deptFilter, statusFilter]);

  const fetchDepartments = async () => {
    try {
      const res = await axios.get('/api/departments');
      if (res.data?.success) {
        setDepartments(res.data.data);
      }
    } catch (err: any) {
      console.error('Fetch departments error:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/employees', {
        params: {
          page,
          limit,
          search: searchQuery,
          department: deptFilter,
          status: statusFilter
        }
      });

      if (res.data?.success) {
        setEmployees(res.data.data);
        setTotalPages(res.data.totalPages || 1);
        setTotalEmployees(res.data.total || 0);
      }
    } catch (err: any) {
      console.error('Fetch directory failure:', err);
      setError('Could not retrieve employee details from the server.');
      addToast('Error downloading employee directory list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Keep pagination bounded during instant searching/filtering reset
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleDeptFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDeptFilter(e.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  // Setup form states for standard new record creation
  const handleOpenCreateModal = () => {
    setEditingEmployee(null);
    setValidationError(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setJobTitle('');
    setSalary('');
    setDeptId(departments[0]?.id.toString() || '1');
    setHireDate(new Date().toISOString().split('T')[0]);
    setEmpStatus('Active');
    setPerfScore('Good');
    setGender('Male');
    setAddress('');
    setEmergencyContact('');
    setAvatarUrl('');
    setModalOpen(true);
  };

  // Setup form states for standard modification updating
  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setValidationError(null);
    setFirstName(emp.first_name);
    setLastName(emp.last_name);
    setEmail(emp.email);
    setPhone(emp.phone || '');
    setJobTitle(emp.job_title);
    setSalary(emp.salary.toString());
    setDeptId(emp.department_id.toString());
    setHireDate(emp.hire_date.substring(0, 10));
    setEmpStatus(emp.status);
    setPerfScore(emp.performance_score || 'Good');
    setGender(emp.gender || 'Male');
    setAddress(emp.address || '');
    setEmergencyContact(emp.emergency_contact || '');
    setAvatarUrl(emp.avatar_url || '');
    setModalOpen(true);
  };

  const handleOpenProfileView = (emp: Employee) => {
    setViewingEmployee(emp);
    setProfileViewOpen(true);
  };

  // Submit and save action
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Mandatories check
    if (!firstName || !lastName || !email || !jobTitle || !salary || !deptId || !hireDate) {
      setValidationError('Please configure all required parameter fields marked *.');
      return;
    }

    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        job_title: jobTitle,
        salary: Number(salary),
        department_id: Number(deptId),
        hire_date: hireDate,
        status: empStatus,
        performance_score: perfScore,
        gender,
        address,
        emergency_contact: emergencyContact,
        avatar_url: avatarUrl
      };

      if (editingEmployee) {
        // PUT update details
        const res = await axios.put(`/api/employees/${editingEmployee.id}`, payload);
        if (res.data?.success) {
          addToast('Changes committed successfully.', 'success');
          setModalOpen(false);
          fetchEmployees();
        }
      } else {
        // POST create profile
        const res = await axios.post('/api/employees', payload);
        if (res.data?.success) {
          addToast('New employee profile registered!', 'success');
          setModalOpen(false);
          fetchEmployees();
        }
      }
    } catch (err: any) {
      console.error('Save employee profile failed:', err);
      setValidationError(err.response?.data?.message || 'Unique Email Conflict: This email key is already registered to a workspace member.');
      addToast('Validation conflict: unique email required.', 'error');
    }
  };

  // Delete profile triggers
  const handleDeleteEmployee = async (id: number) => {
    if (!window.confirm("Complete permanent severance? This removes the employee identity, associated logs, payrolls, and registers from the active database system.")) {
      return;
    }

    try {
      const res = await axios.delete(`/api/employees/${id}`);
      if (res.data?.success) {
        addToast('Identity removed from database.', 'success');
        fetchEmployees();
      }
    } catch (err: any) {
      console.error('Delete employee profile failed:', err);
      addToast('Incomplete action: Profile has dependent shift registers.', 'error');
    }
  };

  return (
    <div className="space-y-6 select-none font-sans pb-12">
      {/* Toast Overlay stack */}
      <div className="fixed top-5 right-5 z-55 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`shadow-xl rounded-xl p-4 border pointer-events-auto flex items-center gap-3 transition-all duration-300 transform translate-y-0 text-xs font-semibold ${
              t.type === 'success'
                ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                : 'bg-rose-50 border-rose-250 text-rose-800'
            }`}
          >
            {t.type === 'success' ? <Check size={16} className="text-emerald-500" /> : <ShieldAlert size={16} className="text-rose-500" />}
            <div>{t.message}</div>
          </div>
        ))}
      </div>

      {/* Title Header area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-205 pb-5">
        <div>
          <h1 className="text-3xl font-black font-display text-slate-900 leading-none">
            Directory Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Administer profiles, compensate allocations, trace onboarding details, and edit personnel contacts.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer leading-none shadow-xs"
        >
          <Plus size={14} />
          <span>Add New Worker profile</span>
        </button>
      </div>

      {/* FILTER SEARCH RIG */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search directory by employee name, job title, email ID..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-805 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="w-full md:w-52">
          <select
            value={deptFilter}
            onChange={handleDeptFilterChange}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-655 focus:outline-hidden block cursor-pointer focus:bg-white"
          >
            <option value="">All Divisions</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-44">
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-655 focus:outline-hidden block cursor-pointer focus:bg-white"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Terminated">Terminated</option>
          </select>
        </div>
      </div>

      {/* EMPLOYEE PORTALS LIST GRID CONTAINER */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3.5" />
          <p className="text-xs text-slate-400 font-mono">Compiling registers...</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 text-xs font-mono">
          No personnel files matching searching filters logged in registry directory.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map((emp) => (
              <div 
                key={emp.id} 
                className="bg-white border border-slate-202 hover:border-blue-400 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all group relative overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Photo Row & basic details */}
                  <div className="flex items-start gap-3.5">
                    {emp.avatar_url ? (
                      <img 
                        src={emp.avatar_url} 
                        alt="Emp Avatar" 
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-inner group-hover:scale-103 transition-transform" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-black tracking-tighter shadow-xs uppercase select-none font-mono">
                        {emp.first_name[0]}{emp.last_name[0]}
                      </div>
                    )}

                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm truncate">
                        {emp.first_name} {emp.last_name}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate">{emp.job_title}</p>
                      <span className="text-[9.5px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 font-mono font-bold rounded mt-1.5 inline-block uppercase">
                        {emp.employee_id}
                      </span>
                    </div>
                  </div>

                  {/* Division comp info */}
                  <div className="pt-2 text-xs font-semibold space-y-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-slate-500 py-1.2">
                      <span>Division Name</span>
                      <span className="text-slate-800 font-bold">{emp.department_name || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 py-1.2">
                      <span>Yearly compensation</span>
                      <span className="text-slate-800 font-mono font-bold">₹{emp.salary.toLocaleString()}/yr</span>
                    </div>
                  </div>
                </div>

                {/* Status Indicator & Operations bottom tab */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {/* Badge */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    emp.status === 'Active'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : emp.status === 'On Leave'
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}>
                    {emp.status}
                  </span>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 text-slate-400 select-none">
                    <button
                      onClick={() => handleOpenProfileView(emp)}
                      title="Inspect Profile"
                      className="p-1.5 hover:text-blue-600 hover:bg-slate-50 rounded transition-all cursor-pointer"
                    >
                      <Eye size={13.5} />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(emp)}
                      title="Modify identity info"
                      className="p-1.5 hover:text-indigo-650 hover:bg-slate-50 rounded transition-all cursor-pointer"
                    >
                      <Edit size={13.5} />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      title="Delete profile"
                      className="p-1.5 hover:text-rose-500 hover:bg-slate-50 rounded transition-all cursor-pointer"
                    >
                      <Trash2 size={13.5} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Directory Pagination system row */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-5 text-xs text-slate-500 font-semibold select-none">
            <p>
              Showing page <strong className="text-slate-800">{page}</strong> of <strong className="text-slate-800">{totalPages}</strong> — <strong className="text-slate-800">{totalEmployees}</strong> entries registered
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-650 hover:bg-slate-50 cursor-pointer disabled:opacity-40 font-bold text-[10.5px]"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-650 hover:bg-slate-50 cursor-pointer disabled:opacity-40 font-bold text-[10.5px]"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT DIALOG BOX MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          <div className="bg-white border border-slate-222 rounded-2xl p-6 sm:p-8 w-full max-w-2xl relative z-10 shadow-lg overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <User size={16} className="text-blue-600" />
                <span>{editingEmployee ? 'Modify Member Profile' : 'Instantiate Staff Member Profile'}</span>
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-450 hover:text-slate-705">
                <X size={16} />
              </button>
            </div>

            {validationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg mb-4 flex items-center gap-2">
                <ShieldAlert size={15} />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 tracking-wider mb-1.5">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Yathin"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2.2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-550 focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 tracking-wider mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kumar"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2.2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-550 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 tracking-wider mb-1.5">Corporate Email Key *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. worker@enterprise.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-550 focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 tracking-wider mb-1.5">Mobile Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 12345 67890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-550 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 tracking-wider mb-1.5">Job Designation Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lead Technical Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-3 py-2.2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-550 focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 tracking-wider mb-1.5">Annual Salary package * (INR/₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 750000"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full px-3 py-2.2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-550 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 tracking-wider mb-1.5">Designate Division *</label>
                  <select
                    value={deptId}
                    onChange={(e) => setDeptId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-lg text-xs font-bold text-slate-705 focus:outline-hidden block cursor-pointer"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 tracking-wider mb-1.5">Onboard Hire Date *</label>
                  <input
                    type="date"
                    required
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-811"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 tracking-wider mb-1.5">Employee Status *</label>
                  <select
                    value={empStatus}
                    onChange={(e) => setEmpStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-lg text-xs font-bold text-slate-705 focus:outline-hidden block cursor-pointer"
                  >
                    <option value="Active">Active Employee</option>
                    <option value="On Leave">Temporary Absence (On Leave)</option>
                    <option value="Terminated">Severed Account (Terminated)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 tracking-wider mb-1.5">Performance index Rating</label>
                  <select
                    value={perfScore}
                    onChange={(e) => setPerfScore(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-lg text-xs font-bold text-slate-705 focus:outline-hidden block cursor-pointer"
                  >
                    <option value="Excellent">Excellent Performance</option>
                    <option value="Good">Good Standard</option>
                    <option value="Average">Average / Standard</option>
                    <option value="Needs Improvement">Needs Evaluation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-455 tracking-wider mb-1.5">Gender ID</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-lg text-xs font-bold text-slate-700 focus:outline-hidden block cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-Binary">Non-Binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 tracking-wider mb-1.5">Emergency Contact Details</label>
                  <input
                    type="text"
                    placeholder="e.g. S. Kumar (Spouse) +91 xxxxx xxxxx"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 tracking-wider mb-1.5">Avatar URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://example.com/photo.jpg"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-450 tracking-wider mb-1.5">Primary Residential Address</label>
                <textarea
                  placeholder="Street details, physical landmark, postal pincode..."
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-550 focus:bg-white text-slate-800 resize-none leading-normal"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-xs"
                >
                  Save Profile Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL WORKER PROFILE VIEW DIALOG CARD */}
      {profileViewOpen && viewingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setProfileViewOpen(false)} />
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg relative z-10 shadow-lg overflow-hidden">
            {/* Header Identity Row */}
            <div className="p-6 bg-slate-50/75 border-b border-slate-100 flex items-center gap-4">
              {viewingEmployee.avatar_url ? (
                <img 
                  src={viewingEmployee.avatar_url} 
                  alt="Avatar details" 
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-md"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-black flex items-center justify-center text-lg shadow select-none uppercase font-mono">
                  {viewingEmployee.first_name[0]}{viewingEmployee.last_name[0]}
                </div>
              )}

              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {viewingEmployee.first_name} {viewingEmployee.last_name}
                </h3>
                <span className="text-[9px] px-2 py-0.5 bg-blue-50 border border-blue-105 text-blue-700 font-mono font-bold rounded mt-1.5 inline-block uppercase tracking-wide">
                  {viewingEmployee.employee_id}
                </span>
              </div>
            </div>

            {/* Profile Grid Values */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">{viewingEmployee.job_title}</p>
                  <p className="text-[10px] text-slate-450 mt-0.5">{viewingEmployee.department_name || 'Unassigned division'}</p>
                </div>

                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  viewingEmployee.status === 'Active'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : viewingEmployee.status === 'On Leave'
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-rose-50 border-rose-205 text-rose-700'
                }`}>
                  {viewingEmployee.status}
                </span>
              </div>

              {/* Data Blocks */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9.5px] font-bold uppercase text-slate-400 tracking-wider block">Corporate Email</span>
                  <a href={`mailto:${viewingEmployee.email}`} className="text-xs font-semibold text-blue-600 hover:underline break-all mt-1 block">
                    {viewingEmployee.email}
                  </a>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9.5px] font-bold uppercase text-slate-400 tracking-wider block">Mobile Phone</span>
                  <span className="text-xs font-semibold text-slate-800 mt-1 block">
                    {viewingEmployee.phone || 'N/A'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9.5px] font-bold uppercase text-slate-400 tracking-wider block">Compensation</span>
                  <span className="text-xs font-bold text-slate-800 font-mono mt-1 block">
                    ₹{viewingEmployee.salary.toLocaleString()}/yr
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9.5px] font-bold uppercase text-slate-405 tracking-wider block">Join Date</span>
                  <span className="text-xs font-semibold text-slate-800 font-mono mt-1 block">
                    {viewingEmployee.hire_date.substring(0, 10)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9.5px] font-bold uppercase text-slate-400 tracking-wider block">Gender Identity</span>
                  <span className="text-xs font-semibold text-slate-800 mt-1 block">
                    {viewingEmployee.gender || 'Male'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9.5px] font-bold uppercase text-slate-400 tracking-wider block">Performance Score</span>
                  <span className="text-xs font-bold text-indigo-700 mt-1 block">
                    {viewingEmployee.performance_score || 'Good'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                <span className="text-[9.5px] font-bold uppercase text-slate-400 tracking-wider block">Home Address</span>
                <p className="text-xs font-semibold text-slate-705 mt-0.5 whitespace-pre-wrap leading-relaxed">
                  {viewingEmployee.address || 'Address information not logged.'}
                </p>
              </div>

              {viewingEmployee.emergency_contact && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl space-y-1">
                  <span className="text-[9.5px] font-bold uppercase text-rose-500 tracking-wider block">Emergency Contact</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {viewingEmployee.emergency_contact}
                  </p>
                </div>
              )}
            </div>

            {/* Close footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setProfileViewOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors leading-none"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
