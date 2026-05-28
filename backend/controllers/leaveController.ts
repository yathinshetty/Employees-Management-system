import { Response } from 'express';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

export const leaveController = {
  /**
   * Fetch all system leave requests (Admin/HR gets everything, Employee only gets their own)
   */
  async getAllLeaves(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized access.' });
        return;
      }

      const leaves = await db.getLeaveRequests();

      if (req.user.role === 'Employee') {
        const empId = req.user.employee_id;
        const employeeLeaves = leaves.filter(l => l.employee_id === empId);
        res.status(200).json({ success: true, count: employeeLeaves.length, data: employeeLeaves });
        return;
      }

      res.status(200).json({ success: true, count: leaves.length, data: leaves });
    } catch (error: any) {
      console.error('Fetch leaves error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve leave listings.', error: error.message });
    }
  },

  /**
   * Submit/Apply for a new leave request (Employee self-service)
   */
  async applyLeave(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.employee_id) {
        res.status(400).json({ success: false, message: 'Leaves can only be requested by users linked to an active Employee record.' });
        return;
      }

      const { leave_type, start_date, end_date, reason } = req.body;

      if (!leave_type || !start_date || !end_date || !reason) {
        res.status(400).json({ success: false, message: 'Required fields: leave_type, start_date, end_date, reason.' });
        return;
      }

      const start = new Date(start_date);
      const end = new Date(end_date);

      if (end < start) {
        res.status(400).json({ success: false, message: 'End date cannot be earlier than start date.' });
        return;
      }

      // Emulate SQL creation
      const devDb = JSON.parse(fs_read_db());
      const newId = devDb.leave_requests.reduce((max: number, l: any) => (l.id > max ? l.id : max), 0) + 1;

      // Calculate total days
      const total_days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const newLeave = {
        id: newId,
        employee_id: req.user.employee_id,
        leave_type,
        start_date,
        end_date,
        reason,
        status: 'Pending',
        approved_by: null,
        created_at: new Date().toISOString()
      };

      devDb.leave_requests.push(newLeave);
      fs_write_db(devDb);

      res.status(201).json({ success: true, message: 'Leave application submitted successfully.', data: newLeave });
    } catch (error: any) {
      console.error('Apply leave error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit leave application request.', error: error.message });
    }
  },

  /**
   * Approve/Reject pending leave requests (Admin/HR only)
   */
  async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const { status } = req.body; // 'Approved' | 'Rejected'
      const managerId = req.user?.employee_id || 1; // Fallback to HR Admin staff

      if (!status || (status !== 'Approved' && status !== 'Rejected')) {
        res.status(400).json({ success: false, message: 'A valid action of "Approved" or "Rejected" is required.' });
        return;
      }

      const updated = await db.updateLeaveStatus(id, status, managerId);

      if (!updated) {
        res.status(404).json({ success: false, message: 'Leave request not found or failed to update.' });
        return;
      }

      // If Approved, also update Employee status temporarily to 'On Leave' if request start_date <= today <= end_date
      if (status === 'Approved') {
        const leaves = await db.getLeaveRequests();
        const leave = leaves.find(l => l.id === id);
        if (leave) {
          const today = new Date().toISOString().split('T')[0];
          if (leave.start_date <= today && today <= leave.end_date) {
            const devDb = JSON.parse(fs_read_db());
            const empIndex = devDb.employees.findIndex((e: any) => e.id === leave.employee_id);
            if (empIndex !== -1) {
              devDb.employees[empIndex].status = 'On Leave';
              fs_write_db(devDb);
            }
          }
        }
      }

      res.status(200).json({ success: true, message: `Leave request status updated to: ${status}.` });
    } catch (error: any) {
      console.error('Update leave status error:', error);
      res.status(500).json({ success: false, message: 'Could not modify leave request status.', error: error.message });
    }
  }
};

/** Ensure file synchronization helper mimics db.ts storage */
import fs from 'fs';
import path from 'path';
const DB_STORE_PATH = path.join(process.cwd(), 'database', 'db_store.json');
function fs_read_db() { return fs.readFileSync(DB_STORE_PATH, 'utf-8'); }
function fs_write_db(data: any) { fs.writeFileSync(DB_STORE_PATH, JSON.stringify(data, null, 2)); }


