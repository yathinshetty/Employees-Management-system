import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_STORE_PATH = path.join(process.cwd(), 'database', 'db_store.json');

// Initialize a pool variable for MySQL
let pool: mysql.Pool | null = null;
let useMySQL = false;

function isConnectionError(err: any): boolean {
  if (!err) return false;
  const code = err.code || '';
  const errno = err.errno;
  const syscall = err.syscall;
  const msg = err.message || '';
  return (
    code === 'EAI_AGAIN' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'PROTOCOL_CONNECTION_LOST' ||
    syscall === 'getaddrinfo' ||
    syscall === 'connect' ||
    code === 'ERR_NETWORK_ACCESS_DENIED' ||
    msg.includes('getaddrinfo') ||
    msg.includes('connect ECONNREFUSED')
  );
}

// Check if we have MySQL configurations
if (process.env.DB_HOST && process.env.DB_USER) {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'ems_enterprise_db',
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    console.log('✅ Enterprise mode: Configured MySQL Database connection pool.');
    useMySQL = true;

    // Async probe connection to fail fast at startup and prevent API timeouts
    pool.query('SELECT 1').then(() => {
      console.log('✅ Connected to MySQL database successfully.');
    }).catch((err: any) => {
      if (isConnectionError(err)) {
        console.warn('⚠️ MySQL connection check failed at startup. Falling back immediately to local JSON DevStore. Error:', err.message || err);
        useMySQL = false;
      }
    });
  } catch (error) {
    console.error('❌ Failed to initialize MySQL Pool, falling back to JSON DevStore:', error);
  }
} else {
  console.log('ℹ️ Local Dev mode: No DB_HOST found in env. Initialized high-performance JSON DevStore.');
}

async function run<T>(mysqlBlock: () => Promise<T>, jsonBlock: () => Promise<T>): Promise<T> {
  if (useMySQL && pool) {
    try {
      return await mysqlBlock();
    } catch (err: any) {
      if (isConnectionError(err)) {
        console.error('⚠️ DB Connection Error detected during runtime. Disabling MySQL, switching to local DevStore. Error:', err.message || err);
        useMySQL = false;
      } else {
        throw err;
      }
    }
  }
  return await jsonBlock();
}

/**
 * Read the file database for dev fallback
 */
