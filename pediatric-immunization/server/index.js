require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./database');
const routes = require('./routes');
const { startReminderScheduler } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'pediatric_secret',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
}));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api', routes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Initialize DB and start server
initializeDatabase();
startReminderScheduler();

app.listen(PORT, () => {
  console.log(`\n🏥 Pediatric Immunization System running at http://localhost:${PORT}`);
  console.log(`📧 Email: ${process.env.EMAIL_USER}`);
  console.log(`🗄️  Database: ${process.env.DB_PATH || './database.sqlite'}`);
  console.log(`\nDefault Admin: admin@pediatric.com / admin123\n`);
});
