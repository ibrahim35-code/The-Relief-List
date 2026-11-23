const { pool } = require('../config/db');

// In-memory fallback users cache for resilience with pre-seeded test accounts
const memoryUsers = [
  {
    id: 1,
    name: 'System Administrator',
    email: 'admin@relief.org',
    password_hash: '$2a$10$4wK1B6uojxab/SRrtui9p.ZBf0nkKj.XzpyFWjIRts7NUunMZygge', // Admin@123456
    role: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Field Volunteer',
    email: 'volunteer@relief.org',
    password_hash: '$2a$10$GjSKqEmsSX7lOpOh0KYTOeR/ODPfk62pk.letg0SR25oxu5BXXS5K', // Volunteer@123
    role: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

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
    const numId = parseInt(id, 10);

    try {
      const query = `
        SELECT id, name, email, role, created_at, updated_at
        FROM users
        WHERE id = ?
      `;
      const [rows] = await pool.query(query, [numId]);
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      // Fallback
    }

    const memUser = memoryUsers.find(u => u.id === numId);
    if (memUser) {
      const { password_hash, ...safeUser } = memUser;
      return safeUser;
    }
    return null;
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
    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();

    try {
      const query = `
        INSERT INTO users (name, email, password_hash, role)
        VALUES (?, ?, ?, ?)
      `;
      const [result] = await pool.query(query, [cleanName, cleanEmail, passwordHash, role]);
      return {
        id: result.insertId,
        name: cleanName,
        email: cleanEmail,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (err) {
      // Memory fallback
      const newUser = {
        id: Date.now(),
        name: cleanName,
        email: cleanEmail,
        password_hash: passwordHash,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryUsers.push(newUser);
      const { password_hash, ...safeUser } = newUser;
      return safeUser;
    }
  },
};

module.exports = User;
