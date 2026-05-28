import { Response } from 'express';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

export const performanceController = {
  /**
   * Fetch all recorded performance evaluations
   */
  async getAllReviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const reviews = await db.getPerformanceReviews();
      res.status(200).json({ success: true, count: reviews.length, data: reviews });
    } catch (error: any) {
      console.error('Fetch reviews error:', error);
      res.status(500).json({ success: false, message: 'Could not fetch performance logs.', error: error.message });
    }
  },

  /**
   * Submit a new employee assessment & update corporate benchmarks
   */
  async createReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { employee_id, review_period, kpi_score, goals_met, feedback, review_date } = req.body;
      const reviewerEmpId = req.user && req.user.employee_id ? req.user.employee_id : 1; // Default to Admin's employee ref or sarah_hr

      if (!employee_id || !review_period || kpi_score === undefined || !review_date) {
        res.status(400).json({ success: false, message: 'Required fields: Employee target, review period, KPI score (1-5), and assessment date.' });
        return;
      }

      if (Number(kpi_score) < 1 || Number(kpi_score) > 5) {
        res.status(400).json({ success: false, message: 'KPI score must be between 1.00 and 5.00 in standard enterprise rubrics.' });
        return;
      }

      const review = await db.createPerformanceReview({
        employee_id: Number(employee_id),
        reviewer_id: Number(reviewerEmpId),
        review_period,
        kpi_score: Number(kpi_score),
        goals_met: goals_met ? 1 : 0,
        feedback,
        review_date
      });

      // Send a corporate alert to the reviewed user
      const users = await db.query('SELECT * FROM users');
      const targetUser = users.find((u: any) => u.employee_id === Number(employee_id));
      if (targetUser) {
        await db.createNotification({
          user_id: targetUser.id,
          title: 'Performance Appraisal Released',
          message: `Your assessment for ${review_period} has been submitted with a Score of ${kpi_score}/5.00.`,
          type: 'Alert'
        });
      }

      res.status(201).json({ success: true, message: 'Performance appraisal reported successfully.', data: review });
    } catch (error: any) {
      console.error('Create review error:', error);
      res.status(500).json({ success: false, message: 'Could not submit performance assessment.', error: error.message });
    }
  }
};
