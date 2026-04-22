const cron = require('node-cron');
const moment = require('moment');
const { db } = require('./database');
const { sendVaccineReminder } = require('./emailService');

function startReminderScheduler() {
  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('🔔 Running daily vaccine reminder check...');
    await checkAndSendReminders();
  });

  // Also run once at startup (after 5 seconds) for testing
  setTimeout(async () => {
    console.log('🔔 Running initial reminder check...');
    await checkAndSendReminders();
  }, 5000);

  console.log('✅ Reminder scheduler started (runs daily at 8:00 AM)');
}

async function checkAndSendReminders() {
  const twoDaysFromNow = moment().add(2, 'days').format('YYYY-MM-DD');
  
  const query = `
    SELECT 
      ir.id as record_id,
      ir.scheduled_date,
      ir.reminder_sent,
      c.child_name,
      c.parent_name,
      c.parent_email,
      vs.vaccine_name,
      vs.description,
      vs.dose_number
    FROM immunization_records ir
    JOIN children c ON ir.child_id = c.id
    JOIN vaccine_schedule vs ON ir.vaccine_id = vs.id
    WHERE ir.scheduled_date = ?
    AND ir.status = 'scheduled'
    AND ir.reminder_sent = 0
    ORDER BY c.parent_email, c.child_name
  `;

  db.all(query, [twoDaysFromNow], async (err, records) => {
    if (err) {
      console.error('❌ Error fetching reminders:', err.message);
      return;
    }

    if (!records || records.length === 0) {
      console.log(`ℹ️ No reminders to send for ${twoDaysFromNow}`);
      return;
    }

    // Group by parent email + child
    const grouped = {};
    records.forEach(r => {
      const key = `${r.parent_email}_${r.child_name}`;
      if (!grouped[key]) {
        grouped[key] = {
          parentEmail: r.parent_email,
          parentName: r.parent_name,
          childName: r.child_name,
          scheduledDate: moment(r.scheduled_date).format('DD MMMM YYYY'),
          vaccines: [],
          recordIds: [],
        };
      }
      grouped[key].vaccines.push({
        vaccine_name: r.vaccine_name,
        description: r.description,
        dose_number: r.dose_number,
      });
      grouped[key].recordIds.push(r.record_id);
    });

    // Send grouped reminders
    for (const key of Object.keys(grouped)) {
      const group = grouped[key];
      const result = await sendVaccineReminder(
        group.parentEmail,
        group.parentName,
        group.childName,
        group.vaccines,
        group.scheduledDate
      );

      if (result.success) {
        // Mark reminders as sent
        const placeholders = group.recordIds.map(() => '?').join(',');
        db.run(
          `UPDATE immunization_records SET reminder_sent = 1 WHERE id IN (${placeholders})`,
          group.recordIds,
          (err) => {
            if (err) console.error('❌ Error marking reminders as sent:', err.message);
            else console.log(`✅ Marked ${group.recordIds.length} reminders as sent for ${group.childName}`);
          }
        );
      }
    }
  });
}

// Manual trigger for testing
async function triggerReminderNow() {
  await checkAndSendReminders();
  return { message: 'Reminder check completed' };
}

module.exports = { startReminderScheduler, triggerReminderNow };
