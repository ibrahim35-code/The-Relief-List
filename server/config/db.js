const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool for MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'relief_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Initialize MySQL database table
 */
const initDB = async () => {
  const createTableQuery = `
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

  try {
    await pool.query(createTableQuery);
    console.log('MySQL Database initialized: "users" table is ready.');
  } catch (error) {
    console.error('Failed to initialize MySQL database tables:', error.message || error);
    throw error;
  }
};

module.exports = {
  pool,
  initDB,
};
