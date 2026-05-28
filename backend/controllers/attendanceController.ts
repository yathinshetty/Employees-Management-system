import { Response } from 'express';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

export const attendanceController = {
  /**
   * Fetch attendance registers matching filters (date, month, department, status, employee name search)
   */
  async getAttendanceRecords(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { search, department_id, status, date, month } = req.query;

      let attendanceList = await db.getAttendance();

      // Employees can only inspect their own attendance history
      if (req.user.role === 'Employee') {
        const empId = req.user.employee_id;
        attendanceList = attendanceList.filter(a => a.employee_id === empId);
      }

      // Filter by Employee Name / ID search
      if (search) {
        const needle = String(search).toLowerCase();
        attendanceList = attendanceList.filter(a => 
          (a.employee_name && a.employee_name.toLowerCase().includes(needle)) ||
          (a.emp_uid && a.emp_uid.toLowerCase().includes(needle))
        );
      }

      // Filter by Department Assignment
      if (department_id) {
        const depId = Number(department_id);
        attendanceList = attendanceList.filter(a => a.department_id === depId);
      }

      // Filter by status flag
      if (status) {
        const statStr = String(status);
        attendanceList = attendanceList.filter(a => a.status === statStr);
      }

      // Filter by exact date
      if (date) {
        const dateStr = String(date); // YYYY-MM-DD
        attendanceList = attendanceList.filter(a => a.date && a.date.toString().substring(0, 10) === dateStr);
      }

      // Filter by month indicator (for monthly audit/reports)
      if (month) {
        const monthStr = String(month); // YYYY-MM
        attendanceList = attendanceList.filter(a => a.date && a.date.toString().substring(0, 7) === monthStr);
      }

      res.status(200).json({ 
        success: true, 
        count: attendanceList.length, 
        data: attendanceList 
      });
    } catch (error: any) {
      console.error('Fetch attendance records error:', error);
      res.status(500).json({ success: false, message: 'Could not fetch attendance registers.', error: error.message });
    }
  },

  /**
   * Live check-in endpoint for Mapped Employees (Self check-in)
   */
  async selfCheckIn(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.employee_id) {
        res.status(400).json({ success: false, message: 'Linked worker credentials required for clocking action.' });
        return;
      }

      const employeeId = req.user.employee_id;
      const todayStr = new Date().toISOString().split('T')[0];
      const { status, notes } = req.body; // 'Present' | 'Late' | 'Half Day'

      if (!status || !['Present', 'Late', 'Half Day'].includes(status)) {
        res.status(400).json({ success: false, message: 'Valid status is required (Present, Late, Half Day).' });
        return;
      }

      // Prevent duplicate attendance check-in for the same day
      const attendances = await db.getAttendance();
      const alreadyCheckedIn = attendances.some(
        a => a.employee_id === employeeId && a.date.toString().substring(0, 10) === todayStr
      );

      if (alreadyCheckedIn) {
        res.status(400).json({ success: false, message: 'Duplicate Check-In block: You have already punched in for today.' });
        return;
      }

      const record = await db.handleCheckIn(
        employeeId,
        todayStr,
        status,
        notes || 'Self check-in via web client portal'
      );

      res.status(201).json({
        success: true,
        message: 'Checked-in successfully for today.',
        data: record
      });
    } catch (error: any) {
      console.error('Self check-in error:', error);
      res.status(500).json({ success: false, message: 'Failed to record check-in.', error: error.message });
    }
  },

  /**
   * Live check-out endpoint for Mapped Employees (Self check-out with automatic hours computation)
   */
  async selfCheckOut(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.employee_id) {
        res.status(400).json({ success: false, message: 'Linked worker credentials required for clocking action.' });
        return;
      }

      const employeeId = req.user.employee_id;
      const todayStr = new Date().toISOString().split('T')[0];

      // Validate check-in presence and ensure they haven't checked out yet
      const attendances = await db.getAttendance();
      const todayRecord = attendances.find(
        a => a.employee_id === employeeId && a.date.toString().substring(0, 10) === todayStr
      );

      if (!todayRecord) {
        res.status(400).json({ success: false, message: 'Cannot check out: No active check-in record was stored for today.' });
        return;
      }

      if (todayRecord.clock_out) {
        res.status(400).json({ success: false, message: 'Cannot check out: You have already clocked out for today.' });
        return;
      }

      const result = await db.handleCheckOut(employeeId, todayStr);

      res.status(200).json({
        success: true,
        message: 'Checked-out successfully. Work hours synchronized.',
        data: result
      });
    } catch (error: any) {
      console.error('Self check-out error:', error);
      res.status(500).json({ success: false, message: 'Failed to complete check-out.', error: error.message });
    }
  },

  /**
   * Admin-level arbitrary registration / modification of any attendance details
   */
  async adminMarkRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || (req.user.role !== 'Admin' && req.user.role !== 'HR Manager')) {
        res.status(403).json({ success: false, message: 'Restricted access: Requires Admin/HR level privileges.' });
        return;
      }

      const { id, employee_id, date, clock_in, clock_out, status, notes } = req.body;

      if (!employee_id || !date || !status) {
        res.status(400).json({ success: false, message: 'Employee ID, date, and attendance status are mandatory.' });
        return;
      }

      // Check if trying to register a new record but there's already a record for that employee on that single day
      if (!id) {
        const attendances = await db.getAttendance();
        const conflict = attendances.some(
          a => a.employee_id === Number(employee_id) && a.date.toString().substring(0, 10) === date
        );
        if (conflict) {
          res.status(400).json({ 
            success: false, 
            message: `Conflict: This employee already has an attendance logging saved for ${date}. Please edit that record instead.` 
          });
          return;
        }
      }

      const result = await db.adminMarkAttendance({
        id: id ? Number(id) : undefined,
        employee_id: Number(employee_id),
        date,
        clock_in,
        clock_out,
        status,
        notes
      });

      res.status(200).json({
        success: true,
        message: id ? 'Attendance checkpoint updated safely.' : 'Attendance record logged successfully.',
        data: result
      });
    } catch (error: any) {
      console.error('Admin save attendance error:', error);
      res.status(500).json({ success: false, message: 'Failed to log personnel attendance.', error: error.message });
    }
  },

  /**
   * Admin-level delete attendance record
   */
  async adminDeleteRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || (req.user.role !== 'Admin' && req.user.role !== 'HR Manager')) {
        res.status(403).json({ success: false, message: 'Restricted access: Requires Admin/HR level privileges.' });
        return;
      }

      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, message: 'ID parameters are required.' });
        return;
      }

      const ok = await db.deleteAttendanceRecord(Number(id));
      if (!ok) {
        res.status(404).json({ success: false, message: 'Attendance record not found.' });
        return;
      }

      res.status(200).json({ success: true, message: 'Attendance record deleted completely.' });
    } catch (error: any) {
      console.error('Admin delete attendance error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete attendance record.', error: error.message });
    }
  },

  /**
   * Analytical compilation dashboard data (Present rates, department rankings, monthly charts, average durations)
   */
  async getAttendanceStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      let records = await db.getAttendance();

      // Employees get stats relative to their historical performance
      if (req.user.role === 'Employee') {
        const empId = req.user.employee_id;
        records = records.filter(r => r.employee_id === empId);
      }

      const totalLogs = records.length;
      const countPresent = records.filter(r => r.status === 'Present').length;
      const countLate = records.filter(r => r.status === 'Late').length;
      const countHalfDay = records.filter(r => r.status === 'Half Day').length;
      const countAbsent = records.filter(r => r.status === 'Absent').length;

      const presentRate = totalLogs > 0 ? Math.round(((countPresent + countLate + countHalfDay) / totalLogs) * 100) : 0;
      const latenessRate = totalLogs > 0 ? Math.round((countLate / totalLogs) * 100) : 0;

      // Calculate working hours averages
      const hoursArray = records.filter(r => r.total_hours !== null && r.total_hours !== undefined).map(r => Number(r.total_hours));
      const avgMinutesPerDay = hoursArray.length > 0 
        ? Math.round((hoursArray.reduce((acc, v) => acc + v, 0) / hoursArray.length) * 100) / 100
        : 8.00;

      // Compile department breakdown
      const deptStatsMap: { [key: string]: { total: number; present: number; name: string; code: string } } = {};
      
      const departmentsList = await db.getDepartments();
      departmentsList.forEach(d => {
        deptStatsMap[String(d.id)] = {
          total: 0,
          present: 0,
          name: d.name,
          code: d.code
        };
      });

      records.forEach(r => {
        if (r.department_id && deptStatsMap[String(r.department_id)]) {
          deptStatsMap[String(r.department_id)].total += 1;
          if (['Present', 'Late', 'Half Day'].includes(r.status)) {
            deptStatsMap[String(r.department_id)].present += 1;
          }
        }
      });

      const departmentBreakdown = Object.keys(deptStatsMap).map(id => {
        const d = deptStatsMap[id];
        return {
          id: Number(id),
          name: d.name,
          code: d.code,
          loggedRecords: d.total,
          presentRate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0
        };
      });

      // Assemble recent historical counts of last 7 dates for charts
      const dateStatsMap: { [key: string]: { present: number; total: number } } = {};
      records.forEach(r => {
        const dateStr = r.date.toString().substring(0, 10);
        if (!dateStatsMap[dateStr]) {
          dateStatsMap[dateStr] = { present: 0, total: 0 };
        }
        dateStatsMap[dateStr].total += 1;
        if (['Present', 'Late', 'Half Day'].includes(r.status)) {
          dateStatsMap[dateStr].present += 1;
        }
      });

      const timelineHistory = Object.keys(dateStatsMap)
        .sort((a, b) => a.localeCompare(b))
        .slice(-7)
        .map(dt => {
          const stats = dateStatsMap[dt];
          return {
            date: dt,
            presentCount: stats.present,
            totalCount: stats.total,
            presentRate: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0
          };
        });

      res.status(200).json({
        success: true,
        stats: {
          totalLogs,
          presentRate,
          latenessRate,
          avgHours: avgMinutesPerDay,
          distribution: {
            Present: countPresent,
            Late: countLate,
            HalfDay: countHalfDay,
            Absent: countAbsent
          },
          departmentBreakdown,
          timelineHistory
        }
      });
    } catch (error: any) {
      console.error('Fetch attendance stats error:', error);
      res.status(500).json({ success: false, message: 'Could not fetch attendance stats dashboard data.', error: error.message });
    }
  },

  /**
   * Deprecated or legacy self clock proxy (redirects to selfCheckIn for seamless back-compatibility)
   */
  async recordSelfAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
    return attendanceController.selfCheckIn(req, res);
  }
};