function readDevDb(): any {
  try {
    if (!fs.existsSync(DB_STORE_PATH)) {
      // Create empty if it doesn't exist
      const initial = {
        departments: [],
        employees: [],
        users: [],
        leave_requests: [],
        payroll: [],
        attendance: []
      };
      fs.writeFileSync(DB_STORE_PATH, JSON.stringify(initial, null, 2));
      return initial;
    }
    const data = fs.readFileSync(DB_STORE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON DevStore:', error);
    return {};
  }
}

/**
 * Write the file database for dev fallback
 */
function writeDevDb(data: any): void {
  try {
    fs.writeFileSync(DB_STORE_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing to JSON DevStore:', error);
  }
}

/**
 * Database abstraction layer matching production workflows
 */
export const db = {
  isMySQLUsed(): boolean {
    return useMySQL;
  },

  /**
   * Run raw queries in MySQL or emulate them for the DevStore.
   * This provides a universal service layer to satisfy both environments!
   */
  async query(sql: string, params: any[] = []): Promise<any> {
    return run(
      async () => {
        const [results] = await pool!.query(sql, params);
        return results;
      },
      async () => {
        // Direct, state-of-the-art Local SQL Emulation
        const devDb = readDevDb();
        const sqlClean = sql.trim().replace(/\s+/g, ' ');

        // Handle SELECT ALL queries
        if (sqlClean.toUpperCase().startsWith('SELECT * FROM departments')) {
          return devDb.departments;
        }
        if (sqlClean.toUpperCase().startsWith('SELECT * FROM employees')) {
          // Enrich with department name if selected with join
          return devDb.employees.map((emp: any) => {
            const dept = devDb.departments.find((d: any) => d.id === emp.department_id);
            return { ...emp, department_name: dept ? dept.name : 'Unknown' };
          });
        }
        if (sqlClean.toUpperCase().startsWith('SELECT * FROM users')) {
          return devDb.users;
        }
        if (sqlClean.toUpperCase().startsWith('SELECT * FROM leave_requests')) {
          return devDb.leave_requests.map((leave: any) => {
            const emp = devDb.employees.find((e: any) => e.id === leave.employee_id);
            const approver = leave.approved_by ? devDb.employees.find((e: any) => e.id === leave.approved_by) : null;
            return {
              ...leave,
              employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown Employee',
              job_title: emp ? emp.job_title : '',
              approved_by_name: approver ? `${approver.first_name} ${approver.last_name}` : undefined
            };
          });
        }
        if (sqlClean.toUpperCase().startsWith('SELECT * FROM payroll')) {
          return devDb.payroll.map((p: any) => {
            const emp = devDb.employees.find((e: any) => e.id === p.employee_id);
            const dept = emp ? devDb.departments.find((d: any) => d.id === emp.department_id) : null;
            return {
              ...p,
              employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown Employee',
              job_title: emp ? emp.job_title : '',
              department_name: dept ? dept.name : 'No Dept'
            };
          });
        }
        if (sqlClean.toUpperCase().startsWith('SELECT * FROM attendance')) {
          return devDb.attendance.map((att: any) => {
            const emp = devDb.employees.find((e: any) => e.id === att.employee_id);
            return {
              ...att,
              employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown Employee'
            };
          });
        }

        // Specific WHERE queries (e.g., SELECT * FROM users WHERE email = ? or username = ?)
        if (sqlClean.includes('FROM users WHERE email =') || sqlClean.includes('email = ?')) {
          const email = params[0];
          return devDb.users.filter((u: any) => u.email === email || u.username === email);
        }
        if (sqlClean.includes('FROM users WHERE username =') || sqlClean.includes('username = ?')) {
          const username = params[0];
          return devDb.users.filter((u: any) => u.username === username);
        }
        if (sqlClean.includes('FROM employees WHERE employee_id =') || sqlClean.includes('employee_id = ?')) {
          const empId = params[0];
          return devDb.employees.filter((e: any) => e.employee_id === empId);
        }

        return [];
      }
    );
  },

  // Concrete Model Helpers for type-safe execution
  async getEmployees(): Promise<any[]> {
    return run(
      async () => {
        const [rows] = await pool!.query(`
          SELECT e.*, d.name as department_name 
          FROM employees e 
          JOIN departments d ON e.department_id = d.id
        `);
        return rows as any[];
      },
      async () => {
        const devDb = readDevDb();
        return devDb.employees.map((emp: any) => {
          const dept = devDb.departments.find((d: any) => d.id === emp.department_id);
          return { ...emp, department_name: dept ? dept.name : 'Unknown' };
        });
      }
    );
  },

  async getEmployeeById(id: number): Promise<any | null> {
    return run(
      async () => {
        const [rows]: any = await pool!.query('SELECT * FROM employees WHERE id = ?', [id]);
        return rows[0] || null;
      },
      async () => {
        const devDb = readDevDb();
        return devDb.employees.find((emp: any) => emp.id === id) || null;
      }
    );
  },

  async createEmployee(data: any): Promise<any> {
    if (useMySQL && pool) {
      const [result]: any = await pool.query(`
        INSERT INTO employees (employee_id, first_name, last_name, email, phone, hire_date, job_title, department_id, salary, status, performance_score, gender, address, emergency_contact, avatar_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.employee_id, data.first_name, data.last_name, data.email, data.phone, data.hire_date,
        data.job_title, data.department_id, data.salary, data.status || 'Active', data.performance_score || 'Good',
        data.gender || null, data.address || null, data.emergency_contact || null, data.avatar_url || null
      ]);
      return { id: result.insertId, ...data };
    }
    const devDb = readDevDb();
    const newId = devDb.employees.reduce((max: number, e: any) => (e.id > max ? e.id : max), 0) + 1;
    const newEmp = { id: newId, ...data };
    devDb.employees.push(newEmp);
    writeDevDb(devDb);
    return newEmp;
  },

  async updateEmployee(id: number, data: any): Promise<boolean> {
    if (useMySQL && pool) {
      const [result]: any = await pool.query(`
        UPDATE employees SET 
          first_name = ?, last_name = ?, email = ?, phone = ?, 
          job_title = ?, department_id = ?, salary = ?, status = ?, performance_score = ?,
          gender = ?, address = ?, emergency_contact = ?, avatar_url = ?
        WHERE id = ?
      `, [
        data.first_name, data.last_name, data.email, data.phone,
        data.job_title, data.department_id, data.salary, data.status, data.performance_score,
        data.gender || null, data.address || null, data.emergency_contact || null, data.avatar_url || null, id
      ]);
      return result.affectedRows > 0;
    }
    const devDb = readDevDb();
    const index = devDb.employees.findIndex((e: any) => e.id === id);
    if (index !== -1) {
      devDb.employees[index] = { ...devDb.employees[index], ...data };
      writeDevDb(devDb);
      return true;
    }
    return false;
  },

  async deleteEmployee(id: number): Promise<boolean> {
    if (useMySQL && pool) {
      // Handle Cascade dependencies if required
      await pool.query('DELETE FROM users WHERE employee_id = ?', [id]);
      const [result]: any = await pool.query('DELETE FROM employees WHERE id = ?', [id]);
      return result.affectedRows > 0;
    }
    const devDb = readDevDb();
    const originalLen = devDb.employees.length;
    devDb.employees = devDb.employees.filter((e: any) => e.id !== id);
    devDb.users = devDb.users.filter((u: any) => u.employee_id !== id);
    devDb.payroll = devDb.payroll.filter((p: any) => p.employee_id !== id);
    devDb.attendance = devDb.attendance.filter((a: any) => a.employee_id !== id);
    devDb.leave_requests = devDb.leave_requests.filter((l: any) => l.employee_id !== id);
    writeDevDb(devDb);
    return devDb.employees.length < originalLen;
  },

  // Department Helpers
  async getDepartments(): Promise<any[]> {
    if (useMySQL && pool) {
      const [rows] = await pool.query(`
        SELECT d.*, e.first_name, e.last_name, COUNT(emp.id) as employee_count
        FROM departments d
        LEFT JOIN employees e ON d.manager_id = e.id
        LEFT JOIN employees emp ON d.id = emp.department_id
        GROUP BY d.id
      `);
      return rows as any[];
    }
    const devDb = readDevDb();
    return devDb.departments.map((dept: any) => {
      const manager = devDb.employees.find((e: any) => e.id === dept.manager_id);
      const count = devDb.employees.filter((e: any) => e.department_id === dept.id).length;
      return {
        ...dept,
        manager_name: manager ? `${manager.first_name} ${manager.last_name}` : 'Unassigned',
        employee_count: count
      };
    });
  },

  async createDepartment(data: any): Promise<any> {
    if (useMySQL && pool) {
      const [result]: any = await pool.query(`
        INSERT INTO departments (name, code, manager_id, budget) VALUES (?, ?, ?, ?)
      `, [data.name, data.code, data.manager_id || null, data.budget]);
      return { id: result.insertId, ...data };
    }
    const devDb = readDevDb();
    const newId = devDb.departments.reduce((max: number, d: any) => (d.id > max ? d.id : max), 0) + 1;
    const newDept = { id: newId, ...data };
    devDb.departments.push(newDept);
    writeDevDb(devDb);
    return newDept;
  },

  // Leave Requests Helpers
  async getLeaveRequests(): Promise<any[]> {
    if (useMySQL && pool) {
      const [rows] = await pool.query(`
        SELECT lr.*, CONCAT(e.first_name, ' ', e.last_name) as employee_name, e.job_title,
               CONCAT(mgr.first_name, ' ', mgr.last_name) as approved_by_name
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.id
        LEFT JOIN employees mgr ON lr.approved_by = mgr.id
        ORDER BY lr.created_at DESC
      `);
      return rows as any[];
    }
    const devDb = readDevDb();
    return devDb.leave_requests.map((leave: any) => {
      const emp = devDb.employees.find((e: any) => e.id === leave.employee_id);
      const approver = leave.approved_by ? devDb.employees.find((e: any) => e.id === leave.approved_by) : null;
      // calculate total days
      const days = Math.ceil((new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return {
        ...leave,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown Employee',
        job_title: emp ? emp.job_title : '',
        total_days: days,
        approved_by_name: approver ? `${approver.first_name} ${approver.last_name}` : undefined
      };
    });
  },

  async updateLeaveStatus(id: number, status: 'Approved' | 'Rejected', managerId: number): Promise<boolean> {
    if (useMySQL && pool) {
      const [result]: any = await pool.query(`
        UPDATE leave_requests SET status = ?, approved_by = ? WHERE id = ?
      `, [status, managerId, id]);
      return result.affectedRows > 0;
    }
    const devDb = readDevDb();
    const index = devDb.leave_requests.findIndex((l: any) => l.id === id);
    if (index !== -1) {
      devDb.leave_requests[index].status = status;
      devDb.leave_requests[index].approved_by = managerId;
      writeDevDb(devDb);
      return true;
    }
    return false;
  },

  // Payroll Helpers
  async getPayroll(): Promise<any[]> {
    if (useMySQL && pool) {
      const [rows] = await pool.query(`
        SELECT p.*, CONCAT(e.first_name, ' ', e.last_name) as employee_name, e.job_title, d.name as department_name
        FROM payroll p
        JOIN employees e ON p.employee_id = e.id
        JOIN departments d ON e.department_id = d.id
        ORDER BY p.month DESC
      `);
      return rows as any[];
    }
    const devDb = readDevDb();
    return devDb.payroll.map((p: any) => {
      const emp = devDb.employees.find((e: any) => e.id === p.employee_id);
      const dept = emp ? devDb.departments.find((d: any) => d.id === emp.department_id) : null;
      return {
        ...p,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown Employee',
        job_title: emp ? emp.job_title : '',
        department_name: dept ? dept.name : 'Unknown'
      };
    });
  },

  async updatePayrollStatus(id: number, status: 'Paid' | 'Pending' | 'Processing'): Promise<boolean> {
    if (useMySQL && pool) {
      const paymentDate = status === 'Paid' ? new Date().toISOString().split('T')[0] : null;
      const [result]: any = await pool.query(`
        UPDATE payroll SET payment_status = ?, payment_date = ? WHERE id = ?
      `, [status, paymentDate, id]);
      return result.affectedRows > 0;
    }
    const devDb = readDevDb();
    const index = devDb.payroll.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      devDb.payroll[index].payment_status = status;
      devDb.payroll[index].payment_date = status === 'Paid' ? new Date().toISOString().split('T')[0] : null;
      writeDevDb(devDb);
      return true;
    }
    return false;
  },

  async createPayrollRecord(payrollData: any): Promise<any> {
    if (useMySQL && pool) {
      const [result]: any = await pool.query(`
        INSERT INTO payroll (employee_id, month, basic_salary, bonuses, deductions, net_salary, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        payrollData.employee_id, payrollData.month, payrollData.basic_salary,
        payrollData.bonuses || 0, payrollData.deductions || 0, payrollData.net_salary, payrollData.payment_status || 'Pending'
      ]);
      return { id: result.insertId, ...payrollData };
    }
    const devDb = readDevDb();
    const newId = devDb.payroll.reduce((max: number, p: any) => (p.id > max ? p.id : max), 0) + 1;
    const newPay = { id: newId, ...payrollData };
    devDb.payroll.push(newPay);
    writeDevDb(devDb);
    return newPay;
  },

  // Attendance Helpers
  async getAttendance(): Promise<any[]> {
    if (useMySQL && pool) {
      const [rows] = await pool.query(`
        SELECT a.*, 
               CONCAT(e.first_name, ' ', e.last_name) as employee_name,
               e.employee_id as emp_uid,
               e.department_id,
               d.name as department_name,
               d.code as department_code
        FROM attendance a
        JOIN employees e ON a.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        ORDER BY a.date DESC, a.clock_in DESC
      `);
      return rows as any[];
    }
    const devDb = readDevDb();
    return devDb.attendance.map((att: any) => {
      const emp = devDb.employees.find((e: any) => e.id === att.employee_id);
      let deptName = 'Unassigned';
      let deptCode = '';
      if (emp) {
        const dept = devDb.departments.find((d: any) => d.id === emp.department_id);
        if (dept) {
          deptName = dept.name;
          deptCode = dept.code;
        }
      }
      return {
        ...att,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown Employee',
        emp_uid: emp ? emp.employee_id : '',
        department_id: emp ? emp.department_id : null,
        department_name: deptName,
        department_code: deptCode
      };
    });
  },

  async recordAttendance(employeeId: number, status: 'Present' | 'Absent' | 'Late' | 'Half Day', notes?: string): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });

    if (useMySQL && pool) {
      const [result]: any = await pool.query(`
        INSERT INTO attendance (employee_id, date, clock_in, status, notes)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE clock_out = ?, status = ?, notes = ?
      `, [employeeId, today, nowTime, status, notes, nowTime, status, notes]);
      return { employee_id: employeeId, date: today, clock_in: nowTime, status, notes };
    }

    const devDb = readDevDb();
    const existingIndex = devDb.attendance.findIndex((a: any) => a.employee_id === employeeId && a.date === today);
    if (existingIndex !== -1) {
      devDb.attendance[existingIndex].clock_out = nowTime;
      devDb.attendance[existingIndex].status = status;
      devDb.attendance[existingIndex].notes = notes || devDb.attendance[existingIndex].notes;
    } else {
      const newId = devDb.attendance.reduce((max: number, a: any) => (a.id > max ? a.id : max), 0) + 1;
      devDb.attendance.push({
        id: newId,
        employee_id: employeeId,
        date: today,
        clock_in: nowTime,
        clock_out: null,
        status,
        notes: notes || ''
      });
    }
    writeDevDb(devDb);
    return { employee_id: employeeId, date: today, clock_in: nowTime, status, notes };
  },

  async handleCheckIn(employeeId: number, dateStr: string, status: string, notes: string): Promise<any> {
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    if (useMySQL && pool) {
      await pool.query(`
        INSERT INTO attendance (employee_id, date, clock_in, status, notes)
        VALUES (?, ?, ?, ?, ?)
      `, [employeeId, dateStr, nowTime, status, notes]);
      return { success: true, date: dateStr, clock_in: nowTime, status };
    }

    const devDb = readDevDb();
    const newId = devDb.attendance.reduce((max: number, a: any) => (a.id > max ? a.id : max), 0) + 1;
    devDb.attendance.push({
      id: newId,
      employee_id: employeeId,
      date: dateStr,
      clock_in: nowTime,
      clock_out: null,
      total_hours: null,
      status,
      notes
    });
    writeDevDb(devDb);
    return { success: true, date: dateStr, clock_in: nowTime, status };
  },

  async handleCheckOut(employeeId: number, dateStr: string): Promise<any> {
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    if (useMySQL && pool) {
      // Fetch starting checkpoint first to compute hours
      const [rows]: any = await pool.query(
        'SELECT clock_in FROM attendance WHERE employee_id = ? AND date = ?',
        [employeeId, dateStr]
      );
      if (!rows || rows.length === 0) {
        throw new Error('Check-in record target not found for today.');
      }
      const clockIn = rows[0].clock_in;
      const hours = this.helperCalculateHours(clockIn, nowTime);

      await pool.query(`
        UPDATE attendance 
        SET clock_out = ?, total_hours = ?
        WHERE employee_id = ? AND date = ?
      `, [nowTime, hours, employeeId, dateStr]);

      return { success: true, clock_out: nowTime, total_hours: hours };
    }

    const devDb = readDevDb();
    const existingIndex = devDb.attendance.findIndex((a: any) => a.employee_id === employeeId && a.date === dateStr);
    if (existingIndex === -1) {
      throw new Error('Check-in record target not found for today.');
    }
    const record = devDb.attendance[existingIndex];
    const clockIn = record.clock_in;
    const hours = this.helperCalculateHours(clockIn, nowTime);

    devDb.attendance[existingIndex].clock_out = nowTime;
    devDb.attendance[existingIndex].total_hours = hours;
    writeDevDb(devDb);
    return { success: true, clock_out: nowTime, total_hours: hours };
  },

  async adminMarkAttendance(data: any): Promise<any> {
    const hours = this.helperCalculateHours(data.clock_in, data.clock_out);
    
    if (useMySQL && pool) {
      if (data.id) {
        await pool.query(`
          UPDATE attendance 
          SET date = ?, clock_in = ?, clock_out = ?, total_hours = ?, status = ?, notes = ?, employee_id = ?
          WHERE id = ?
        `, [data.date, data.clock_in || null, data.clock_out || null, hours, data.status, data.notes || null, data.employee_id, data.id]);
        return { id: data.id, ...data, total_hours: hours };
      } else {
        const [result]: any = await pool.query(`
          INSERT INTO attendance (employee_id, date, clock_in, clock_out, total_hours, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [data.employee_id, data.date, data.clock_in || null, data.clock_out || null, hours, data.status, data.notes || null]);
        return { id: result.insertId, ...data, total_hours: hours };
      }
    }

    const devDb = readDevDb();
    if (data.id) {
      const existingIdx = devDb.attendance.findIndex((a: any) => a.id === Number(data.id));
      if (existingIdx !== -1) {
        devDb.attendance[existingIdx] = {
          id: Number(data.id),
          employee_id: Number(data.employee_id),
          date: data.date,
          clock_in: data.clock_in || null,
          clock_out: data.clock_out || null,
          total_hours: hours,
          status: data.status,
          notes: data.notes || ''
        };
      }
    } else {
      const newId = devDb.attendance.reduce((max: number, a: any) => (a.id > max ? a.id : max), 0) + 1;
      devDb.attendance.push({
        id: newId,
        employee_id: Number(data.employee_id),
        date: data.date,
        clock_in: data.clock_in || null,
        clock_out: data.clock_out || null,
        total_hours: hours,
        status: data.status,
        notes: data.notes || ''
      });
    }
    writeDevDb(devDb);
    return { ...data, total_hours: hours };
  },

  async deleteAttendanceRecord(id: number): Promise<boolean> {
    if (useMySQL && pool) {
      const [result]: any = await pool.query('DELETE FROM attendance WHERE id = ?', [id]);
      return result.affectedRows > 0;
    }
    const devDb = readDevDb();
    const lenBefore = devDb.attendance.length;
    devDb.attendance = devDb.attendance.filter((a: any) => a.id !== id);
    writeDevDb(devDb);
    return devDb.attendance.length < lenBefore;
  },

  helperCalculateHours(clockIn: string | null, clockOut: string | null): number | null {
    if (!clockIn || !clockOut) return null;
    try {
      const [inH, inM, inS] = clockIn.split(':').map(Number);
      const [outH, outM, outS] = clockOut.split(':').map(Number);
      
      const inSec = inH * 3600 + inM * 60 + (inS || 0);
      const outSec = outH * 3600 + outM * 60 + (outS || 0);
      
      let diffSec = outSec - inSec;
      if (diffSec < 0) {
        // Handles midnight overlapping shifts safely
        diffSec += 24 * 3600;
      }
      return Number((diffSec / 3600).toFixed(2));
    } catch (e) {
      return null;
    }
  },

  // Auth User Helpers
  async getUserByUsername(username: string): Promise<any | null> {
    return run(
      async () => {
        const [rows]: any = await pool!.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
        return rows[0] || null;
      },
      async () => {
        const devDb = readDevDb();
        return devDb.users.find((u: any) => u.username === username || u.email === username) || null;
      }
    );
  },

  async createUser(userData: any): Promise<any> {
    return run(
      async () => {
        const [result]: any = await pool!.query(`
          INSERT INTO users (username, email, password_hash, role, employee_id)
          VALUES (?, ?, ?, ?, ?)
        `, [userData.username, userData.email, userData.password_hash, userData.role || 'Employee', userData.employee_id || null]);
        return { id: result.insertId, ...userData };
      },
      async () => {
        const devDb = readDevDb();
        const newId = devDb.users.reduce((max: number, u: any) => (u.id > max ? u.id : max), 0) + 1;
        const newUser = { id: newId, ...userData };
        devDb.users.push(newUser);
        writeDevDb(devDb);
        return newUser;
      }
    );
  },

  // Task Management Helpers
  async getTasks(): Promise<any[]> {
    return run(
      async () => {
        const [rows]: any = await pool!.query(`
          SELECT t.*, CONCAT(e.first_name, ' ', e.last_name) as creator_name
          FROM tasks t
          LEFT JOIN employees e ON t.created_by = e.id
          ORDER BY t.created_at DESC
        `);
        // For each task, fetch assigned employees
        for (const task of rows) {
          const [assignees]: any = await pool!.query(`
            SELECT e.id, CONCAT(e.first_name, ' ', e.last_name) as full_name, e.job_title as designation
            FROM task_assignments ta
            JOIN employees e ON ta.employee_id = e.id
            WHERE ta.task_id = ?
          `, [task.id]);
          task.assignments = assignees;
        }
        return rows;
      },
      async () => {
        const devDb = readDevDb();
        const tasks = devDb.tasks || [];
        const taskAssignments = devDb.task_assignments || [];
        const employees = devDb.employees || [];

        return tasks.map((t: any) => {
          const creator = employees.find((e: any) => e.id === t.created_by);
          const assignedIds = taskAssignments
            .filter((ta: any) => ta.task_id === t.id)
            .map((ta: any) => ta.employee_id);
          
          const assignments = employees
            .filter((e: any) => assignedIds.includes(e.id))
            .map((e: any) => ({
              id: e.id,
              full_name: `${e.first_name} ${e.last_name}`,
              designation: e.job_title
            }));

          return {
            ...t,
            creator_name: creator ? `${creator.first_name} ${creator.last_name}` : 'System Admin',
            assignments
          };
        });
      }
    );
  },

  async createTask(data: any, assigneeIds: number[] = []): Promise<any> {
    return run(
      async () => {
        const [result]: any = await pool!.query(`
          INSERT INTO tasks (title, description, status, priority, due_date, created_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [data.title, data.description, data.status || 'Todo', data.priority || 'Medium', data.due_date, data.created_by || null]);
        
        const taskId = result.insertId;
        if (assigneeIds && assigneeIds.length > 0) {
          for (const empId of assigneeIds) {
            await pool!.query(`
              INSERT INTO task_assignments (task_id, employee_id) VALUES (?, ?)
            `, [taskId, empId]);
          }
        }
        return { id: taskId, ...data, assignments: assigneeIds };
      },
      async () => {
        const devDb = readDevDb();
        if (!devDb.tasks) devDb.tasks = [];
        if (!devDb.task_assignments) devDb.task_assignments = [];

        const newId = devDb.tasks.reduce((max: number, t: any) => (t.id > max ? t.id : max), 0) + 1;
        const newTask = {
          id: newId,
          title: data.title,
          description: data.description,
          status: data.status || 'Todo',
          priority: data.priority || 'Medium',
          due_date: data.due_date,
          created_by: data.created_by,
          created_at: new Date().toISOString()
        };

        devDb.tasks.push(newTask);

        if (assigneeIds && assigneeIds.length > 0) {
          assigneeIds.forEach((empId: number) => {
            devDb.task_assignments.push({ task_id: newId, employee_id: empId });
          });
        }

        writeDevDb(devDb);
        return { ...newTask, assignments: assigneeIds };
      }
    );
  },

  async updateTaskStatus(id: number, status: string): Promise<boolean> {
    return run(
      async () => {
        const [result]: any = await pool!.query('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);
        return result.affectedRows > 0;
      },
      async () => {
        const devDb = readDevDb();
        if (!devDb.tasks) return false;
        const index = devDb.tasks.findIndex((t: any) => t.id === id);
        if (index !== -1) {
          devDb.tasks[index].status = status;
          writeDevDb(devDb);
          return true;
        }
        return false;
      }
    );
  },

  // Performance Review Helpers
  async getPerformanceReviews(): Promise<any[]> {
    return run(
      async () => {
        const [rows] = await pool!.query(`
          SELECT pr.*, 
                 CONCAT(e.first_name, ' ', e.last_name) as employee_name,
                 e.employee_id as employee_code,
                 e.job_title as designation,
                 CONCAT(rev.first_name, ' ', rev.last_name) as reviewer_name
          FROM performance_reviews pr
          JOIN employees e ON pr.employee_id = e.id
          JOIN employees rev ON pr.reviewer_id = rev.id
          ORDER BY pr.review_date DESC
        `);
        return rows as any[];
      },
      async () => {
        const devDb = readDevDb();
        const reviews = devDb.performance_reviews || [];
        const employees = devDb.employees || [];

        return reviews.map((r: any) => {
          const emp = employees.find((e: any) => e.id === r.employee_id);
          const rev = employees.find((e: any) => e.id === r.reviewer_id);

          return {
            ...r,
            employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
            employee_code: emp ? emp.employee_id : 'Unknown',
            designation: emp ? emp.job_title : 'Unknown',
            reviewer_name: rev ? `${rev.first_name} ${rev.last_name}` : 'Unknown'
          };
        });
      }
    );
  },

  async createPerformanceReview(data: any): Promise<any> {
    return run(
      async () => {
        const [result]: any = await pool!.query(`
          INSERT INTO performance_reviews (employee_id, reviewer_id, review_period, kpi_score, goals_met, feedback, review_date)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [data.employee_id, data.reviewer_id, data.review_period, data.kpi_score, data.goals_met ? 1 : 0, data.feedback, data.review_date]);
        
        // Also update employee's general performance score bucket
        let scoreCategory: string = 'Good';
        const rawScore = Number(data.kpi_score);
        if (rawScore >= 4.5) scoreCategory = 'Excellent';
        else if (rawScore >= 3.5) scoreCategory = 'Good';
        else if (rawScore >= 2.5) scoreCategory = 'Average';
        else scoreCategory = 'Needs Improvement';

        await pool!.query('UPDATE employees SET performance_score = ? WHERE id = ?', [scoreCategory, data.employee_id]);

        return { id: result.insertId, ...data };
      },
      async () => {
        const devDb = readDevDb();
        if (!devDb.performance_reviews) devDb.performance_reviews = [];

        const newId = devDb.performance_reviews.reduce((max: number, r: any) => (r.id > max ? r.id : max), 0) + 1;
        const newReview = {
          id: newId,
          employee_id: Number(data.employee_id),
          reviewer_id: Number(data.reviewer_id),
          review_period: data.review_period,
          kpi_score: Number(data.kpi_score),
          goals_met: data.goals_met ? 1 : 0,
          feedback: data.feedback,
          review_date: data.review_date,
          created_at: new Date().toISOString()
        };

        devDb.performance_reviews.push(newReview);

        // Also update corresponding employee assessment category
        let scoreCategory: string = 'Good';
        const rawScore = Number(data.kpi_score);
        if (rawScore >= 4.5) scoreCategory = 'Excellent';
        else if (rawScore >= 3.5) scoreCategory = 'Good';
        else if (rawScore >= 2.5) scoreCategory = 'Average';
        else scoreCategory = 'Needs Improvement';

        const empIndex = devDb.employees.findIndex((e: any) => e.id === Number(data.employee_id));
        if (empIndex !== -1) {
          devDb.employees[empIndex].performance_score = scoreCategory;
        }

        writeDevDb(devDb);
        return newReview;
      }
    );
  },

  // Notification Alerts
  async getNotifications(userId: number): Promise<any[]> {
    return run(
      async () => {
        const [rows] = await pool!.query(`
          SELECT * FROM notifications 
          WHERE user_id = ? 
          ORDER BY created_at DESC 
          LIMIT 50
        `, [userId]);
        return rows as any[];
      },
      async () => {
        const devDb = readDevDb();
        const list = devDb.notifications || [];
        return list
          .filter((n: any) => n.user_id === userId)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    );
  },

  async createNotification(data: any): Promise<any> {
    return run(
      async () => {
        const [result]: any = await pool!.query(`
          INSERT INTO notifications (user_id, title, message, type, is_read)
          VALUES (?, ?, ?, ?, ?)
        `, [data.user_id, data.title, data.message, data.type || 'Info', 0]);
        return { id: result.insertId, ...data, is_read: 0 };
      },
      async () => {
        const devDb = readDevDb();
        if (!devDb.notifications) devDb.notifications = [];
        const newId = devDb.notifications.reduce((max: number, n: any) => (n.id > max ? n.id : max), 0) + 1;
        const newNotif = {
          id: newId,
          user_id: Number(data.user_id),
          title: data.title,
          message: data.message,
          type: data.type || 'Info',
          is_read: 0,
          created_at: new Date().toISOString()
        };
        devDb.notifications.push(newNotif);
        writeDevDb(devDb);
        return newNotif;
      }
    );
  },

  async markNotificationRead(id: number): Promise<boolean> {
    return run(
      async () => {
        const [result]: any = await pool!.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
        return result.affectedRows > 0;
      },
      async () => {
        const devDb = readDevDb();
        if (!devDb.notifications) return false;
        const index = devDb.notifications.findIndex((n: any) => n.id === id);
        if (index !== -1) {
          devDb.notifications[index].is_read = 1;
          writeDevDb(devDb);
          return true;
        }
        return false;
      }
    );
  }
};
