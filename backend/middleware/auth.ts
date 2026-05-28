import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'high_security_enterprise_jwt_secret_token_2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: 'Admin' | 'HR Manager' | 'Employee';
    employee_id?: number;
  };
}

/**
 * Middleware to authenticate requests via JWT Token
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access Denied: No Authentication Token provided.'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({
      success: false,
      message: 'Access Denied: Invalid or expired Authentication Token.'
    });
  }
}

/**
 * Middleware to restrict access to specific roles
 */
export function authorizeRoles(...allowedRoles: ('Admin' | 'HR Manager' | 'Employee')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Access Denied: User is not authenticated.'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to roles: [${allowedRoles.join(', ')}]. Your role is ${req.user.role}.`
      });
      return;
    }

    next();
  };
}
