const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function getVaccineReminderHTML(parentName, childName, vaccines, scheduledDate) {
  const vaccineRows = vaccines.map(v => `
    <tr>
      <td style="padding:10px 15px; border-bottom:1px solid #e8f4fd; font-weight:600; color:#2c5f8a;">${v.vaccine_name}</td>
      <td style="padding:10px 15px; border-bottom:1px solid #e8f4fd; color:#555;">${v.description}</td>
      <td style="padding:10px 15px; border-bottom:1px solid #e8f4fd; text-align:center;">
        <span style="background:#e8f4fd; color:#2c5f8a; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600;">Dose ${v.dose_number}</span>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:#f0f7ff; font-family:'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff; padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(44,95,138,0.12);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #1a6fad 0%, #0d4f8c 100%); padding:35px 40px; text-align:center;">
              <div style="font-size:36px; margin-bottom:8px;">💉</div>
              <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:700; letter-spacing:-0.5px;">Vaccination Reminder</h1>
              <p style="margin:6px 0 0; color:#b8d9f5; font-size:14px;">Pediatric Immunization Management System</p>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background:#fff3cd; border-left:4px solid #ffc107; padding:14px 40px;">
              <p style="margin:0; color:#856404; font-size:14px; font-weight:600;">
                ⏰ &nbsp;Vaccination scheduled in <strong>2 days</strong> — ${scheduledDate}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:35px 40px;">
              <p style="margin:0 0 6px; color:#888; font-size:13px; text-transform:uppercase; letter-spacing:1px; font-weight:600;">Dear Parent,</p>
              <h2 style="margin:0 0 20px; color:#1a2e44; font-size:22px; font-weight:700;">Hello, ${parentName}!</h2>
              
              <p style="color:#555; line-height:1.7; margin:0 0 24px;">
                This is a friendly reminder that <strong style="color:#1a6fad;">${childName}</strong> has upcoming vaccinations scheduled. 
                Keeping your child's immunization up to date is one of the most important things you can do to protect their health.
              </p>

              <!-- Child Info Card -->
              <div style="background:#f0f7ff; border-radius:12px; padding:20px 24px; margin-bottom:28px;">
                <p style="margin:0 0 12px; font-weight:700; color:#1a2e44; font-size:15px;">👶 Child Information</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#777; font-size:13px; padding:4px 0;">Child Name</td>
                    <td style="color:#1a2e44; font-weight:600; font-size:14px; text-align:right;">${childName}</td>
                  </tr>
                  <tr>
                    <td style="color:#777; font-size:13px; padding:4px 0;">Scheduled Date</td>
                    <td style="color:#e63946; font-weight:700; font-size:14px; text-align:right;">${scheduledDate}</td>
                  </tr>
                </table>
              </div>

              <!-- Vaccines Table -->
              <p style="margin:0 0 12px; font-weight:700; color:#1a2e44; font-size:15px;">💉 Vaccines Due</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8f4fd; border-radius:10px; overflow:hidden; margin-bottom:28px;">
                <thead>
                  <tr style="background:#e8f4fd;">
                    <th style="padding:10px 15px; text-align:left; color:#1a6fad; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Vaccine</th>
                    <th style="padding:10px 15px; text-align:left; color:#1a6fad; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Description</th>
                    <th style="padding:10px 15px; text-align:center; color:#1a6fad; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Dose</th>
                  </tr>
                </thead>
                <tbody>
                  ${vaccineRows}
                </tbody>
              </table>

              <!-- Important Note -->
              <div style="background:#fff0f0; border-radius:10px; padding:16px 20px; margin-bottom:24px; border:1px solid #ffd4d4;">
                <p style="margin:0; color:#c0392b; font-size:13px; line-height:1.6;">
                  <strong>📋 Please Note:</strong> Please ensure your child is feeling well before the vaccination. 
                  If your child has a fever or is unwell, contact your healthcare provider to reschedule.
                </p>
              </div>

              <p style="color:#777; font-size:13px; line-height:1.6; margin:0;">
                If you have any questions or need to reschedule, please contact the clinic directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1a2e44; padding:24px 40px; text-align:center;">
              <p style="margin:0 0 6px; color:#b8c8d9; font-size:13px;">Pediatric Immunization Management System</p>
              <p style="margin:0; color:#667; font-size:11px;">This is an automated reminder. Please do not reply to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

async function sendVaccineReminder(parentEmail, parentName, childName, vaccines, scheduledDate) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Pediatric Immunization System" <${process.env.EMAIL_USER}>`,
      to: parentEmail,
      subject: `🔔 Vaccination Reminder: ${childName}'s vaccines are due in 2 days`,
      html: getVaccineReminderHTML(parentName, childName, vaccines, scheduledDate),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Reminder sent to ${parentEmail} for ${childName}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send reminder to ${parentEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function sendWelcomeEmail(parentEmail, parentName, childName) {
  try {
    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background:#f0f7ff; font-family:'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff; padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(44,95,138,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg, #1a6fad 0%, #0d4f8c 100%); padding:35px 40px; text-align:center;">
              <div style="font-size:42px; margin-bottom:8px;">🌟</div>
              <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:700;">Welcome to VaxTrack!</h1>
              <p style="margin:6px 0 0; color:#b8d9f5; font-size:14px;">Pediatric Immunization Management System</p>
            </td>
          </tr>
          <tr>
            <td style="padding:35px 40px;">
              <p style="color:#555; line-height:1.7;">Dear <strong>${parentName}</strong>,</p>
              <p style="color:#555; line-height:1.7;">
                Your child <strong style="color:#1a6fad;">${childName}</strong> has been successfully registered in our Pediatric Immunization Management System.
              </p>
              <p style="color:#555; line-height:1.7;">
                We will automatically send you email reminders <strong>2 days before</strong> each scheduled vaccination. 
                Your child's vaccination schedule has been set up based on their date of birth following the standard immunization guidelines.
              </p>
              <div style="background:#f0f7ff; border-radius:12px; padding:20px; margin:20px 0;">
                <p style="margin:0; color:#1a2e44; font-weight:700; font-size:15px; margin-bottom:10px;">✅ What to expect:</p>
                <ul style="margin:0; padding-left:20px; color:#555; line-height:2;">
                  <li>Automated email reminders 2 days before each vaccine</li>
                  <li>Complete vaccination schedule tracked automatically</li>
                  <li>Safe and secure record management</li>
                </ul>
              </div>
              <p style="color:#777; font-size:13px;">Thank you for trusting us with your child's health journey.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#1a2e44; padding:24px 40px; text-align:center;">
              <p style="margin:0; color:#b8c8d9; font-size:13px;">Pediatric Immunization Management System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Pediatric Immunization System" <${process.env.EMAIL_USER}>`,
      to: parentEmail,
      subject: `Welcome! ${childName}'s vaccination schedule is set up`,
      html,
    });
    console.log(`✅ Welcome email sent to ${parentEmail}`);
  } catch (error) {
    console.error(`❌ Failed to send welcome email:`, error.message);
  }
}

module.exports = { sendVaccineReminder, sendWelcomeEmail };
