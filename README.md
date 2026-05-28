# 🚀 Enterprise EMS — Employee Management System

A modern full-stack Employee Management System built using React, Node.js, Express, and MySQL.
This project helps organizations manage employees, attendance, payroll, leaves, departments, tasks, and reports through a clean enterprise dashboard UI.

---

# 📌 Features

## 🔐 Authentication & Authorization

* JWT Authentication
* Secure Login & Logout
* Role-Based Access Control
* Password Hashing using bcrypt

---

## 👨‍💼 Employee Management

* Add Employees
* Edit Employee Details
* Delete Employees
* Search & Filter Employees
* Employee Profile Management

---

## 🏢 Department Management

* Department Creation
* Department Assignment
* Department Analytics

---

## 🕒 Attendance Management

* Employee Check-In / Check-Out
* Daily Attendance Tracking
* Attendance Reports
* Work Hours Calculation

---

## 📝 Leave Management

* Apply Leave
* Approve/Reject Leave
* Leave History Tracking
* Leave Status Management

---

## 💰 Payroll Management

* Salary Calculation
* Bonus & Deductions
* Payslip Generation
* Payroll Reports

---

## 📊 Dashboard & Analytics

* Real-Time Employee Statistics
* Attendance Charts
* Payroll Analytics
* Department Insights

---

## ✅ Task Management

* Assign Tasks
* Update Task Status
* Track Progress
* Deadline Management

---

## 📈 Reports

* Attendance Reports
* Payroll Reports
* Employee Reports
* Export Functionality

---

# 🛠️ Tech Stack

## Frontend

* React.js
* Tailwind CSS
* React Router
* Axios
* Framer Motion
* Recharts

---

## Backend

* Node.js
* Express.js

---

## Database

* MySQL

---

## Authentication

* JWT
* bcrypt

---

# 📂 Project Structure

```bash
enterprise-ems/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   └── database/
│
├── src/
│   ├── context/
│   ├── layouts/
│   ├── pages/
│   ├── App.tsx
│   └── main.tsx
│
├── server.ts
├── package.json
└── README.md
```

---

# ⚙️ Installation & Setup

## 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/enterprise-ems.git
cd enterprise-ems
```

---

## 2️⃣ Install Dependencies

```bash
npm install
```

---

# 🗄️ Database Setup

Create MySQL Database:

```sql
CREATE DATABASE ems_enterprise_db;
```

Import the SQL schema from:

```bash
database/schema.sql
```

---

# 🔑 Environment Variables

Create a `.env` file in the root folder:

```env
GEMINI_API_KEY=your_api_key

JWT_SECRET=EnterYourEnterpriseSecretKey2026

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ems_enterprise_db
DB_PORT=3306
```

---

# ▶️ Run Project Locally

Start development server:

```bash
npm run dev
```

---

# 🌐 Application Modules

| Module         | Description                 |
| -------------- | --------------------------- |
| Authentication | Login & Role Management     |
| Employees      | Employee CRUD Operations    |
| Attendance     | Attendance Tracking         |
| Payroll        | Salary & Payslip Management |
| Leaves         | Leave Approval System       |
| Tasks          | Employee Task Tracking      |
| Reports        | Analytics & Reports         |

---

# 🎨 UI Highlights

* Modern White-Themed Dashboard
* Responsive Enterprise Layout
* Premium SaaS Design
* Interactive Charts
* Smooth Animations
* Clean Typography
* Professional HR Analytics Interface

---

# 🔒 Security Features

* JWT Authentication
* Password Encryption
* Protected Routes
* Role-Based Permissions
* Secure API Handling

---

# 📈 Future Enhancements

* AI HR Assistant
* Face Recognition Attendance
* Email Notifications
* Mobile App Integration
* Cloud Deployment
* Real-Time Chat System

---

# 📸 Screenshots

## Dashboard

<img width="1919" height="862" alt="image" src="https://github.com/user-attachments/assets/5bcce274-239d-4727-8d0f-47521c9ad13a" />


---

## Attendance Module

<img width="1919" height="867" alt="image" src="https://github.com/user-attachments/assets/80bb3ce4-f7bf-4037-bad5-102cfcb1fc23" />


---

## Employee Management

<img width="1919" height="862" alt="image" src="https://github.com/user-attachments/assets/b5b70bf1-7676-44d2-81ef-75351a977500" />


---

# 🚀 Deployment

## Cloud Hosting

* Railway (Frontend + Backend)
* Railway MySQL Database

---

## Deployment Steps

### Build Project

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

---

# 👨‍💻 Author

Developed by **Yathin AG**

---

# 📄 License

This project is created for educational and academic purposes.
