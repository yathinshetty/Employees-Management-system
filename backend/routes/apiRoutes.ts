import { Router } from 'express';
import { authController } from '../controllers/authController';
import { employeeController } from '../controllers/employeeController';
import { departmentController } from '../controllers/departmentController';
import { leaveController } from '../controllers/leaveController';
import { payrollController } from '../controllers/payrollController';
import { attendanceController } from '../controllers/attendanceController';
import { taskController } from '../controllers/taskController';
import { performanceController } from '../controllers/performanceController';
import { notificationController } from '../controllers/notificationController';
import { reportController } from '../controllers/reportController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
router.post('/auth/login', authController.login);
router.post('/auth/register', authenticateToken, authorizeRoles('Admin', 'HR Manager'), authController.register);
router.get('/auth/profile', authenticateToken, authController.getProfile);

// ==========================================
// EMPLOYEE INTERFACES
// ==========================================
router.get('/employees/dashboard/stats', authenticateToken, authorizeRoles('Admin', 'HR Manager', 'Employee'), employeeController.getDashboardStats);
router.post('/employees/upload', authenticateToken, authorizeRoles('Admin', 'HR Manager'), employeeController.uploadImage);
router.get('/employees', authenticateToken, authorizeRoles('Admin', 'HR Manager'), employeeController.getAllEmployees);
router.get('/employees/:id', authenticateToken, employeeController.getEmployeeById);
router.post('/employees', authenticateToken, authorizeRoles('Admin', 'HR Manager'), employeeController.createEmployee);
router.put('/employees/:id', authenticateToken, authorizeRoles('Admin', 'HR Manager'), employeeController.updateEmployee);
router.delete('/employees/:id', authenticateToken, authorizeRoles('Admin', 'HR Manager'), employeeController.deleteEmployee);

// ==========================================
// CORPORATE DEPARTMENTS
// ==========================================
router.get('/departments', authenticateToken, departmentController.getAllDepartments);
router.post('/departments', authenticateToken, authorizeRoles('Admin', 'HR Manager'), departmentController.createDepartment);

// ==========================================
// ABSENCE & LEAVES MANAGEMENT
// ==========================================
router.get('/leaves', authenticateToken, leaveController.getAllLeaves);
router.post('/leaves', authenticateToken, authorizeRoles('Employee'), leaveController.applyLeave);
router.put('/leaves/:id', authenticateToken, authorizeRoles('Admin', 'HR Manager'), leaveController.updateStatus);

// ==========================================
// COMPENSATION & PAYROLLS
// ==========================================
router.get('/payroll', authenticateToken, payrollController.getPayrollRecords);
router.post('/payroll', authenticateToken, authorizeRoles('Admin', 'HR Manager'), payrollController.generateMonthlyPayroll);
router.put('/payroll/:id', authenticateToken, authorizeRoles('Admin', 'HR Manager'), payrollController.processPayment);

// ==========================================
// ATTENDANCE & TRACKING
// ==========================================
router.get('/attendance', authenticateToken, attendanceController.getAttendanceRecords);
router.get('/attendance/stats', authenticateToken, attendanceController.getAttendanceStats);
router.post('/attendance/check-in', authenticateToken, authorizeRoles('Employee'), attendanceController.selfCheckIn);
router.post('/attendance/check-out', authenticateToken, authorizeRoles('Employee'), attendanceController.selfCheckOut);
router.post('/attendance/admin-mark', authenticateToken, authorizeRoles('Admin', 'HR Manager'), attendanceController.adminMarkRecord);
router.delete('/attendance/:id', authenticateToken, authorizeRoles('Admin', 'HR Manager'), attendanceController.adminDeleteRecord);

// ==========================================
// TASKS, PERFORMANCE, NOTIFICATIONS & REPORTS
// ==========================================
router.get('/tasks', authenticateToken, taskController.getAllTasks);
router.post('/tasks', authenticateToken, authorizeRoles('Admin', 'HR Manager'), taskController.createTask);
router.put('/tasks/:id', authenticateToken, taskController.updateStatus);

router.get('/performance', authenticateToken, performanceController.getAllReviews);
router.post('/performance', authenticateToken, authorizeRoles('Admin', 'HR Manager'), performanceController.createReview);

router.get('/notifications', authenticateToken, notificationController.getUserNotifications);
router.put('/notifications/:id/read', authenticateToken, notificationController.markRead);

router.get('/reports', authenticateToken, authorizeRoles('Admin', 'HR Manager'), reportController.getEnterpriseReports);

export default router;
