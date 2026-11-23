const { pool } = require('../config/db');

const User = {
  /**
   * Find a user by their email address
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    if (!email) return null;
    const query = 'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1';
    const [rows] = await pool.query(query, [email.trim()]);
    return rows[0] || null;
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
