/**
 * Shared HR and Management System Types
 */

export interface Employee {
  id: number;
  employee_id: string; // e.g., EMP-2026-001
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  hire_date: string;
  job_title: string;
  department_id: number;
  department_name?: string;
  salary: number;
  status: 'Active' | 'On Leave' | 'Terminated';
  avatar_url?: string;
  gender?: string;
  date_of_birth?: string;
  performance_score?: 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';
  address?: string;
  emergency_contact?: string;
}

export interface Department {
  id: number;
  name: string;
  code: string; // e.g., HR, ENG, MKT
  manager_id?: number;
  manager_name?: string;
  budget: number;
  employee_count?: number;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_name?: string;
  job_title?: string;
  leave_type: 'Annual' | 'Sick' | 'Maternity' | 'Unpaid' | 'Paternity';
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: number;
  approved_by_name?: string;
  created_at: string;
}

export interface Payroll {
  id: number;
  employee_id: number;
  employee_name?: string;
  job_title?: string;
  department_name?: string;
  month: string; // e.g., '2026-05'
  basic_salary: number;
  bonuses: number;
  deductions: number;
  net_salary: number;
  payment_status: 'Paid' | 'Pending' | 'Processing';
  payment_date?: string;
}

export interface Attendance {
  id: number;
  employee_id: number;
  employee_name?: string;
  emp_uid?: string;
  department_id?: number;
  department_name?: string;
  department_code?: string;
  date: string; // YYYY-MM-DD
  clock_in?: string; // HH:MM:ss
  clock_out?: string; // HH:MM:ss
  total_hours?: number | null;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day';
  notes?: string;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveEmployees: number;
  totalDepartments: number;
  monthlyPayrollCost: number;
  pendingLeavesCount: number;
  averageSalary: number;
  attendanceRateToday: number;
  departmentHeadcounts: { department: string; count: number; code: string }[];
  leaveDistribution: { name: string; value: number }[];
  recentActivities: { id: number; text: string; time: string; type: string }[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'Admin' | 'HR Manager' | 'Employee';
  employee_id?: number;
}
