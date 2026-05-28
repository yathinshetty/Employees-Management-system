import { Response } from 'express';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

export const payrollController = {
  /**
   * Fetch complete payroll records
   */
  async getPayrollRecords(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const payrollList = await db.getPayroll();

      // Employees can only view their own payroll slips
      if (req.user.role === 'Employee') {
        const empId = req.user.employee_id;
        const employeePayroll = payrollList.filter(p => p.employee_id === empId);
        res.status(200).json({ success: true, count: employeePayroll.length, data: employeePayroll });
        return;
      }

      res.status(200).json({ success: true, count: payrollList.length, data: payrollList });
    } catch (error: any) {
      console.error('Fetch payroll error:', error);
      res.status(500).json({ success: false, message: 'Could not fetch payroll registers.', error: error.message });
    }
  },

  /**
   * Generate/Initiate new payroll list for a target month (Admin/HR only)
   */
  async generateMonthlyPayroll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { month } = req.body; // e.g. "2026-05"

      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        res.status(400).json({ success: false, message: 'Valid month target in format YYYY-MM is required.' });
        return;
      }

      const employees = await db.getEmployees();
      const existingPayroll = await db.getPayroll();

      // filter only active staff
      const activeStaff = employees.filter(e => e.status === 'Active' || e.status === 'On Leave');
      const targetMonthRecords = existingPayroll.filter(p => p.month === month);

      let createdCount = 0;
      const results = [];

      for (const emp of activeStaff) {
        // Skip if payroll record already calculated for this employee and month
        const exists = targetMonthRecords.some(p => p.employee_id === emp.id);
        if (exists) continue;

        const basic_salary = Number((emp.salary / 12).toFixed(2));
        const bonuses = emp.performance_score === 'Excellent' ? 500.00 : emp.performance_score === 'Good' ? 200.00 : 0.00;
        const deductions = emp.status === 'On Leave' ? 100.00 : 0.00; // Deduct processing or insurance margin
        const net_salary = Number((basic_salary + bonuses - deductions).toFixed(2));

        const record = await db.createPayrollRecord({
          employee_id: emp.id,
          month,
          basic_salary,
          bonuses,
          deductions,
          net_salary,
          payment_status: 'Pending'
        });

        results.push(record);
        createdCount++;
      }

      res.status(201).json({
        success: true,
        message: `Successfully calculated and finalized payroll parameters for ${createdCount} employees.`,
        data: results
      });
    } catch (error: any) {
      console.error('Payroll generation error:', error);
      res.status(500).json({ success: false, message: 'Could not generate monthly payroll system sheets.', error: error.message });
    }
  },

  /**
   * Transmit/Approve payment status for payout sheets (process/mark as paid)
   */
  async processPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const { status } = req.body; // 'Paid' | 'Processing'

      if (!status || (status !== 'Paid' && status !== 'Processing')) {
        res.status(400).json({ success: false, message: 'A payload status of "Paid" or "Processing" is required.' });
        return;
      }

      const updated = await db.updatePayrollStatus(id, status);

      if (!updated) {
        res.status(404).json({ success: false, message: 'Payroll sheet entry not encountered.' });
        return;
      }

      res.status(200).json({ success: true, message: `Payout transaction registration status set to: ${status}.` });
    } catch (error: any) {
      console.error('Process payment error:', error);
      res.status(500).json({ success: false, message: 'Payout update failed.', error: error.message });
    }
  }
};
