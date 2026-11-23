const nodemailer = require("nodemailer");
const twilio = require("twilio");

let transporter;
let twilioClient;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter;
};

const getTwilio = () => {
  if (twilioClient) return twilioClient;
  if (!process.env.TWILIO_SID || !process.env.TWILIO_TOKEN) return null;
  twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  return twilioClient;
};

const sendEmail = async ({ to, subject, text }) => {
  const tx = getTransporter();
  if (!tx || !to) return false;

  await tx.sendMail({
    from: process.env.ALERT_FROM || "no-reply@autoguard.local",
    to,
    subject,
    text
  });

  return true;
};

const sendSms = async ({ to, body }) => {
  const client = getTwilio();
  if (!client || !to || !process.env.TWILIO_FROM) return false;

  await client.messages.create({
    from: process.env.TWILIO_FROM,
    to,
    body
  });

  return true;
};

module.exports = {
  sendEmail,
  sendSms
};

