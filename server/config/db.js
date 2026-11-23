const mysql = require('mysql2/promise');
require('dotenv').config();

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

const initDB = async () => {
  // Test connection & initialize tables
  try {
    const connection = await pool.getConnection();

    // 1. Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Relief entries table (Union Council, Own Survey, Partner Org)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS relief_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        source_list VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        age INT NULL,
        village VARCHAR(150) NOT NULL,
        family_members INT DEFAULT 1,
        spouse_name VARCHAR(150) NULL,
        fathers_name VARCHAR(150) NULL,
        notes TEXT NULL,
        raw_entry TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_relief_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Relief decisions table (Ruma's merge/separate/field_check actions)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS relief_decisions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_signature VARCHAR(255) UNIQUE NOT NULL,
        entry_ids TEXT NULL,
        decision_type VARCHAR(50) NOT NULL,
        resolved_name VARCHAR(150) NULL,
        resolved_age INT NULL,
        resolved_village VARCHAR(150) NULL,
        resolved_family_members INT DEFAULT 1,
        resolved_spouse VARCHAR(150) NULL,
        resolved_fathers_name VARCHAR(150) NULL,
        notes TEXT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    connection.release();
    console.log('MySQL Database initialized: "users", "relief_entries", and "relief_decisions" tables are ready.');
  } catch (error) {
    console.warn('MySQL database connection unavailable or not yet configured (' + error.message + '). Server running with resilient fallback.');
  }
};

module.exports = {
  pool,
  initDB,
};
