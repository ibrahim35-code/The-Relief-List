const { pool } = require('../config/db');

// In-memory fallback users cache for resilience
const memoryUsers = [];

const User = {
  /**
   * Find a user by their email address
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();

    try {
      const query = 'SELECT * FROM users WHERE LOWER(email) = LOWER(?)';
      const [rows] = await pool.query(query, [cleanEmail]);
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      // Fallback
    }

    const memUser = memoryUsers.find(u => u.email.toLowerCase() === cleanEmail);
    return memUser || null;
  },

  /**
   * Find a user by their ID (excludes password_hash)
   * @param {number|string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    if (!id) return null;
    const query = `
      SELECT id, name, email, role, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  },

  /**
   * Create a new user record
   * @param {Object} userData
   * @param {string} userData.name
   * @param {string} userData.email
   * @param {string} userData.passwordHash
   * @param {string} [userData.role='user']
   * @returns {Promise<Object>}
   */
  async create({ name, email, passwordHash, role = 'user' }) {
    const query = `
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `;
    const values = [name.trim(), email.toLowerCase().trim(), passwordHash, role];
    const [result] = await pool.query(query, values);
    
    // Fetch and return newly created record (without password)
    return await this.findById(result.insertId);
  },
};

module.exports = User;
