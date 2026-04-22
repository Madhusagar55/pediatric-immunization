const express = require('express');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const { db } = require('./database');
const { sendWelcomeEmail } = require('./emailService');
const { triggerReminderNow } = require('./scheduler');
const router = express.Router();

// Simple token store (in-memory, sufficient for local use)
const tokens = {};

function generateToken() {
  return Math.random().toString(36).substr(2) + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Middleware to check auth via token header
function requireAuth(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (token && tokens[token]) {
    req.admin = tokens[token];
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized. Please login.' });
}

// ==================== AUTH ROUTES ====================

// Register
router.post('/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const hashedPassword = bcrypt.hashSync(password, 10);
  db.run(
    `INSERT INTO admins (name, email, password) VALUES (?, ?, ?)`,
    [name, email.toLowerCase(), hashedPassword],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered' });
        return res.status(500).json({ error: 'Registration failed' });
      }
      const adminId = this.lastID;
      const token = generateToken();
      tokens[token] = { id: adminId, name, email: email.toLowerCase() };
      res.json({ success: true, token, admin: { id: adminId, name, email } });
    }
  );
});

// Login
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  db.get(`SELECT * FROM admins WHERE email = ?`, [email.toLowerCase()], (err, admin) => {
    if (err || !admin) return res.status(401).json({ error: 'Invalid email or password' });
    if (!bcrypt.compareSync(password, admin.password))
      return res.status(401).json({ error: 'Invalid email or password' });

    const token = generateToken();
    tokens[token] = { id: admin.id, name: admin.name, email: admin.email };
    res.json({ success: true, token, admin: { id: admin.id, name: admin.name, email: admin.email } });
  });
});

// Logout
router.post('/auth/logout', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (token) delete tokens[token];
  res.json({ success: true });
});

// Check token
router.get('/auth/me', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (token && tokens[token]) {
    return res.json({ loggedIn: true, admin: tokens[token] });
  }
  res.json({ loggedIn: false });
});

// ==================== CHILD ROUTES ====================

router.get('/children', requireAuth, (req, res) => {
  db.all(
    `SELECT c.*, COUNT(ir.id) as total_vaccines, 
     SUM(CASE WHEN ir.status='administered' THEN 1 ELSE 0 END) as completed_vaccines,
     SUM(CASE WHEN ir.status='scheduled' AND ir.scheduled_date < date('now') THEN 1 ELSE 0 END) as overdue_vaccines,
     SUM(CASE WHEN ir.status='scheduled' AND ir.scheduled_date >= date('now') THEN 1 ELSE 0 END) as upcoming_vaccines
     FROM children c
     LEFT JOIN immunization_records ir ON c.id = ir.child_id
     WHERE c.admin_id = ?
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [req.admin.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post('/children', requireAuth, async (req, res) => {
  const { child_name, date_of_birth, gender, parent_name, parent_email } = req.body;
  if (!child_name || !date_of_birth || !gender || !parent_name || !parent_email)
    return res.status(400).json({ error: 'All fields are required' });

  const dob = moment(date_of_birth);
  if (!dob.isValid()) return res.status(400).json({ error: 'Invalid date of birth' });

  db.run(
    `INSERT INTO children (child_name, date_of_birth, gender, parent_name, parent_email, admin_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [child_name, date_of_birth, gender, parent_name, parent_email.toLowerCase(), req.admin.id],
    async function (err) {
      if (err) return res.status(500).json({ error: 'Failed to add child' });
      const childId = this.lastID;
      await scheduleVaccinesForChild(childId, dob);
      sendWelcomeEmail(parent_email, parent_name, child_name).catch(console.error);
      res.json({ success: true, message: 'Child registered and vaccination schedule created', childId });
    }
  );
});

router.get('/children/:id', requireAuth, (req, res) => {
  db.get(`SELECT * FROM children WHERE id = ? AND admin_id = ?`, [req.params.id, req.admin.id], (err, child) => {
    if (err || !child) return res.status(404).json({ error: 'Child not found' });
    db.all(
      `SELECT ir.*, vs.vaccine_name, vs.description, vs.dose_number, vs.age_weeks, vs.age_months, vs.age_years
       FROM immunization_records ir
       JOIN vaccine_schedule vs ON ir.vaccine_id = vs.id
       WHERE ir.child_id = ?
       ORDER BY ir.scheduled_date ASC`,
      [child.id],
      (err2, records) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ child, records });
      }
    );
  });
});

