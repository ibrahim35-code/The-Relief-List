const { pool } = require('../config/db');

const normalizeSourceType = (src) => {
  if (!src) return 'Volunteer Survey';
  const s = src.toString().toLowerCase().trim();
  if (s === 'union' || s.includes('union')) return 'Union Council';
  if (s === 'survey' || s.includes('survey')) return 'Volunteer Survey';
  if (s === 'partner' || s.includes('partner')) return 'Partner Organization';
  return src;
};

// Resilient in-memory fallback dataset showcasing all 3 intake methods
const DEFAULT_SAMPLE_REQUESTS = [
  {
    id: 1,
    user_id: 1,
    source_type: 'Union Council',
    beneficiary_name: 'Md. Abdul Karim',
    age: 45,
    family_members: null,
    wife_name: null,
    address: 'Char Para, Ward 4',
    title: 'Food Supplies for Md. Abdul Karim',
    category: 'Food Supplies',
    urgency: 'High',
    location: 'Char Para, Ward 4',
    contact_number: '01711000001',
    people_affected: 1,
    description: 'Union Council official register entry #402 (Name, Age, Address format)',
    status: 'Pending',
    admin_notes: 'Verified against Union Council register page 12',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    submitted_by_name: 'System Administrator',
    submitted_by_email: 'admin@relief.org',
  },
  {
    id: 2,
    user_id: 2,
    source_type: 'Volunteer Survey',
    beneficiary_name: 'Abdul Korim Mia',
    age: 47,
    family_members: 5,
    wife_name: null,
    address: 'Charpara (near river bank)',
    title: 'Emergency Aid for Abdul Korim Mia',
    category: 'Food Supplies',
    urgency: 'Critical',
    location: 'Charpara (near river bank)',
    contact_number: '01811000002',
    people_affected: 5,
    description: 'Volunteer ground survey: house submerged, tin roof damaged (Name, Age, Family Members, Address format)',
    status: 'Approved',
    admin_notes: 'Priority household - 5 family members recorded by volunteers',
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    submitted_by_name: 'Field Volunteer',
    submitted_by_email: 'volunteer@relief.org',
  },
  {
    id: 3,
    user_id: 2,
    source_type: 'Partner Organization',
    beneficiary_name: 'A. Karim',
    age: null,
    family_members: null,
    wife_name: 'Rahima',
    address: 'Char Para',
    title: 'Partner Relief for A. Karim',
    category: 'Food Supplies',
    urgency: 'Medium',
    location: 'Char Para',
    contact_number: '01911000003',
    people_affected: 2,
    description: 'Red Crescent partner aid roster listing wife Rahima (Name, Address, Wife Name format)',
    status: 'In Progress',
    admin_notes: 'Cross-checking with Union Council and Survey records',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    submitted_by_name: 'Field Volunteer',
    submitted_by_email: 'volunteer@relief.org',
  },
  {
    id: 4,
    user_id: 1,
    source_type: 'Union Council',
    beneficiary_name: 'Fatema Khatun',
    age: 40,
    family_members: null,
    wife_name: null,
    address: 'Charpara village center',
    title: 'Food Supplies for Fatema Khatun',
    category: 'Food Supplies',
    urgency: 'Medium',
    location: 'Charpara village center',
    contact_number: '01711000004',
    people_affected: 1,
    description: 'Union Council roster record #518',
    status: 'Pending',
    admin_notes: 'Pending distribution confirmation',
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    submitted_by_name: 'System Administrator',
    submitted_by_email: 'admin@relief.org',
  },
  {
    id: 5,
    user_id: 2,
    source_type: 'Partner Organization',
    beneficiary_name: 'Fatema Begum',
    age: null,
    family_members: null,
    wife_name: 'Kashem (Husband)',
    address: 'Char Para, South Side',
    title: 'Partner NGO Aid for Fatema Begum',
    category: 'Food Supplies',
    urgency: 'Medium',
    location: 'Char Para, South Side',
    contact_number: '01911000005',
    people_affected: 2,
    description: 'Partner NGO roster listing spouse Kashem',
    status: 'Pending',
    admin_notes: null,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    submitted_by_name: 'Field Volunteer',
    submitted_by_email: 'volunteer@relief.org',
  },
  {
    id: 6,
    user_id: 2,
    source_type: 'Volunteer Survey',
    beneficiary_name: 'Abdul Karim',
    age: 32,
    family_members: 3,
    wife_name: null,
    address: 'Uttar Para (Farmer household)',
    title: 'Volunteer Survey for Abdul Karim',
    category: 'Food Supplies',
    urgency: 'High',
    location: 'Uttar Para',
    contact_number: '01811000006',
    people_affected: 3,
    description: 'Second Abdul Karim living in Uttar Para (Volunteer survey: 3 members)',
    status: 'Pending',
    admin_notes: 'Different person from Char Para Abdul Karim',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    submitted_by_name: 'Field Volunteer',
    submitted_by_email: 'volunteer@relief.org',
  },
];

