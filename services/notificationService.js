const { createNotification } = require('../controllers/notificationController');
const { sendEmail } = require('./emailService');

// In-app notification + email (optional)
exports.notifyUser = async (userId, title, message, type = 'info', sendEmailAlso = false, userEmail = null) => {
  // In-app
  await createNotification(userId, title, message, type);

  // Email
  if (sendEmailAlso && userEmail) {
    await sendEmail({
      to: userEmail,
      subject: title,
      html: `<p>${message}</p>`
    });
  }
};