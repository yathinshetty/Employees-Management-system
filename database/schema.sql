-- Employee Management System - MySQL Database Schema
-- Production Ready Enterprise Schema
-- Fully Normalized with Generated Columns to Avoid Redundancy and Support Advanced Constraints

CREATE DATABASE IF NOT EXISTS `ems_enterprise_db`;
USE `ems_enterprise_db`;

-- Drop tables if they exist to prevent conflicts (in logical dependency order)
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `performance_reviews`;
DROP TABLE IF EXISTS `task_assignments`;
DROP TABLE IF EXISTS `tasks`;
DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `payroll`;
DROP TABLE IF EXISTS `leave_requests`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `departments`;

-- 1. DEPARTMENTS TABLE
CREATE TABLE `departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `code` VARCHAR(10) NOT NULL UNIQUE,
  `manager_id` INT DEFAULT NULL,
  `budget` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_dept_name` (`name`),
  INDEX `idx_dept_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. EMPLOYEES TABLE
CREATE TABLE `employees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` VARCHAR(20) NOT NULL UNIQUE,
  `first_name` VARCHAR(50) NOT NULL,
  `last_name` VARCHAR(50) NOT NULL,
  -- Normalized generated column to satisfy prompt's full_name requirement without data duplication
  `full_name` VARCHAR(101) GENERATED ALWAYS AS (CONCAT(`first_name`, ' ', `last_name`)) STORED,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(20) DEFAULT NULL,
  `hire_date` DATE NOT NULL,
  -- Normalized generated column to satisfy prompt's joining_date requirement without data duplication
  `joining_date` DATE GENERATED ALWAYS AS (`hire_date`) STORED,
  `job_title` VARCHAR(100) NOT NULL,
  -- Normalized generated column to satisfy designation requirement without data duplication
  `designation` VARCHAR(100) GENERATED ALWAYS AS (`job_title`) STORED,
  `department_id` INT NOT NULL,
  `salary` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('Active', 'On Leave', 'Terminated') NOT NULL DEFAULT 'Active',
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  -- Normalized generated column to satisfy profile_image requirement without data duplication
  `profile_image` VARCHAR(255) GENERATED ALWAYS AS (`avatar_url`) STORED,
  `gender` VARCHAR(20) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `emergency_contact` VARCHAR(100) DEFAULT NULL,
  `date_of_birth` DATE DEFAULT NULL,
  `performance_score` ENUM('Excellent', 'Good', 'Average', 'Needs Improvement') DEFAULT 'Good',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_employee_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  -- Indexing strategies for enterprise lookups
  INDEX `idx_emp_id` (`employee_id`),
  INDEX `idx_emp_dept` (`department_id`),
  INDEX `idx_emp_status` (`status`),
  INDEX `idx_emp_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Self-reference relation for Department Managers (Many-to-One from department to employees)
