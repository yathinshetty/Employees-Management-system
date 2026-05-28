import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Clock,
  LogOut,
  Menu,
  X,
  User,
  Bell,
  Building,
  Briefcase,
  CheckSquare,
  TrendingUp,
  BarChart3,
  Settings,
  HelpCircle
} from 'lucide-react';

interface SidebarItemProps {
  key?: React.Key;
  icon: React.ReactNode;
  label: string;
  path: string;
  active: boolean;
  onClick?: () => void;
}

function SidebarItem({ icon, label, path, active, onClick }: SidebarItemProps) {
  return (
    <Link
      to={path}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
        active
          ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600 shadow-xs'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900/90'
      }`}
    >
      <span className={`w-4 h-4 flex items-center justify-center ${active ? 'text-blue-600' : 'text-slate-400'}`}>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, employee, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Hardcode theme to light mode and remove dark class helper completely
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifsOpen, setNotifsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      if (user) {
        const res = await axios.get('/api/notifications');
        setNotifications(res.data.data || []);
      }
    } catch (err) {
      console.error('Fetch layout notifications error:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // Polling every 20s
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  const navigationItems = [
    {
      label: 'Dashboard',
      path: '/',
      icon: <LayoutDashboard size={16} />,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      label: 'Employees',
      path: '/employees',
      icon: <Users size={16} />,
      roles: ['Admin', 'HR Manager']
    },
    {
      label: 'Departments',
      path: '/departments',
      icon: <Building2 size={16} />,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      label: 'Leave Management',
      path: '/leaves',
      icon: <CalendarClock size={16} />,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      label: 'Payroll',
      path: '/payroll',
      icon: <CircleDollarSign size={16} />,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      label: 'Attendance',
      path: '/attendance',
      icon: <Clock size={16} />,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      label: 'Tasks',
      path: '/tasks',
      icon: <CheckSquare size={16} />,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      label: 'Performance Reviews',
      path: '/performance',
      icon: <TrendingUp size={16} />,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: <BarChart3 size={16} />,
      roles: ['Admin', 'HR Manager']
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: <Settings size={16} />,
      roles: ['Admin', 'HR Manager', 'Employee']
    }
  ];

  // Filter menu items by user role
  const allowedNav = navigationItems.filter(item =>
    user ? item.roles.includes(user.role) : false
  );

  const getInitials = () => {
    if (employee) {
      return `${employee.first_name[0]}${employee.last_name[0]}`.toUpperCase();
    }
    return user ? user.username.substring(0, 2).toUpperCase() : 'HR';
  };

  const getUserDisplayName = () => {
    if (employee) {
      return `${employee.first_name} ${employee.last_name}`;
    }
    return user ? user.username : 'Administrator';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-slate-800 transition-colors duration-150">
      {/* ==========================================
          DESKTOP SIDEBAR (WHITE CORP THEME)
          ========================================== */}
      <aside className="hidden lg:flex flex-col w-64 bg-white text-slate-600 border-r border-slate-200 shrink-0">
        {/* Brand Banner Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-sm">
            E
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs tracking-tight text-slate-900 uppercase font-display leading-tight">
              Enterprise EMS
            </span>
            <span className="text-[9px] text-slate-450 font-mono">
              v1.4.0 • Cloud Stable
            </span>
          </div>
        </div>

        {/* Navigation Core */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {allowedNav.map(item => (
            <SidebarItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              active={
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path)
              }
            />
          ))}
        </nav>

        {/* Bottom Current Profile Box info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 font-bold text-blue-600 flex items-center justify-center text-[11px] select-none shadow-xs">
              {getInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-none mb-1">
                {getUserDisplayName()}
              </p>
              <p className="text-[9px] text-blue-600 font-semibold tracking-wide uppercase">
                {user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[10.5px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* ==========================================
          MOBILE DRAWER SIDEBAR
          ========================================== */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex animate-fade-in">
          {/* Backdrop mask */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />

          <div className="relative flex flex-col w-64 max-w-xs bg-white text-slate-600 border-r border-slate-200 shadow-xl z-50">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                  E
                </div>
                <span className="font-bold text-xs tracking-tight text-slate-900 uppercase font-display">
                  Enterprise EMS
                </span>
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-650"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {allowedNav.map(item => (
                <SidebarItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                  active={
                    item.path === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.path)
                  }
                  onClick={() => setMobileSidebarOpen(false)}
                />
              ))}
            </nav>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 font-bold text-blue-600 flex items-center justify-center text-[11px]">
                  {getInitials()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-[9px] text-blue-600 font-bold uppercase">
                    {user?.role}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[10.5px] font-bold text-slate-600 hover:text-slate-950 bg-white border border-slate-200 rounded-lg"
              >
                <LogOut size={13} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MAIN AREA CONTAINING TOP NAVBAR & PAGE BODY
          ========================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP NAVBAR (WHITE CORP THEME) */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            {/* Hamburger Button for mobile */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg lg:hidden transition-colors"
            >
              <Menu size={20} />
            </button>

            {/* Quick Context Indicator / Design Search input wrapper */}
            <div className="hidden md:flex items-center space-x-2.5 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-lg w-72 lg:w-80">
              <span className="text-slate-400 select-none text-[11px]">🔍</span>
              <input 
                type="text" 
                placeholder="Quick directory or database search..." 
                className="bg-transparent border-none outline-hidden text-xs w-full text-slate-700 font-medium placeholder-slate-400"
                disabled 
              />
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[9.5px] text-slate-500 bg-slate-50 border border-slate-150 px-2.5 py-0.8 rounded-full select-none font-bold">
              <Building size={10} className="text-slate-400" />
              <span>Corporation HQ</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-blue-600 uppercase">SYS STABLE</span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Elegant Corporate Help Info Icon instead of dark toggle */}
            <div className="text-xs text-slate-450 font-semibold hidden lg:flex items-center gap-1">
              <HelpCircle size={14} className="text-slate-400" />
              <span>Support Portal</span>
            </div>

            {/* System notifications dynamic popover */}
            <div className="relative">
              <button 
                onClick={() => setNotifsOpen(!notifsOpen)}
                className="relative p-1.5 text-slate-450 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-rose-600 text-white text-[8px] flex items-center justify-center rounded-full border border-white font-bold animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden text-xs animate-slide-in">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center font-bold text-slate-700">
                      <span>Enterprise Alerts ({unreadCount})</span>
                      <button 
                        onClick={() => setNotifsOpen(false)}
                        className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer text-[9px] uppercase font-mono bg-white p-1 px-2 border border-slate-200 rounded shadow-xs"
                      >
                        Close
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 font-semibold space-y-1">
                          <p>Your alerts inbox is clear.</p>
                          <p className="text-[10px] font-normal text-slate-400 italic">No warnings pending audit.</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`p-4 hover:bg-slate-50 transition-colors ${n.is_read === 0 ? 'bg-blue-50/20' : ''}`}>
                            <div className="flex justify-between items-start gap-2">
                              <span className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded-md ${
                                n.type === 'Task' ? 'bg-indigo-50 text-indigo-750' :
                                n.type === 'Alert' ? 'bg-amber-50 text-amber-750' :
                                n.type === 'Payroll' ? 'bg-emerald-50 text-emerald-750' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {n.type}
                              </span>
                              <span className="text-[9px] font-mono text-slate-400">
                                {new Date(n.created_at || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <p className="font-bold text-slate-800 mt-1.5 leading-snug">{n.title}</p>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{n.message}</p>

                            {n.is_read === 0 && (
                              <button
                                onClick={() => handleMarkAsRead(n.id)}
                                className="mt-2 text-[9px] font-bold text-blue-600 hover:text-blue-500 cursor-pointer uppercase tracking-tight"
                              >
                                Mark as Read
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Professional Date stamp indicator */}
            <div className="hidden lg:flex flex-col items-end text-right">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
              <div className="flex items-center gap-1 mt-0.5 animate-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[9px] text-slate-400 font-bold font-mono uppercase tracking-wider leading-none">
                  PROD ACTIVE
                </span>
              </div>
            </div>

            <div className="w-px h-6 bg-slate-200 hidden md:block" />

            {/* Micro Details User Card */}
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-none mb-0.5">
                  {getUserDisplayName()}
                </p>
                <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">
                  {user?.role}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-150 border border-slate-200 font-bold text-blue-600 flex items-center justify-center text-[11px] select-none shadow-xs transition-colors">
                {getInitials()}
              </div>
            </div>
          </div>
        </header>

        {/* CONTAINER FOR CHILDREN PAGES */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
