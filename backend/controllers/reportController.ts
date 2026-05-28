import { Response } from 'express';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

export const reportController = {
  /**
   * Generates a comprehensive, enterprise-grade business analytics overview (KPI numbers, distribution ratios, etc.)
   */
  async getEnterpriseReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // 1. Core tables query
      const departments = await db.getDepartments();
      const employees = await db.getEmployees();
      const attendance = await db.getAttendance();
      const leaves = await db.getLeaveRequests();
      const payroll = await db.getPayroll();

      // 2. Departmental analysis
      const deptDetails = departments.map((dept: any) => {
        const deptEmps = employees.filter((e: any) => e.department_id === dept.id);
        const totalSalary = deptEmps.reduce((sum: number, e: any) => sum + Number(e.salary || 0), 0);
        const averageSalary = deptEmps.length > 0 ? (totalSalary / deptEmps.length) : 0;

        return {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          budget: Number(dept.budget || 0),
          employee_count: deptEmps.length,
          total_salary_expense: totalSalary,
          avg_salary: Math.round(averageSalary)
        };
      });

      // 3. Attendance Status distribution
      const attendanceSummary = {
        Present: attendance.filter((a: any) => a.status === 'Present').length,
        Late: attendance.filter((a: any) => a.status === 'Late').length,
        Absent: attendance.filter((a: any) => a.status === 'Absent').length,
        HalfDay: attendance.filter((a: any) => a.status === 'Half Day').length,
        total: attendance.length
      };

      // 4. Leaves Analysis
      const leaveSummary = {
        Pending: leaves.filter((l: any) => l.status === 'Pending').length,
        Approved: leaves.filter((l: any) => l.status === 'Approved').length,
        Rejected: leaves.filter((l: any) => l.status === 'Rejected').length,
        types: {
          Annual: leaves.filter((l: any) => l.leave_type === 'Annual').length,
          Sick: leaves.filter((l: any) => l.leave_type === 'Sick').length,
          Maternity: leaves.filter((l: any) => l.leave_type === 'Maternity').length,
          Unpaid: leaves.filter((l: any) => l.leave_type === 'Unpaid').length,
          Paternity: leaves.filter((l: any) => l.leave_type === 'Paternity').length
        }
      };

      // 5. Total Payroll disbursement metrics
      const payrollTotals = payroll.reduce((acc: any, p: any) => {
        const basic = Number(p.basic_salary || 0);
        const bonus = Number(p.bonuses || 0);
        const ded = Number(p.deductions || 0);
        const net = Number(p.net_salary || 0);

        return {
          total_basic: acc.total_basic + basic,
          total_bonus: acc.total_bonus + bonus,
          total_deductions: acc.total_deductions + ded,
          total_net: acc.total_net + net,
          count: acc.count + 1
        };
      }, { total_basic: 0, total_bonus: 0, total_deductions: 0, total_net: 0, count: 0 });

      // 6. Overall Performance metrics count
      const performanceScoreDistribution = {
        Excellent: employees.filter((e: any) => e.performance_score === 'Excellent').length,
        Good: employees.filter((e: any) => e.performance_score === 'Good').length,
        Average: employees.filter((e: any) => e.performance_score === 'Average').length,
        NeedsImprovement: employees.filter((e: any) => e.performance_score === 'Needs Improvement').length
      };

      res.status(200).json({
        success: true,
        data: {
          departments: deptDetails,
          attendance: attendanceSummary,
          leaves: leaveSummary,
          payroll: payrollTotals,
          performance: performanceScoreDistribution,
          summary: {
            total_employees: employees.length,
            active_employees: employees.filter((e: any) => e.status === 'Active').length,
            total_budget_allocated: departments.reduce((sum: number, d: any) => sum + Number(d.budget || 0), 0)
          }
        }
      });
    } catch (error: any) {
      console.error('Fetch system reports error:', error);
      res.status(500).json({ success: false, message: 'Could not compiled corporate metrics report.', error: error.message });
    }
  }
};
