import { Response } from 'express';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

export const taskController = {
  /**
   * Fetch all corporate task channels & assignments
   */
  async getAllTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tasks = await db.getTasks();
      res.status(200).json({ success: true, count: tasks.length, data: tasks });
    } catch (error: any) {
      console.error('Fetch tasks error:', error);
      res.status(500).json({ success: false, message: 'Could not fetch tasks stream.', error: error.message });
    }
  },

  /**
   * Create a new corporate milestone/task
   */
  async createTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { title, description, priority, due_date, assigneeIds } = req.body;
      const creatorId = req.user ? req.user.id : null;

      if (!title || !priority || !due_date) {
        res.status(400).json({ success: false, message: 'Required fields: task title, priority category, and due date.' });
        return;
      }

      const newTask = await db.createTask({
        title,
        description,
        priority,
        due_date,
        created_by: creatorId
      }, assigneeIds || []);

      // Proactively trigger notification alert to assigned teammates
      if (assigneeIds && assigneeIds.length > 0) {
        const users = await db.query('SELECT * FROM users');
        for (const empId of assigneeIds) {
          const matchedUser = users.find((u: any) => u.employee_id === Number(empId));
          if (matchedUser) {
            await db.createNotification({
              user_id: matchedUser.id,
              title: 'Critical New Task Assigned',
              message: `You have been assigned to task: "${title}". Due date: ${due_date}`,
              type: 'Task'
            });
          }
        }
      }

      res.status(201).json({ success: true, message: 'Corporate task generated and assigned successfully.', data: newTask });
    } catch (error: any) {
      console.error('Create task error:', error);
      res.status(500).json({ success: false, message: 'Could not create task.', error: error.message });
    }
  },

  /**
   * Update task workflow status
   */
  async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const taskId = Number(req.params.id);
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ success: false, message: 'Missing target status label.' });
        return;
      }

      const success = await db.updateTaskStatus(taskId, status);
      if (!success) {
        res.status(404).json({ success: false, message: 'Task not found.' });
        return;
      }

      res.status(200).json({ success: true, message: 'Task status updated successfully.' });
    } catch (error: any) {
      console.error('Update task status error:', error);
      res.status(500).json({ success: false, message: 'Could not update task status.', error: error.message });
    }
  }
};