router.put('/records/:id', requireAuth, (req, res) => {
  const { status, administered_date, notes } = req.body;
  db.run(
    `UPDATE immunization_records SET status = ?, administered_date = ?, notes = ? WHERE id = ?`,
    [status, administered_date || null, notes || null, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

router.delete('/children/:id', requireAuth, (req, res) => {
  db.get(`SELECT id FROM children WHERE id = ? AND admin_id = ?`, [req.params.id, req.admin.id], (err, child) => {
    if (err || !child) return res.status(404).json({ error: 'Child not found' });
    db.run(`DELETE FROM immunization_records WHERE child_id = ?`, [req.params.id]);
    db.run(`DELETE FROM children WHERE id = ?`, [req.params.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true });
    });
  });
});

router.get('/dashboard/stats', requireAuth, (req, res) => {
  const adminId = req.admin.id;
  db.get(`SELECT COUNT(*) as total FROM children WHERE admin_id = ?`, [adminId], (err, childCount) => {
    db.get(
      `SELECT 
         COUNT(*) as total_scheduled,
         SUM(CASE WHEN ir.status='administered' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN ir.status='scheduled' AND ir.scheduled_date < date('now') THEN 1 ELSE 0 END) as overdue,
         SUM(CASE WHEN ir.status='scheduled' AND ir.scheduled_date >= date('now') AND ir.scheduled_date <= date('now', '+7 days') THEN 1 ELSE 0 END) as this_week
       FROM immunization_records ir
       JOIN children c ON ir.child_id = c.id
       WHERE c.admin_id = ?`,
      [adminId],
      (err2, stats) => {
        res.json({
          totalChildren: childCount?.total || 0,
          totalScheduled: stats?.total_scheduled || 0,
          completed: stats?.completed || 0,
          overdue: stats?.overdue || 0,
          thisWeek: stats?.this_week || 0,
        });
      }
    );
  });
});

router.get('/dashboard/upcoming', requireAuth, (req, res) => {
  db.all(
    `SELECT ir.scheduled_date, ir.status, ir.reminder_sent,
            c.child_name, c.parent_name, c.parent_email,
            vs.vaccine_name, vs.dose_number
     FROM immunization_records ir
     JOIN children c ON ir.child_id = c.id
     JOIN vaccine_schedule vs ON ir.vaccine_id = vs.id
     WHERE c.admin_id = ?
     AND ir.status = 'scheduled'
     AND ir.scheduled_date >= date('now')
     AND ir.scheduled_date <= date('now', '+30 days')
     ORDER BY ir.scheduled_date ASC
     LIMIT 50`,
    [req.admin.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post('/reminders/trigger', requireAuth, async (req, res) => {
  const result = await triggerReminderNow();
  res.json(result);
});

// ==================== HELPER ====================

function scheduleVaccinesForChild(childId, dob) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM vaccine_schedule`, [], (err, vaccines) => {
      if (err) return reject(err);
      const records = vaccines.map(v => {
        let scheduledDate;
        if (v.age_weeks !== null) scheduledDate = dob.clone().add(v.age_weeks, 'weeks').format('YYYY-MM-DD');
        else if (v.age_months !== null) scheduledDate = dob.clone().add(v.age_months, 'months').format('YYYY-MM-DD');
        else if (v.age_years !== null) scheduledDate = dob.clone().add(v.age_years, 'years').format('YYYY-MM-DD');
        else scheduledDate = dob.clone().format('YYYY-MM-DD');
        return [childId, v.id, scheduledDate, 'scheduled', 0];
      });
      const stmt = db.prepare(`INSERT INTO immunization_records (child_id, vaccine_id, scheduled_date, status, reminder_sent) VALUES (?, ?, ?, ?, ?)`);
      records.forEach(r => stmt.run(r));
      stmt.finalize(resolve);
    });
  });
}

module.exports = router;
