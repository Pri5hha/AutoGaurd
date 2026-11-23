const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    applicantId: { type: mongoose.Schema.Types.ObjectId, ref: "Applicant" },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ["Critical", "High", "Medium", "Low"], required: true },
    channels: [{ type: String, enum: ["in-app", "email", "sms"] }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    delivered: {
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Alert", alertSchema);
