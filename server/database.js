const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './database.sqlite';
const db = new sqlite3.Database(path.resolve(DB_PATH));

function initializeDatabase() {
  db.serialize(() => {
    // Admins table
    db.run(`CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Children table
    db.run(`CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      gender TEXT NOT NULL,
      parent_name TEXT NOT NULL,
      parent_email TEXT NOT NULL,
      admin_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES admins(id)
    )`);

    // Vaccines schedule table
    db.run(`CREATE TABLE IF NOT EXISTS vaccine_schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vaccine_name TEXT NOT NULL,
      age_weeks INTEGER,
      age_months INTEGER,
      age_years INTEGER,
      description TEXT,
      dose_number INTEGER DEFAULT 1
    )`);

    // Immunization records table
    db.run(`CREATE TABLE IF NOT EXISTS immunization_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL,
      vaccine_id INTEGER NOT NULL,
      scheduled_date TEXT NOT NULL,
      administered_date TEXT,
      status TEXT DEFAULT 'scheduled',
      reminder_sent INTEGER DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (child_id) REFERENCES children(id),
      FOREIGN KEY (vaccine_id) REFERENCES vaccine_schedule(id)
    )`);

    // Insert default vaccine schedule (India standard schedule)
    db.get("SELECT COUNT(*) as count FROM vaccine_schedule", (err, row) => {
      if (!err && row.count === 0) {
        const vaccines = [
          // At Birth
          { name: 'BCG', weeks: 0, months: null, years: null, desc: 'Bacille Calmette-Guérin - Tuberculosis protection', dose: 1 },
          { name: 'OPV (Birth Dose)', weeks: 0, months: null, years: null, desc: 'Oral Polio Vaccine - Birth dose', dose: 1 },
          { name: 'Hepatitis B (Birth)', weeks: 0, months: null, years: null, desc: 'Hepatitis B - Birth dose', dose: 1 },

          // 6 weeks
          { name: 'DTwP/DTaP - 1', weeks: 6, months: null, years: null, desc: 'Diphtheria, Tetanus, Pertussis - Dose 1', dose: 1 },
          { name: 'IPV - 1', weeks: 6, months: null, years: null, desc: 'Inactivated Polio Vaccine - Dose 1', dose: 1 },
          { name: 'Hepatitis B - 2', weeks: 6, months: null, years: null, desc: 'Hepatitis B - Dose 2', dose: 2 },
          { name: 'Hib - 1', weeks: 6, months: null, years: null, desc: 'Haemophilus influenzae type b - Dose 1', dose: 1 },
          { name: 'Rotavirus - 1', weeks: 6, months: null, years: null, desc: 'Rotavirus Vaccine - Dose 1', dose: 1 },
          { name: 'PCV - 1', weeks: 6, months: null, years: null, desc: 'Pneumococcal Conjugate Vaccine - Dose 1', dose: 1 },

          // 10 weeks
          { name: 'DTwP/DTaP - 2', weeks: 10, months: null, years: null, desc: 'Diphtheria, Tetanus, Pertussis - Dose 2', dose: 2 },
          { name: 'IPV - 2', weeks: 10, months: null, years: null, desc: 'Inactivated Polio Vaccine - Dose 2', dose: 2 },
          { name: 'Hib - 2', weeks: 10, months: null, years: null, desc: 'Haemophilus influenzae type b - Dose 2', dose: 2 },
          { name: 'Rotavirus - 2', weeks: 10, months: null, years: null, desc: 'Rotavirus Vaccine - Dose 2', dose: 2 },
          { name: 'PCV - 2', weeks: 10, months: null, years: null, desc: 'Pneumococcal Conjugate Vaccine - Dose 2', dose: 2 },

          // 14 weeks
          { name: 'DTwP/DTaP - 3', weeks: 14, months: null, years: null, desc: 'Diphtheria, Tetanus, Pertussis - Dose 3', dose: 3 },
          { name: 'IPV - 3', weeks: 14, months: null, years: null, desc: 'Inactivated Polio Vaccine - Dose 3', dose: 3 },
          { name: 'Hib - 3', weeks: 14, months: null, years: null, desc: 'Haemophilus influenzae type b - Dose 3', dose: 3 },
          { name: 'Rotavirus - 3', weeks: 14, months: null, years: null, desc: 'Rotavirus Vaccine - Dose 3', dose: 3 },
          { name: 'PCV - 3', weeks: 14, months: null, years: null, desc: 'Pneumococcal Conjugate Vaccine - Dose 3', dose: 3 },

          // 6 months
          { name: 'Hepatitis B - 3', weeks: null, months: 6, years: null, desc: 'Hepatitis B - Dose 3', dose: 3 },
          { name: 'OPV - 1', weeks: null, months: 6, years: null, desc: 'Oral Polio Vaccine - Dose 1', dose: 1 },
          { name: 'Influenza - 1', weeks: null, months: 6, years: null, desc: 'Influenza Vaccine - Dose 1', dose: 1 },

          // 9 months
          { name: 'MMR - 1', weeks: null, months: 9, years: null, desc: 'Measles, Mumps, Rubella - Dose 1', dose: 1 },
          { name: 'Typhoid Conjugate', weeks: null, months: 9, years: null, desc: 'Typhoid Conjugate Vaccine', dose: 1 },

          // 12 months
          { name: 'Hepatitis A - 1', weeks: null, months: 12, years: null, desc: 'Hepatitis A - Dose 1', dose: 1 },
          { name: 'Varicella - 1', weeks: null, months: 12, years: null, desc: 'Chickenpox Vaccine - Dose 1', dose: 1 },
          { name: 'PCV Booster', weeks: null, months: 12, years: null, desc: 'Pneumococcal Conjugate Vaccine Booster', dose: 4 },

          // 15 months
          { name: 'MMR - 2', weeks: null, months: 15, years: null, desc: 'Measles, Mumps, Rubella - Dose 2', dose: 2 },

          // 18 months
          { name: 'DTwP/DTaP Booster', weeks: null, months: 18, years: null, desc: 'Diphtheria, Tetanus, Pertussis Booster', dose: 4 },
          { name: 'OPV - 2', weeks: null, months: 18, years: null, desc: 'Oral Polio Vaccine - Dose 2', dose: 2 },
          { name: 'Hib Booster', weeks: null, months: 18, years: null, desc: 'Haemophilus influenzae type b Booster', dose: 4 },
          { name: 'Hepatitis A - 2', weeks: null, months: 18, years: null, desc: 'Hepatitis A - Dose 2', dose: 2 },
          { name: 'Varicella - 2', weeks: null, months: 18, years: null, desc: 'Chickenpox Vaccine - Dose 2', dose: 2 },

          // 2 years
          { name: 'Typhoid Booster', weeks: null, months: 24, years: null, desc: 'Typhoid Vaccine Booster', dose: 2 },

          // 4-6 years
          { name: 'DTwP/DTaP - 2nd Booster', weeks: null, months: null, years: 5, desc: 'Diphtheria, Tetanus, Pertussis - 2nd Booster', dose: 5 },
          { name: 'OPV - 3', weeks: null, months: null, years: 5, desc: 'Oral Polio Vaccine - Dose 3', dose: 3 },
          { name: 'MMR - 3', weeks: null, months: null, years: 5, desc: 'Measles, Mumps, Rubella - Dose 3', dose: 3 },

          // 10-12 years
          { name: 'Tdap/Td', weeks: null, months: null, years: 10, desc: 'Tetanus, Diphtheria, Pertussis Booster', dose: 1 },
          { name: 'HPV - 1', weeks: null, months: null, years: 11, desc: 'Human Papillomavirus - Dose 1', dose: 1 },
          { name: 'HPV - 2', weeks: null, months: null, years: 12, desc: 'Human Papillomavirus - Dose 2', dose: 2 },
        ];

        const stmt = db.prepare(`INSERT INTO vaccine_schedule (vaccine_name, age_weeks, age_months, age_years, description, dose_number) VALUES (?, ?, ?, ?, ?, ?)`);
        vaccines.forEach(v => {
          stmt.run(v.name, v.weeks, v.months, v.years, v.desc, v.dose);
        });
        stmt.finalize();
        console.log('✅ Default vaccine schedule loaded');
      }
    });

    // Create default admin
    db.get("SELECT COUNT(*) as count FROM admins", (err, row) => {
      if (!err && row.count === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run(`INSERT INTO admins (name, email, password) VALUES (?, ?, ?)`,
          ['Administrator', 'admin@pediatric.com', hashedPassword],
          () => console.log('✅ Default admin created: admin@pediatric.com / admin123')
        );
      }
    });
  });

  console.log('✅ Database initialized');
  return db;
}

module.exports = { db, initializeDatabase };
