import { Response } from 'express';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

export const notificationController = {
  /**
   * Fetch recent alert notifications for the logged-in user
   */
  async getUserNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user ? req.user.id : null;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized session.' });
        return;
      }

      const notifications = await db.getNotifications(userId);
      res.status(200).json({ success: true, count: notifications.length, data: notifications });
    } catch (error: any) {
      console.error('Fetch notifications error:', error);
      res.status(500).json({ success: false, message: 'Could not load enterprise notifications stream.', error: error.message });
    }
  },

  /**
   * Mark notification as read
   */
  async markRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const notifId = Number(req.params.id);
      const success = await db.markNotificationRead(notifId);
      if (!success) {
        res.status(404).json({ success: false, message: 'Notification audit record not found.' });
        return;
      }
      res.status(200).json({ success: true, message: 'Audit marked as read.' });
    } catch (error: any) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ success: false, message: 'Could not edit notification status.', error: error.message });
    }
  }
};