ALTER TABLE `departments` ADD CONSTRAINT `fk_department_manager` FOREIGN KEY (`manager_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. USERS TABLE (System Auth Accounts)
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('Admin', 'HR Manager', 'Employee') NOT NULL DEFAULT 'Employee',
  `employee_id` INT DEFAULT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_user_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_users_username` (`username`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. LEAVE REQUESTS TABLE (Schedules & Absence Auditing)
CREATE TABLE `leave_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `leave_type` ENUM('Annual', 'Sick', 'Maternity', 'Unpaid', 'Paternity') NOT NULL DEFAULT 'Annual',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  `approved_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_leave_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_approver` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_leave_employee` (`employee_id`),
  INDEX `idx_leave_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. PAYROLL TABLE (Compensation Ledger)
CREATE TABLE `payroll` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `month` VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  `basic_salary` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  -- Normalized generated column mapping to basic_salary to satisfy the prompt configuration
  `base_salary` DECIMAL(12, 2) GENERATED ALWAYS AS (`basic_salary`) STORED,
  `bonuses` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  -- Normalized generated column mapping to bonuses
  `bonus` DECIMAL(12, 2) GENERATED ALWAYS AS (`bonuses`) STORED,
  `deductions` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `tax` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  -- Net salary calculates the final take-home pay strictly adhering to financial algorithms
  `net_salary` DECIMAL(12, 2) GENERATED ALWAYS AS (pmax(`basic_salary` + `bonuses` - `deductions` - `tax`, 0.00)) STORED,
  `payment_status` ENUM('Paid', 'Pending', 'Processing') NOT NULL DEFAULT 'Pending',
  `payment_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_employee_payroll_month` (`employee_id`, `month`),
  CONSTRAINT `fk_payroll_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_payroll_employee` (`employee_id`),
  INDEX `idx_payroll_month` (`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ATTENDANCE TABLE (Audit Tracking)
CREATE TABLE `attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `clock_in` TIME DEFAULT NULL,
  `clock_out` TIME DEFAULT NULL,
  -- Generated Columns for prompt's specific naming standards
  `check_in_time` TIME GENERATED ALWAYS AS (`clock_in`) STORED,
  `check_out_time` TIME GENERATED ALWAYS AS (`clock_out`) STORED,
  -- Floating point hours representing the precise work time calculated gracefully in seconds
  `total_hours` DECIMAL(5, 2) DEFAULT NULL,
  `status` ENUM('Present', 'Absent', 'Late', 'Half Day') NOT NULL DEFAULT 'Present',
  -- Normalized generated column mapping `status` to `attendance_status`
  `attendance_status` VARCHAR(20) GENERATED ALWAYS AS (`status`) STORED,
  `notes` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_employee_attendance_date` (`employee_id`, `date`),
  CONSTRAINT `fk_attendance_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_attendance_employee` (`employee_id`),
  INDEX `idx_attendance_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TASKS TABLE (Goal Allocation & Sprint Delivery)
CREATE TABLE `tasks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('Todo', 'In Progress', 'Under Review', 'Completed') NOT NULL DEFAULT 'Todo',
  `priority` ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
  `due_date` DATE DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_task_creator` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_task_status` (`status`),
  INDEX `idx_task_due` (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TASK ASSIGNMENTS TABLE (N-to-M Assignment Join Table)
CREATE TABLE `task_assignments` (
  `task_id` INT NOT NULL,
  `employee_id` INT NOT NULL,
  `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`task_id`, `employee_id`),
  CONSTRAINT `fk_assign_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_assign_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_assign_employee` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. PERFORMANCE REVIEWS TABLE (Annual and Quarterly Growth Trackers)
CREATE TABLE `performance_reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `reviewer_id` INT NOT NULL,
  `review_period` VARCHAR(30) NOT NULL, -- e.g., 'Q1 2026', 'Annual 2026'
  `kpi_score` DECIMAL(3, 2) NOT NULL DEFAULT 5.00, -- Scale: 1.00 to 5.00 (Standard Corporate Rating)
  `goals_met` TINYINT(1) NOT NULL DEFAULT 1,
  `feedback` TEXT DEFAULT NULL,
  `review_date` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_review_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_review_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `employees` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_review_employee` (`employee_id`),
  INDEX `idx_review_period` (`review_period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. NOTIFICATIONS TABLE (Targeted Messaging Engine)
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(30) NOT NULL DEFAULT 'Info', -- e.g., 'Info', 'Task', 'Alert', 'Payroll'
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_notif_user_unread` (`user_id`, `is_read`) -- High-performance read queries coverage
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- STANDARD STORED FUNCTIONS FOR NORMALIZED FORMULA VALIDATION
-- -------------------------------------------------------------
DELIMITER //
CREATE FUNCTION pmax(a DECIMAL(12,2), b DECIMAL(12,2)) 
RETURNS DECIMAL(12,2) DETERMINISTIC
BEGIN
  RETURN IF(a > b, a, b);
END//
DELIMITER ;


-- -------------------------------------------------------------
-- SEED INITIAL CORPORATE DATA FOR ENTERPRISE INTEGRATION
-- -------------------------------------------------------------

-- Seed Departments
INSERT INTO `departments` (`id`, `name`, `code`, `budget`, `description`) VALUES
(1, 'Engineering & Tech', 'ENG', 1200000.00, 'Enterprise Systems architecture and system development Node'),
(2, 'Human Resources', 'HR', 350000.00, 'Talent Acquisition, Employee Relations, and Payroll Policy Audit'),
(3, 'Sales & Marketing', 'MKT', 500000.00, 'Global growth, corporate outreach, and digital presence'),
(4, 'Finance & Payroll', 'FIN', 400000.00, 'Asset consolidation, expense verification, and remittance execution');

-- Seed Employees (Sourced Base Staff)
INSERT INTO `employees` (`id`, `employee_id`, `first_name`, `last_name`, `email`, `phone`, `hire_date`, `job_title`, `department_id`, `salary`, `status`, `gender`, `address`, `emergency_contact`, `performance_score`) VALUES
(1, 'EMP-2026-001', 'Sarah', 'Jenkins', 'sarah.j@enterprise.com', '+1 (555) 0192', '2024-03-15', 'HR Executive Director', 2, 95000.00, 'Active', 'Female', '42 Wallaby Way, Sydney', 'Mark Jenkins (+1 (555) 0193)', 'Excellent'),
(2, 'EMP-2026-002', 'David', 'Chen', 'david.c@enterprise.com', '+1 (555) 0244', '2024-06-01', 'Lead Cloud Infrastructure Architect', 1, 145000.00, 'Active', 'Male', '108 Grid Street, Cyber City', 'Lin Chen (+1 (555) 0245)', 'Excellent'),
(3, 'EMP-2026-003', 'Elena', 'Rostova', 'elena.r@enterprise.com', '+1 (555) 0388', '2025-01-10', 'Senior Software Engineer', 1, 115000.00, 'Active', 'Female', '12 Nevsky Prospect, Cyber Saint Petersburg', 'Vincenzo Rostova (+1 (555) 0389)', 'Good'),
(4, 'EMP-2026-004', 'Marcus', 'Aurelius', 'marcus.a@enterprise.com', '+1 (555) 0412', '2025-08-20', 'Marketing Lead', 3, 85000.00, 'Active', 'Male', '1 Forum Romanum, New Rome', 'Faustina Aurelius (+1 (555) 0413)', 'Good'),
(5, 'EMP-2026-005', 'Jane', 'Doe', 'jane.doe@enterprise.com', '+1 (555) 0513', '2025-11-25', 'Compensation & Payroll Analyst', 4, 78000.00, 'Active', 'Female', '202 Green Boulevard, Forest Hill', 'John Doe (+1 (555) 0514)', 'Good'),
(6, 'EMP-2026-006', 'Robert', 'Miller', 'robert.m@enterprise.com', '+1 (555) 0691', '2026-02-01', 'Junior Developer', 1, 65000.00, 'On Leave', 'Male', '77 Pine Street, Redwood', 'Alice Miller (+1 (555) 0692)', 'Average');

-- Setup Department Managers and Foreign Keys
UPDATE `departments` SET `manager_id` = 2 WHERE `id` = 1;
UPDATE `departments` SET `manager_id` = 1 WHERE `id` = 2;
UPDATE `departments` SET `manager_id` = 4 WHERE `id` = 3;
UPDATE `departments` SET `manager_id` = 5 WHERE `id` = 4;

-- Seed Users (Pre-hashed with standard valid Bcrypt. Default pass: "password123")
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `role`, `employee_id`) VALUES
(1, 'yathin', 'yathin@enterprise.com', '$2b$10$yCDDhNYcKFUQs9unEvD58eZedPwTY.mcE2x5Yy4i3O.Gc7mIQR3Ge', 'Admin', NULL),
(2, 'sarah_hr', 'sarah.j@enterprise.com', '$2b$10$yCDDhNYcKFUQs9unEvD58eZedPwTY.mcE2x5Yy4i3O.Gc7mIQR3Ge', 'HR Manager', 1),
(3, 'david_tech', 'david.c@enterprise.com', '$2b$10$yCDDhNYcKFUQs9unEvD58eZedPwTY.mcE2x5Yy4i3O.Gc7mIQR3Ge', 'Employee', 2),
(4, 'elena_eng', 'elena.r@enterprise.com', '$2b$10$yCDDhNYcKFUQs9unEvD58eZedPwTY.mcE2x5Yy4i3O.Gc7mIQR3Ge', 'Employee', 3);

-- Seed Leave Requests
INSERT INTO `leave_requests` (`id`, `employee_id`, `leave_type`, `start_date`, `end_date`, `reason`, `status`, `approved_by`) VALUES
(1, 6, 'Sick', '2026-05-20', '2026-05-22', 'Medical dental procedure recovery', 'Approved', 1),
(2, 3, 'Annual', '2026-06-10', '2026-06-17', 'Summer family vacation trip', 'Pending', NULL),
(3, 4, 'Unpaid', '2026-07-01', '2026-07-05', 'Personal housing relocation planning', 'Pending', NULL);

-- Seed Payrolls
INSERT INTO `payroll` (`employee_id`, `month`, `basic_salary`, `bonuses`, `deductions`, `tax`, `payment_status`, `payment_date`) VALUES
(1, '2026-05', 7916.67, 500.00, 200.00, 1187.50, 'Paid', '2026-05-25'),
(2, '2026-05', 12083.33, 1500.00, 500.00, 1812.50, 'Paid', '2026-05-25'),
(3, '2026-05', 9583.33, 0.00, 300.00, 1437.50, 'Paid', '2026-05-25'),
(4, '2026-05', 7083.33, 200.00, 150.00, 1062.50, 'Processing', NULL),
(5, '2026-05', 6500.00, 0.00, 100.00, 975.00, 'Pending', NULL);

-- Seed Attendance
INSERT INTO `attendance` (`employee_id`, `date`, `clock_in`, `clock_out`, `total_hours`, `status`, `notes`) VALUES
(1, '2026-05-28', '08:52:10', '17:30:00', 8.63, 'Present', 'On premises in Building A'),
(2, '2026-05-28', '08:45:00', '17:00:00', 8.25, 'Present', 'Remote server status validation'),
(3, '2026-05-28', '09:12:30', '18:00:00', 8.79, 'Late', 'Heavy traffic commute delay'),
(4, '2026-05-28', '08:55:00', '17:45:00', 8.83, 'Present', 'On premises'),
(5, '2026-05-28', '09:00:00', '17:00:00', 8.00, 'Present', 'On premises');

-- Seed Tasks
INSERT INTO `tasks` (`id`, `title`, `description`, `status`, `priority`, `due_date`, `created_by`) VALUES
(1, 'Migrate Core Database to Cloud Server', 'Provision Multi-AZ Cloud database node, map replication topologies, export schemas and migrate user storage files security validation.', 'In Progress', 'Critical', '2026-06-15', 2),
(2, 'Perform Mid-Year Performance Assessments', 'Setup performance review benchmarks, request employee self-appraisals, and finalize scoring matrices within HR parameters.', 'Todo', 'High', '2026-07-01', 1),
(3, 'Audit Corporate Security Protocols', 'Perform threat intelligence audits across local firewall servers and restrict external endpoint accesses to secure tunnels.', 'Completed', 'Medium', '2026-05-20', 2);

-- Seed Task Assignments
INSERT INTO `task_assignments` (`task_id`, `employee_id`) VALUES
(1, 2), -- David Chen assigned to DB migration
(1, 3), -- Elena Rostova also assigned
(2, 1), -- Sarah Jenkins assigned to performance assessment
(2, 5), -- Jane Doe assisting
(3, 2); -- David Chen handled audit

-- Seed Performance Reviews
INSERT INTO `performance_reviews` (`id`, `employee_id`, `reviewer_id`, `review_period`, `kpi_score`, `goals_met`, `feedback`, `review_date`) VALUES
(1, 3, 2, 'Annual 2025', 4.50, 1, 'Elena continues to exceed architectural standards in platform performance optimization. Exceptional delivery on core services rewriting.', '2025-12-15'),
(2, 6, 2, 'Q1 2026', 3.20, 0, 'Robert shows enthusiastic learning growth but needs stricter emphasis on test coverage benchmarks and clean code conventions.', '2026-04-05');

-- Seed Notifications
INSERT INTO `notifications` (`user_id`, `title`, `message`, `type`) VALUES
(2, 'New Leave Application Received', 'Elena Rostova has filed a new Annual Leave application from 2026-06-10 to 2026-06-17. Please inspect and process.', 'Action'),
(3, 'Critical Task Priority Assignment', 'You have been assigned to: Migration of Core Database. Due date initialized as June 15, 2026.', 'Task'),
(4, 'Payroll Remittance Audited', 'Your payroll slip for MAY 2026 has been successfully generated and finalized for bank transaction.', 'Payroll');
