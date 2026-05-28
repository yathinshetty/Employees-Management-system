import { Response } from 'express';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

export const departmentController = {
  /**
   * Fetch all department listings
   */
  async getAllDepartments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const departments = await db.getDepartments();
      res.status(200).json({ success: true, count: departments.length, data: departments });
    } catch (error: any) {
      console.error('Fetch departments error:', error);
      res.status(500).json({ success: false, message: 'Could not fetch departments list.', error: error.message });
    }
  },

  /**
   * Add a new corporate department
   */
  async createDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, code, budget, manager_id } = req.body;

      if (!name || !code || !budget) {
        res.status(400).json({ success: false, message: 'Missing fields: Department name, code, and annual budget are required.' });
        return;
      }

      const existingDepts = await db.getDepartments();
      const codeTaken = existingDepts.some(d => d.code.toUpperCase() === code.toUpperCase());
      const nameTaken = existingDepts.some(d => d.name.toLowerCase() === name.toLowerCase());

      if (codeTaken || nameTaken) {
        res.status(400).json({ success: false, message: 'Department name or code has already been registered.' });
        return;
      }

      const newDept = await db.createDepartment({
        name,
        code: code.toUpperCase(),
        budget: Number(budget),
        manager_id: manager_id ? Number(manager_id) : null
      });

      res.status(201).json({ success: true, message: 'Department created successfully.', data: newDept });
    } catch (error: any) {
      console.error('Create department error:', error);
      res.status(500).json({ success: false, message: 'Could not register new department.', error: error.message });
    }
  }
};
