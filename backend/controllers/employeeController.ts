import { Response } from 'express';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

export const employeeController = {
  /**
   * Get all employee details with advanced search, filtering, and pagination
   */
  async getAllEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let employees = await db.getEmployees();

      // 1. Search Query Implementation
      const search = (req.query.search as string || '').toLowerCase().trim();
      if (search) {
        employees = employees.filter(emp => {
          const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
          const empId = (emp.employee_id || '').toLowerCase();
          const email = (emp.email || '').toLowerCase();
          const jobTitle = (emp.job_title || '').toLowerCase();
          const designation = (emp.designation || '').toLowerCase();
          return fullName.includes(search) || 
                 empId.includes(search) || 
                 email.includes(search) || 
                 jobTitle.includes(search) ||
                 designation.includes(search);
        });
      }

      // 2. Department Filter
      const departmentId = req.query.department ? Number(req.query.department) : null;
      if (departmentId) {
        employees = employees.filter(emp => emp.department_id === departmentId);
      }

      // 3. Employment Status Management Filter
      const status = req.query.status as string;
      if (status && status !== 'All') {
        employees = employees.filter(emp => emp.status === status);
      }

      // 4. Pagination Setup
      const total = employees.length;
      let pagedData = employees;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      
      const hasPagination = req.query.pagination !== 'false';
      let totalPages = 1;

      if (hasPagination) {
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        pagedData = employees.slice(startIndex, endIndex);
        totalPages = Math.ceil(total / limit) || 1;
      }

      res.status(200).json({ 
        success: true, 
        count: pagedData.length, 
        total,
        page,
        limit,
        totalPages,
        data: pagedData 
      });
    } catch (error: any) {
      console.error('Fetch employees error:', error);
      res.status(500).json({ success: false, message: 'Could not fetch employees list.', error: error.message });
    }
  },

  /**
   * Get single employee details by ID
   */
  async getEmployeeById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const employee = await db.getEmployeeById(id);

      if (!employee) {
        res.status(404).json({ success: false, message: 'Employee not found with specified ID.' });
        return;
      }

      res.status(200).json({ success: true, data: employee });
    } catch (error: any) {
      console.error('Fetch employee ID error:', error);
      res.status(500).json({ success: false, message: 'Could not retrieve employee details.', error: error.message });
    }
  },

  /**
   * Upload base64 employee profile image to local disk and return absolute relative path
   */
  async uploadImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { image, employee_id } = req.body;
      if (!image) {
        res.status(400).json({ success: false, message: 'Please provide base64 image data.' });
        return;
      }

      // Check for base64 pattern (e.g. "data:image/png;base64,...")
      const matches = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (!matches) {
        res.status(400).json({ success: false, message: 'Invalid image payload format. Must be a valid base64 data URL.' });
        return;
      }

      const extension = matches[1];
      const fileData = matches[2];
      const buffer = Buffer.from(fileData, 'base64');

      // Create uploads directory if it does not exist
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const uniqueFilename = `avatar_${employee_id || 'new'}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${extension}`;
      const fullPath = path.join(uploadsDir, uniqueFilename);
      
      fs.writeFileSync(fullPath, buffer);

      const relativeUrl = `/uploads/${uniqueFilename}`;
      res.status(200).json({ success: true, url: relativeUrl, message: 'Image uploaded successfully.' });
    } catch (error: any) {
      console.error('Upload image error:', error);
      res.status(500).json({ success: false, message: 'Could not save uploaded employee image.', error: error.message });
    }
  },

  /**
   * Create new Employee record (Admin/HR only)
   */
  async createEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { 
        first_name, 
        last_name, 
        email, 
        phone, 
        hire_date, 
        job_title, 
        department_id, 
        salary, 
        status, 
        performance_score,
        gender,
        address,
        emergency_contact,
        avatar_url
      } = req.body;

      // 1. Core Field Validations
      if (!first_name || !first_name.trim()) {
        res.status(400).json({ success: false, message: 'First name is required.' });
        return;
      }
      if (!last_name || !last_name.trim()) {
        res.status(400).json({ success: false, message: 'Last name is required.' });
        return;
      }
      if (!email || !email.trim()) {
        res.status(400).json({ success: false, message: 'Email address is required.' });
        return;
      }
      if (!email.includes('@') || !email.includes('.')) {
        res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        return;
      }
      if (!job_title || !job_title.trim()) {
        res.status(400).json({ success: false, message: 'Job title / Designation is required.' });
        return;
      }
      if (!hire_date) {
        res.status(400).json({ success: false, message: 'Hire date / Joining date is required.' });
        return;
      }
      if (!department_id) {
        res.status(400).json({ success: false, message: 'Department assignment is required.' });
        return;
      }
      if (salary === undefined || isNaN(Number(salary)) || Number(salary) < 0) {
        res.status(400).json({ success: false, message: 'Salary must be a valid non-negative number.' });
        return;
      }

      // Check if email already exists
      const existingEmployees = await db.getEmployees();
      const emailDup = existingEmployees.find(emp => emp.email.toLowerCase() === email.toLowerCase().trim());
      if (emailDup) {
        res.status(400).json({ success: false, message: 'An employee with this email address already exists.' });
        return;
      }

      // Generate a unique Employee ID (e.g. EMP-2026-007)
      const currentYear = new Date().getFullYear();
      const countPadded = String(existingEmployees.length + 1).padStart(3, '0');
      const employee_id = `EMP-${currentYear}-${countPadded}`;

      const newEmp = await db.createEmployee({
        employee_id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        phone: phone ? phone.trim() : null,
        hire_date,
        job_title: job_title.trim(),
        department_id: Number(department_id),
        salary: Number(salary),
        status: status || 'Active',
        performance_score: performance_score || 'Good',
        gender: gender || null,
        address: address ? address.trim() : null,
        emergency_contact: emergency_contact ? emergency_contact.trim() : null,
        avatar_url: avatar_url || null
      });

      res.status(201).json({ success: true, message: 'Employee record created successfully.', data: newEmp });
    } catch (error: any) {
      console.error('Create employee error:', error);
      res.status(500).json({ success: false, message: 'Could not create employee record.', error: error.message });
    }
  },

  /**
   * Update Employee record (Admin/HR only)
   */
  async updateEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const { 
        first_name, 
        last_name, 
        email, 
        phone, 
        job_title, 
        department_id, 
        salary, 
        status, 
        performance_score,
        gender,
        address,
        emergency_contact,
        avatar_url
      } = req.body;

      const employee = await db.getEmployeeById(id);
      if (!employee) {
        res.status(404).json({ success: false, message: 'Employee not found for modification.' });
        return;
      }

      // Validations if updating
      if (email && (!email.includes('@') || !email.includes('.'))) {
        res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        return;
      }
      if (salary !== undefined && (isNaN(Number(salary)) || Number(salary) < 0)) {
        res.status(400).json({ success: false, message: 'Salary must be a valid non-negative number.' });
        return;
      }

      // Check email uniqueness if email has changed
      if (email && email.toLowerCase().trim() !== employee.email.toLowerCase()) {
        const existingEmployees = await db.getEmployees();
        const dup = existingEmployees.find(emp => emp.id !== id && emp.email.toLowerCase() === email.toLowerCase().trim());
        if (dup) {
          res.status(400).json({ success: false, message: 'Another employee with this email address already exists.' });
          return;
        }
      }

      const updated = await db.updateEmployee(id, {
        first_name: first_name !== undefined ? first_name.trim() : employee.first_name,
        last_name: last_name !== undefined ? last_name.trim() : employee.last_name,
        email: email !== undefined ? email.trim() : employee.email,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : employee.phone,
        job_title: job_title !== undefined ? job_title.trim() : employee.job_title,
        department_id: department_id !== undefined ? Number(department_id) : employee.department_id,
        salary: salary !== undefined ? Number(salary) : employee.salary,
        status: status !== undefined ? status : employee.status,
        performance_score: performance_score !== undefined ? performance_score : employee.performance_score,
        gender: gender !== undefined ? gender : employee.gender,
        address: address !== undefined ? (address ? address.trim() : null) : employee.address,
        emergency_contact: emergency_contact !== undefined ? (emergency_contact ? emergency_contact.trim() : null) : employee.emergency_contact,
        avatar_url: avatar_url !== undefined ? avatar_url : employee.avatar_url
      });

      if (!updated) {
        res.status(400).json({ success: false, message: 'No fields were modified or error occurred.' });
        return;
      }

      const updatedEmp = await db.getEmployeeById(id);
      res.status(200).json({ success: true, message: 'Employee record updated successfully.', data: updatedEmp });
    } catch (error: any) {
      console.error('Update employee error:', error);
      res.status(500).json({ success: false, message: 'Failed to update employee record.', error: error.message });
    }
  },

  /**
   * Delete Employee record and their associated user account
   */
  async deleteEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const deleted = await db.deleteEmployee(id);

      if (!deleted) {
        res.status(404).json({ success: false, message: 'Employee not found or could not be removed.' });
        return;
      }

      res.status(200).json({ success: true, message: 'Employee record deleted successfully.' });
    } catch (error: any) {
      console.error('Delete employee error:', error);
      res.status(500).json({ success: false, message: 'Internal server error while deleting employee.', error: error.message });
    }
  },

  /**
   * Advanced statistics aggregator for UI charts (Recharts)
   */
  async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const emps = await db.getEmployees();
      const depts = await db.getDepartments();
      const leaves = await db.getLeaveRequests();
      const salaries = emps.filter(e => e.status === 'Active').map(e => Number(e.salary));
      const totalSalary = salaries.reduce((sum, sal) => sum + sal, 0);
      const avgSalary = salaries.length ? Math.round(totalSalary / salaries.length) : 0;

      // Group headcounts for departments
      const departmentHeadcounts = depts.map(d => {
        const count = emps.filter(e => e.department_id === d.id && e.status === 'Active').length;
        return {
          department: d.name,
          count,
          code: d.code
        };
      });

      // Distribution of leave requests status
      const totalPendingLeaves = leaves.filter(l => l.status === 'Pending').length;

      // Type distributions
      const leaveTypes = ['Annual', 'Sick', 'Maternity', 'Unpaid', 'Paternity'];
      const leaveDistribution = leaveTypes.map(type => {
        return {
          name: type,
          value: leaves.filter(l => l.leave_type === type).length
        };
      }).filter(item => item.value > 0);

      // Simple attendance rate
      const atts = await db.getAttendance();
      const today = new Date().toISOString().split('T')[0];
      const todayAtts = atts.filter(a => a.date === today);
      const presentTodayCount = todayAtts.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const activeCount = emps.filter(e => e.status === 'Active').length;
      const attRate = activeCount ? Math.round((presentTodayCount / activeCount) * 100) : 100;

      // High-level recent logging actions
      const recentActivities = [
        { id: 1, text: `Global system synchronization successfully initialized`, time: 'Just now', type: 'system' },
        { id: 2, text: `Leaves system auto-audited: ${totalPendingLeaves} pending approval requests`, time: '10 mins ago', type: 'leave' },
        { id: 3, text: `Compensation basic parameters evaluated for May pay sheets`, time: '2 hours ago', type: 'payroll' }
      ];

      res.status(200).json({
        success: true,
        data: {
          totalEmployees: emps.length,
          activeEmployees: emps.filter(e => e.status === 'Active').length,
          onLeaveEmployees: emps.filter(e => e.status === 'On Leave').length,
          totalDepartments: depts.length,
          monthlyPayrollCost: Math.round(totalSalary / 12),
          pendingLeavesCount: totalPendingLeaves,
          averageSalary: avgSalary,
          attendanceRateToday: attRate,
          departmentHeadcounts,
          leaveDistribution,
          recentActivities
        }
      });
    } catch (error: any) {
      console.error('Stats aggregation error:', error);
      res.status(500).json({ success: false, message: 'Failed to aggregate dashboard metrics.', error: error.message });
    }
  }
};
