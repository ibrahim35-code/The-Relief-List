const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool for MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.trim() : '',
  database: process.env.DB_NAME || 'relief_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Initialize MySQL database tables (Users and Relief Requests)
 */
const initDB = async () => {
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createReliefRequestsTableQuery = `
    CREATE TABLE IF NOT EXISTS relief_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      source_type VARCHAR(50) NOT NULL DEFAULT 'Volunteer Survey',
      beneficiary_name VARCHAR(150) NOT NULL,
      age INT NULL,
      family_members INT NULL,
      wife_name VARCHAR(150) NULL,
      address TEXT NOT NULL,
      title VARCHAR(150) NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'Food Supplies',
      urgency VARCHAR(50) NOT NULL DEFAULT 'Medium',
      location VARCHAR(255) NULL,
      contact_number VARCHAR(30) NULL,
      people_affected INT NOT NULL DEFAULT 1,
      description TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'Pending',
      admin_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await pool.query(createUsersTableQuery);
    await pool.query(createReliefRequestsTableQuery);

    // Ensure specific format columns exist on any pre-existing relief_requests tables
    const alterQueries = [
      "ALTER TABLE relief_requests ADD COLUMN source_type VARCHAR(50) NOT NULL DEFAULT 'Volunteer Survey';",
      "ALTER TABLE relief_requests ADD COLUMN beneficiary_name VARCHAR(150) NULL;",
      "ALTER TABLE relief_requests ADD COLUMN age INT NULL;",
      "ALTER TABLE relief_requests ADD COLUMN family_members INT NULL;",
      "ALTER TABLE relief_requests ADD COLUMN wife_name VARCHAR(150) NULL;",
      "ALTER TABLE relief_requests ADD COLUMN address TEXT NULL;",
      "ALTER TABLE relief_requests ADD COLUMN admin_notes TEXT NULL;",
    ];

    for (const q of alterQueries) {
      try {
        await pool.query(q);
      } catch (err) {
        // Silently skip if column already exists
      }
    }

    console.log('MySQL Database initialized: "users" and "relief_requests" tables are ready.');
  } catch (error) {
    console.warn('MySQL Database initialization bypassed (server running in resilient mode):', error.message || error);
  }
};

module.exports = {
  pool,
  initDB,
};
