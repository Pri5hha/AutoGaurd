const AuditLog = require("../models/AuditLog");

const sessionLogger = async (req, res, next) => {
  res.on("finish", () => {
    if (req.path.startsWith("/health")) {
      return;
    }

    // Skip most GET request logging to keep UI endpoints responsive at scale.
    if (req.method === "GET" && process.env.LOG_GET_REQUESTS !== "true") {
      return;
    }

    AuditLog.create({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: `HTTP_${req.method}_${req.path}`,
      details: { statusCode: res.statusCode, query: req.query, bodyKeys: Object.keys(req.body || {}) },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      source: "api"
    }).catch(() => {});
  });

  next();
};

module.exports = { sessionLogger };