const memoryRequests = [...DEFAULT_SAMPLE_REQUESTS];
let nextMemoryId = 100;

const ReliefRequest = {
  /**
   * Create a new relief entry formatted by channel:
   * - Union Council: name, age, address
   * - Volunteer Survey: name, age, total family members, address
   * - Partner: name, address, wife name
   */
  async create({
    userId,
    submittedByName,
    submittedByEmail,
    sourceType = 'Volunteer Survey',
    beneficiaryName,
    age = null,
    familyMembers = null,
    wifeName = null,
    address,
    title = null,
    category = 'Food Supplies',
    urgency = 'Medium',
    location = null,
    contactNumber = null,
    description = '',
  }) {
    const finalSourceType = normalizeSourceType(sourceType);
    const finalTitle = title && title.trim() ? title.trim() : `${category} for ${beneficiaryName.trim()}`;
    const finalLocation = location && location.trim() ? location.trim() : address.trim();
    const finalPeople = familyMembers ? parseInt(familyMembers, 10) : 1;

    // 1. Always create the memory request record
    const newReq = {
      id: nextMemoryId++,
      user_id: userId,
      source_type: finalSourceType,
      beneficiary_name: beneficiaryName.trim(),
      age: age ? parseInt(age, 10) : null,
      family_members: familyMembers ? parseInt(familyMembers, 10) : null,
      wife_name: wifeName ? wifeName.trim() : null,
      address: address.trim(),
      title: finalTitle,
      category,
      urgency,
      location: finalLocation,
      contact_number: contactNumber ? contactNumber.trim() : null,
      people_affected: finalPeople,
      description: description ? description.trim() : '',
      status: 'Pending',
      admin_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      submitted_by_name: submittedByName || (String(userId) === '1' ? 'System Administrator' : 'Field Volunteer'),
      submitted_by_email: submittedByEmail || (String(userId) === '1' ? 'admin@relief.org' : 'volunteer@relief.org'),
    };

    memoryRequests.unshift(newReq);

    // 2. If MySQL is connected, insert into MySQL database
    try {
      const query = `
        INSERT INTO relief_requests 
          (user_id, source_type, beneficiary_name, age, family_members, wife_name, address, title, category, urgency, location, contact_number, people_affected, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
      `;
      const values = [
        userId,
        finalSourceType,
        beneficiaryName.trim(),
        age ? parseInt(age, 10) : null,
        familyMembers ? parseInt(familyMembers, 10) : null,
        wifeName ? wifeName.trim() : null,
        address.trim(),
        finalTitle,
        category,
        urgency,
        finalLocation,
        contactNumber ? contactNumber.trim() : null,
        finalPeople,
        description ? description.trim() : '',
      ];
      const [result] = await pool.query(query, values);
      if (result && result.insertId) {
        newReq.id = result.insertId;
      }
    } catch (e) {
      console.warn('MySQL insert bypassed, stored in resilient memory:', e.message);
    }

    return newReq;
  },

  /**
   * Find a single request by ID with user info
   */
  async findById(id) {
    if (!id) return null;
    const numId = parseInt(id, 10);

    try {
      const query = `
        SELECT 
          r.*,
          COALESCE(u.name, 'Field Volunteer') AS submitted_by_name,
          COALESCE(u.email, 'volunteer@relief.org') AS submitted_by_email
        FROM relief_requests r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
        LIMIT 1
      `;
      const [rows] = await pool.query(query, [numId]);
      if (rows && rows.length > 0) return rows[0];
    } catch (e) {
      // Fallback
    }

    const found = memoryRequests.find(r => String(r.id) === String(id));
    return found || null;
  },

  /**
   * Get all requests created by a specific user (Read-only for regular users)
   * Merges MySQL and memory records to ensure 100% data visibility
   */
  async findByUserId(userId) {
    const memoryUserRequests = memoryRequests.filter(
      r => String(r.user_id) === String(userId)
    );

    try {
      const query = `
        SELECT 
          r.*,
          COALESCE(u.name, 'Field Volunteer') AS submitted_by_name,
          COALESCE(u.email, 'volunteer@relief.org') AS submitted_by_email
        FROM relief_requests r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
      `;
      const [rows] = await pool.query(query, [userId]);
      if (rows && Array.isArray(rows)) {
        const existingIds = new Set(rows.map(r => String(r.id)));
        const combined = [...rows];
        for (const m of memoryUserRequests) {
          if (!existingIds.has(String(m.id))) {
            combined.unshift(m);
          }
        }
        return combined;
      }
    } catch (e) {
      // MySQL unavailable
    }

    return memoryUserRequests;
  },

  /**
   * Get all requests across the system (ADMIN ONLY)
   * Merges MySQL and memory records to guarantee all submitted data appears in Admin Portal
   */
  async findAll({ status, category, urgency, sourceType, search } = {}) {
    let memoryList = [...memoryRequests];

    if (sourceType && sourceType !== 'All') {
      const norm = normalizeSourceType(sourceType);
      memoryList = memoryList.filter(r => 
        r.source_type === norm || 
        r.source_type.toLowerCase().includes(sourceType.toLowerCase())
      );
    }
    if (status && status !== 'All') {
      memoryList = memoryList.filter(r => r.status === status);
    }
    if (category && category !== 'All') {
      memoryList = memoryList.filter(r => r.category === category);
    }
    if (urgency && urgency !== 'All') {
      memoryList = memoryList.filter(r => r.urgency === urgency);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      memoryList = memoryList.filter(r => 
        (r.beneficiary_name && r.beneficiary_name.toLowerCase().includes(q)) ||
        (r.address && r.address.toLowerCase().includes(q)) ||
        (r.wife_name && r.wife_name.toLowerCase().includes(q)) ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.submitted_by_name && r.submitted_by_name.toLowerCase().includes(q)) ||
        (r.source_type && r.source_type.toLowerCase().includes(q))
      );
    }

    try {
      let query = `
        SELECT 
          r.*,
          COALESCE(u.name, 'Field Volunteer') AS submitted_by_name,
          COALESCE(u.email, 'volunteer@relief.org') AS submitted_by_email
        FROM relief_requests r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (sourceType && sourceType !== 'All') {
        const norm = normalizeSourceType(sourceType);
        query += ' AND (r.source_type = ? OR r.source_type LIKE ?)';
        params.push(norm, `%${sourceType}%`);
      }
      if (status && status !== 'All') {
        query += ' AND r.status = ?';
        params.push(status);
      }
      if (category && category !== 'All') {
        query += ' AND r.category = ?';
        params.push(category);
      }
      if (urgency && urgency !== 'All') {
        query += ' AND r.urgency = ?';
        params.push(urgency);
      }
      if (search && search.trim()) {
        query += ' AND (r.beneficiary_name LIKE ? OR r.address LIKE ? OR r.wife_name LIKE ? OR r.title LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR r.source_type LIKE ?)';
        const term = `%${search.trim()}%`;
        params.push(term, term, term, term, term, term, term);
      }

      query += ' ORDER BY r.created_at DESC';
      const [rows] = await pool.query(query, params);
      if (rows && Array.isArray(rows)) {
        const existingIds = new Set(rows.map(r => String(r.id)));
        const combined = [...rows];
        for (const m of memoryList) {
          if (!existingIds.has(String(m.id))) {
            combined.unshift(m);
          }
        }
        return combined;
      }
    } catch (e) {
      // MySQL unavailable
    }

    return memoryList;
  },

  /**
   * Modify request details (ADMIN ONLY)
   */
  async update(id, {
    sourceType,
    beneficiaryName,
    age,
    familyMembers,
    wifeName,
    address,
    title,
    category,
    urgency,
    location,
    contactNumber,
    peopleAffected,
    description,
    status,
    adminNotes,
  }) {
    const finalSourceType = normalizeSourceType(sourceType || 'Volunteer Survey');

    // Update memory copy
    const idx = memoryRequests.findIndex(r => String(r.id) === String(id));
    if (idx !== -1) {
      memoryRequests[idx] = {
        ...memoryRequests[idx],
        source_type: finalSourceType,
        beneficiary_name: beneficiaryName ? beneficiaryName.trim() : memoryRequests[idx].beneficiary_name,
        age: age !== undefined ? (age ? parseInt(age, 10) : null) : memoryRequests[idx].age,
        family_members: familyMembers !== undefined ? (familyMembers ? parseInt(familyMembers, 10) : null) : memoryRequests[idx].family_members,
        wife_name: wifeName !== undefined ? wifeName : memoryRequests[idx].wife_name,
        address: address ? address.trim() : memoryRequests[idx].address,
        title: title || memoryRequests[idx].title,
        category: category || memoryRequests[idx].category,
        urgency: urgency || memoryRequests[idx].urgency,
        location: location || memoryRequests[idx].location,
        contact_number: contactNumber || memoryRequests[idx].contact_number,
        people_affected: familyMembers ? parseInt(familyMembers, 10) : (peopleAffected ? parseInt(peopleAffected, 10) : memoryRequests[idx].people_affected),
        description: description !== undefined ? description : memoryRequests[idx].description,
        status: status || memoryRequests[idx].status,
        admin_notes: adminNotes !== undefined ? adminNotes : memoryRequests[idx].admin_notes,
        updated_at: new Date().toISOString(),
      };
    }

    try {
      const query = `
        UPDATE relief_requests
        SET 
          source_type = ?,
          beneficiary_name = ?,
          age = ?,
          family_members = ?,
          wife_name = ?,
          address = ?,
          title = ?,
          category = ?,
          urgency = ?,
          location = ?,
          contact_number = ?,
          people_affected = ?,
          description = ?,
          status = ?,
          admin_notes = ?
        WHERE id = ?
      `;
      const values = [
        finalSourceType,
        beneficiaryName ? beneficiaryName.trim() : '',
        age ? parseInt(age, 10) : null,
        familyMembers ? parseInt(familyMembers, 10) : null,
        wifeName ? wifeName.trim() : null,
        address ? address.trim() : '',
        title ? title.trim() : '',
        category || 'Food Supplies',
        urgency || 'Medium',
        location ? location.trim() : (address ? address.trim() : ''),
        contactNumber ? contactNumber.trim() : null,
        familyMembers ? parseInt(familyMembers, 10) : (peopleAffected ? parseInt(peopleAffected, 10) : 1),
        description ? description.trim() : '',
        status || 'Pending',
        adminNotes ? adminNotes.trim() : null,
        id,
      ];
      await pool.query(query, values);
    } catch (e) {
      // Memory fallback
    }

    return await this.findById(id);
  },

  /**
   * Modify status and add admin notes (ADMIN ONLY)
   */
  async updateStatus(id, status, adminNotes = null) {
    const idx = memoryRequests.findIndex(r => String(r.id) === String(id));
    if (idx !== -1) {
      memoryRequests[idx].status = status;
      if (adminNotes !== null && adminNotes !== undefined) {
        memoryRequests[idx].admin_notes = adminNotes;
      }
      memoryRequests[idx].updated_at = new Date().toISOString();
    }

    try {
      const query = `
        UPDATE relief_requests
        SET 
          status = ?,
          admin_notes = COALESCE(?, admin_notes)
        WHERE id = ?
      `;
      await pool.query(query, [status, adminNotes, id]);
    } catch (e) {
      // Fallback
    }

    return await this.findById(id);
  },

  /**
   * Delete a relief request (ADMIN ONLY)
   */
  async delete(id) {
    const idx = memoryRequests.findIndex(r => String(r.id) === String(id));
    if (idx !== -1) {
      memoryRequests.splice(idx, 1);
    }

    try {
      const query = 'DELETE FROM relief_requests WHERE id = ?';
      const [result] = await pool.query(query, [id]);
      return result.affectedRows > 0 || idx !== -1;
    } catch (e) {
      return idx !== -1;
    }
  },

  /**
   * Get analytical overview metrics (ADMIN ONLY)
   * Includes breakdowns for the 3 input methods: Union Council, Volunteer Survey, Partner Organization
   */
  async getMetrics() {
    const all = await this.findAll();

    const total = all.length;
    const pending = all.filter(r => r.status === 'Pending').length;
    const active = all.filter(r => ['Approved', 'In Progress', 'Dispatched'].includes(r.status)).length;
    const completed = all.filter(r => r.status === 'Completed').length;
    const critical = all.filter(r => r.urgency === 'Critical').length;
    const people = all.reduce((acc, r) => acc + (r.people_affected || 1), 0);

    const unionCount = all.filter(r => (r.source_type || '').toLowerCase().includes('union')).length;
    const volunteerCount = all.filter(r => (r.source_type || '').toLowerCase().includes('survey')).length;
    const partnerCount = all.filter(r => (r.source_type || '').toLowerCase().includes('partner')).length;

    return {
      total,
      pending,
      active,
      completed,
      critical,
      totalPeopleAffected: people,
      bySource: {
        unionCouncil: unionCount,
        volunteerSurvey: volunteerCount,
        partnerOrganization: partnerCount,
      },
    };
  },
};

module.exports = ReliefRequest;
