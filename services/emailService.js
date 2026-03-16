const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

exports.sendEmail = async ({ to, subject, html, from = process.env.FROM_EMAIL }) => {
  const mailOptions = {
    from,
    to,
    subject,
    html
  };

  return transporter.sendMail(mailOptions);
};

exports.sendWelcomeEmail = async (user) => {
  const html = `<h1>Welcome to MyApartment</h1><p>Hi ${user.name}, thank you for joining!</p>`;
  return exports.sendEmail({
    to: user.email,
    subject: 'Welcome to MyApartment',
    html
  });
};