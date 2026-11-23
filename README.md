# Relief Management System – Login & Authentication Module

A secure, production-ready, full-stack authentication module for the **Relief Management Web Application**. Built with Node.js, Express, MySQL, React, and Tailwind CSS.

---

## 🌟 Overview & Key Features

- **Role-Based Access Control (RBAC):**
  - **Admin:** Authenticates using seeded or assigned admin credentials, redirected to `/admin/dashboard`.
  - **User:** Self-registers via public signup, automatically assigned the `user` role, redirected to `/user/dashboard`.
- **Bulletproof Security:**
  - Password hashing via **bcryptjs** (salt rounds: 12).
  - Authentication via secure **JWT** stored in `httpOnly`, `sameSite`, and optionally `secure` cookies with fallback to `Authorization: Bearer <token>` header.
  - Strict input validation and sanitization using **express-validator**.
  - Server-side role enforcement (no frontend role data is ever trusted).
  - Protected client routes with navigation guards (`ProtectedRoute` and `RedirectIfAuth`).
  - Session persistence across reloads via `/api/auth/me`.
- **Modern & Responsive UI:**
  - Designed with React and Tailwind CSS.
  - Interactive password strength meter with real-time requirement checklist.
  - Show/hide password toggles.
  - "Remember Me" session persistence (30 days vs 1 day).
  - Modern alerts & toast feedback via `react-hot-toast`.
  - Placeholders for Admin Dashboard and User Dashboard.

---

## 🏗️ Architecture & Project Structure

```
Relief Management System/
├── .env.example                  # Root template for environment variables
├── .gitignore                    # Git ignore file for node_modules, .env, dist, etc.
├── README.md                     # Documentation and setup instructions
│
├── server/                       # Backend (Node.js + Express.js + MySQL)
│   ├── .env                      # Local environment configuration
│   ├── .env.example              # Server environment template
│   ├── index.js                  # Express server entry point & middleware setup
│   ├── package.json              # Server dependencies & scripts (mysql2, bcryptjs, etc.)
│   ├── config/
│   │   └── db.js                 # MySQL connection pool & table schema auto-creation
│   ├── controllers/
│   │   └── authController.js     # Register, Login, Logout, and GetMe controllers
│   ├── middleware/
│   │   ├── auth.js               # JWT verification & session decoding middleware
│   │   └── roleAuth.js           # Role-based authorization middleware (admin/user)
│   ├── models/
│   │   └── User.js               # Parameterized MySQL queries (findByEmail, findById, create)
│   ├── routes/
│   │   └── auth.js               # REST API endpoints (/register, /login, /logout, /me)
│   ├── utils/
│   │   └── seed.js               # Database seeding script for default admin account
│   └── validators/
│       └── authValidator.js      # Input validation & password complexity rules
│
└── client/                       # Frontend (React + Vite + Tailwind CSS)
    ├── index.html                # HTML template with Google Fonts (Inter)
    ├── package.json              # Client dependencies & scripts
    ├── postcss.config.js         # PostCSS configuration for Tailwind
    ├── tailwind.config.js        # Tailwind CSS theme configuration
    ├── vite.config.js            # Vite build configuration with /api reverse proxy
    └── src/
        ├── App.jsx               # Route definitions & toast notification setup
        ├── index.css             # Tailwind CSS directives & background gradients
        ├── main.jsx              # Application bootstrap & BrowserRouter wrapper
        ├── api/
        │   └── axios.js          # Axios client with credentials & 401 interceptor
        ├── components/
        │   ├── LoadingSpinner.jsx # Modern animated loader
        │   ├── ProtectedRoute.jsx # Role-based route guard
        │   └── RedirectIfAuth.jsx # Redirects logged-in users away from login/register
        ├── context/
        │   └── AuthContext.jsx   # Global authentication state, login, register, logout
        └── pages/
            ├── AdminDashboard.jsx # Placeholder admin control panel
            ├── Login.jsx          # Login form with validation & show/hide password
            ├── Register.jsx       # Registration form with live strength meter
            └── UserDashboard.jsx  # Placeholder user relief portal
```

---

