const nodemailer = require('nodemailer');
const config = require('./config');

let transporter = null;
if (config.emailUser && config.emailAppPassword) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.emailUser, pass: config.emailAppPassword },
  });
}

const isConfigured = !!transporter;

function verificationHtml(email, verifyUrl) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
    <div style="font-size:22px;font-weight:800;letter-spacing:.5px">KaryaFlow</div>
    <h2 style="margin:18px 0 8px">Verify your email</h2>
    <p style="color:#475569;line-height:1.5">Hi ${email}, welcome to KaryaFlow — the secure way to build and run AI workflows. Confirm your address to activate your account.</p>
    <a href="${verifyUrl}" style="display:inline-block;margin:14px 0 18px;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">Verify Email</a>
    <p style="color:#94a3b8;font-size:13px">If the button doesn't work, copy this link into your browser:<br>${verifyUrl}</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0">
    <p style="color:#94a3b8;font-size:12px">KaryaFlow · Secure AI Workflow Platform</p>
  </div>`;
}

async function sendVerificationEmail(email, verifyUrl) {
  if (!transporter) return { sent: false };
  try {
    await transporter.sendMail({
      from: `"${config.emailFromName}" <${config.emailUser}>`,
      to: email,
      subject: 'Verify your KaryaFlow account',
      html: verificationHtml(email, verifyUrl),
    });
    return { sent: true };
  } catch (e) {
    console.error('[mailer] send failed:', e.message);
    return { sent: false, error: e.message };
  }
}

module.exports = { sendVerificationEmail, isConfigured };
