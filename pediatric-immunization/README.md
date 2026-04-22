# 💉 VaxTrack — Pediatric Immunization Management System

A full-stack smart immunization management system for pediatric vaccine scheduling with automated email reminders.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Email (Gmail)
Edit the `.env` file:
```
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password
```

#### How to get Gmail App Password:
1. Go to [Google Account](https://myaccount.google.com/)
2. Security → 2-Step Verification → Turn on
3. Security → App passwords
4. Select "Mail" → Generate
5. Copy the 16-character password → paste into `.env`

### 3. Start the Server
```bash
node server/index.js
```
Or with auto-restart on changes:
```bash
npx nodemon server/index.js
```

### 4. Open in Browser
```
http://localhost:3000
```

---

## 🔑 Default Admin Login
```
Email:    admin@pediatric.com
Password: admin123
```

You can also create your own admin account from the Sign In page.

---

## ✨ Features

### Admin Dashboard
- 📊 Live stats: total children, vaccines due this week, completed, overdue
- 📅 Upcoming vaccination calendar (next 30 days)
- 👶 Recently registered children overview

### Child Management
- ➕ Register children with: name, date of birth, gender, parent name, parent email
- 🗓️ Auto-generates full vaccination schedule based on DOB
- 📈 Track vaccination progress per child
- ✅ Mark vaccines as administered
- 🗑️ Delete child records

### Vaccination Schedule
- Follows standard Indian pediatric immunization schedule
- 42 vaccines from birth to 12 years
- Covers: BCG, OPV, DTwP, IPV, Hepatitis B/A, Hib, Rotavirus, PCV, MMR, Typhoid, Varicella, HPV, and more

### Automated Email Reminders
- 📧 Welcome email sent when child is registered
- 🔔 Reminder email sent **2 days before** each scheduled vaccine
- Reminders run automatically every day at **8:00 AM**
- Grouped by child (one email per child per day, listing all due vaccines)
- Beautiful HTML email template

### Manual Reminder Trigger
Click **"Send Reminders Now"** in the sidebar to manually run the reminder check (useful for testing).

---

## 📁 Project Structure

```
pediatric-immunization/
├── server/
│   ├── index.js          # Express server entry point
│   ├── database.js       # SQLite setup & vaccine schedule
│   ├── routes.js         # API endpoints
│   ├── emailService.js   # Nodemailer email functions
│   └── scheduler.js      # node-cron reminder scheduler
├── public/
│   └── index.html        # Full SPA frontend
├── .env                  # Your credentials (DO NOT COMMIT)
├── .env.example          # Template for credentials
└── package.json
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create admin account |
| POST | /api/auth/login | Admin login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Check session |
| GET | /api/children | List all children |
| POST | /api/children | Register new child |
| GET | /api/children/:id | Get child + vaccination records |
| DELETE | /api/children/:id | Delete child |
| PUT | /api/records/:id | Update vaccine status |
| GET | /api/dashboard/stats | Dashboard statistics |
| GET | /api/dashboard/upcoming | Upcoming vaccines (30 days) |
| POST | /api/reminders/trigger | Manually trigger reminders |

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Email**: Nodemailer (Gmail)
- **Scheduling**: node-cron
- **Frontend**: Vanilla HTML/CSS/JS (SPA)
- **Authentication**: Express sessions + bcrypt

---

## 📋 Vaccine Schedule Included

| Age | Vaccines |
|-----|----------|
| Birth | BCG, OPV, Hepatitis B |
| 6 weeks | DTwP/DTaP-1, IPV-1, Hep B-2, Hib-1, Rotavirus-1, PCV-1 |
| 10 weeks | DTwP/DTaP-2, IPV-2, Hib-2, Rotavirus-2, PCV-2 |
| 14 weeks | DTwP/DTaP-3, IPV-3, Hib-3, Rotavirus-3, PCV-3 |
| 6 months | Hepatitis B-3, OPV-1, Influenza |
| 9 months | MMR-1, Typhoid |
| 12 months | Hepatitis A-1, Varicella-1, PCV Booster |
| 15 months | MMR-2 |
| 18 months | DTwP Booster, OPV-2, Hib Booster, Hep A-2, Varicella-2 |
| 2 years | Typhoid Booster |
| 5 years | DTwP 2nd Booster, OPV-3, MMR-3 |
| 10-12 years | Tdap, HPV-1, HPV-2 |

---

## 🔧 Troubleshooting

**Email not sending?**
- Make sure Gmail 2-Step Verification is ON
- Use App Password (not your Gmail password)
- Check `EMAIL_USER` and `EMAIL_PASS` in `.env`
- Some antivirus/firewall may block SMTP — try disabling temporarily

**Port already in use?**
- Change `PORT=3001` in `.env`

**Database issues?**
- Delete `database.sqlite` and restart — it will be recreated fresh