## 🧰 Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS v3, React Router v6, Axios, React Hot Toast |
| **Backend** | Node.js, Express.js, cookie-parser, cors, express-validator |
| **Database** | MySQL (with `mysql2/promise`) & MySQL Workbench |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), `httpOnly` Cookies |
| **Security** | `bcryptjs` (12 salt rounds), SQL Parameterized Queries (`?`) |

---

## ⚙️ Prerequisites

1. **Node.js** (v18.x or later) & **npm**
2. **MySQL Server** & **MySQL Workbench** (or XAMPP / WampServer)

---

## 🚀 Setup & Execution Guide

### 1. Database Setup (MySQL Workbench)

1. Open **MySQL Workbench** and connect to your local MySQL connection.
2. In the SQL Editor, execute:
   ```sql
   CREATE DATABASE relief_management;
   ```
*(Note: The server will automatically create the `users` table on startup with proper schema, constraints, and timestamps).*

---

### 2. Backend Setup & Configuration

1. Open a terminal and navigate to `server/`:
   ```bash
   cd server
   ```

2. Configure environment variables in `server/.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173

   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=relief_management

   JWT_SECRET=relief_management_super_secret_jwt_key_2026_change_in_production
   JWT_EXPIRY=7d

   ADMIN_EMAIL=admin@relief.org
   ADMIN_PASSWORD=Admin@123456
   ```
   *(If your MySQL `root` user has no password, leave `DB_PASSWORD=` blank).*

3. Install backend dependencies:
   ```bash
   npm install
   ```

4. Seed the initial Administrator account:
   ```bash
   npm run seed
   ```
   *Output confirmation:*
   ```
   --- Relief Management System: Admin Seeding ---
   MySQL Database initialized: "users" table is ready.
   Admin user successfully created:
   - ID: 1
   - Name: System Administrator
   - Email: admin@relief.org
   - Role: admin
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API will run at **`http://localhost:5000`**.

---

### 3. Frontend Setup & Launch

1. Open a new terminal and navigate to `client/`:
   ```bash
   cd client
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at **`http://localhost:5173`**.

---

## 🔑 Default Credentials

| Role | Email | Password | Dashboard Destination |
|---|---|---|---|
| **Admin** | `admin@relief.org` | `Admin@123456` | `/admin/dashboard` |
| **User** | Register any new account on `/register` | (Self-chosen min 8 characters) | `/user/dashboard` |

---

## 📡 REST API Documentation

### Public Endpoints

#### `POST /api/auth/register`
- **Description:** Registers a new public user. Automatically sets `role: 'user'`.
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Password123!",
    "confirmPassword": "Password123!"
  }
  ```
- **Password Requirements:** Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.
- **Response:** `201 Created` with user object and JWT `token` (also sets `httpOnly` cookie).

#### `POST /api/auth/login`
- **Description:** Verifies credentials and generates session.
- **Request Body:**
  ```json
  {
    "email": "admin@relief.org",
    "password": "Admin@123456",
    "rememberMe": true
  }
  ```
- **Response:** `200 OK` with user details, role, and JWT `token`.

#### `POST /api/auth/logout`
- **Description:** Clears the authentication `httpOnly` cookie.
- **Response:** `200 OK` with `{ "success": true, "message": "Logged out successfully" }`.

---

### Protected Endpoints

#### `GET /api/auth/me`
- **Description:** Validates active session and returns current user details (excludes `password_hash`).
- **Headers:** `Cookie: token=...` or `Authorization: Bearer <token>`
- **Response:** `200 OK` with `{ "success": true, "user": { "id": 1, "name": "...", "email": "...", "role": "admin" } }`.

#### `GET /api/auth/admin/verify`
- **Description:** Admin-only verification route (`auth` + `roleAuth('admin')`).
- **Response:** `200 OK` with `{ "message": "Admin access granted" }` or `403 Forbidden`.

#### `GET /api/auth/user/verify`
- **Description:** User and Admin verification route (`auth` + `roleAuth('user', 'admin')`).
- **Response:** `200 OK` with `{ "message": "User access granted" }` or `403 Forbidden`.
