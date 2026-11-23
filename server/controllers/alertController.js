const Alert = require("../models/Alert");
const { sendEmail, sendSms } = require("../services/notificationService");

const listAlerts = async (req, res) => {
  const filter = {};
  if (req.query.severity) filter.severity = req.query.severity;

  const alerts = await Alert.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  return res.json(alerts);
};

const markRead = async (req, res) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) return res.status(404).json({ message: "Alert not found" });

  if (!alert.readBy.find((id) => id.toString() === req.user.id)) {
    alert.readBy.push(req.user.id);
    await alert.save();
  }

  return res.json(alert);
};

const markAllRead = async (req, res) => {
  await Alert.updateMany(
    { readBy: { $ne: req.user.id } },
    { $push: { readBy: req.user.id } }
  );
  return res.json({ message: "All alerts marked read" });
};

const sendCritical = async (req, res) => {
  const { alertId, emailTo, smsTo } = req.body;
  const alert = await Alert.findById(alertId);
  if (!alert) return res.status(404).json({ message: "Alert not found" });

  let emailSent = false;
  let smsSent = false;

  if (alert.severity === "Critical") {
    emailSent = await sendEmail({ to: emailTo, subject: alert.title, text: alert.message }).catch(() => false);
    smsSent = await sendSms({ to: smsTo, body: alert.message.slice(0, 150) }).catch(() => false);
  }

  alert.delivered.email = emailSent;
  alert.delivered.sms = smsSent;
  await alert.save();

  return res.json({ emailSent, smsSent });
};

module.exports = {
  listAlerts,
  markRead,
  markAllRead,
  sendCritical
};
