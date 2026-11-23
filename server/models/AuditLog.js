const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorRole: String,
    applicantId: { type: mongoose.Schema.Types.ObjectId, ref: "Applicant" },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case" },
    action: { type: String, required: true },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    source: { type: String, enum: ["api", "socket", "system"], default: "api" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
