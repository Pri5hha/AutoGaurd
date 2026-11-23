const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    hashMd5: { type: String, required: true },
    hashSha256: { type: String, required: true, index: true },
    uploadedAt: { type: Date, default: Date.now },
    metadata: {
      createdAt: Date,
      submittedAtClaimed: Date,
      exifMismatch: { type: Boolean, default: false },
      pixelAnomalyScore: { type: Number, default: 0 }
    },
    verification: {
      digilocker: { type: String, enum: ["unverified", "verified", "failed"], default: "unverified" },
      aadhaar: { type: String, enum: ["unverified", "verified", "failed"], default: "unverified" },
      nad: { type: String, enum: ["unverified", "verified", "failed"], default: "unverified" }
    }
  },
  { _id: false }
);

const anomalySchema = new mongoose.Schema(
  {
    code: String,
    description: String,
    severity: { type: Number, min: 0, max: 100 },
    severityLabel: { type: String, enum: ["Critical", "High", "Medium", "Low"], default: "Low" },
    ruleWeight: { type: Number, default: 0 },
    mlConfidence: { type: Number, default: 0 },
    detectedAt: { type: Date, default: Date.now },
    source: { type: String, enum: ["rule", "ml", "network", "manual"], default: "rule" }
  },
  { _id: false }
);

const applicantSchema = new mongoose.Schema(
  {
    applicantId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    department: { type: String, required: true, index: true },
    state: { type: String, required: true },
    category: { type: String, enum: ["GEN", "SC", "ST", "OBC", "EWS"], required: true },
    quotaClaimed: { type: String, enum: ["NONE", "SC", "ST", "OBC", "EWS"], default: "NONE" },
    gpa: { type: Number, min: 0, max: 10, required: true },
    entranceScore: { type: Number, min: 0, max: 100, required: true },
    rankCurrent: { type: Number, required: true },
    rankPreviousYear: { type: Number },
    referee: String,
    address: String,
    phone: String,
    documents: [documentSchema],
    submission: {
      submittedAt: { type: Date, required: true },
      decisionAt: { type: Date, required: true },
      ipAddress: { type: String, required: true, index: true },
      deviceFingerprint: { type: String, required: true, index: true }
    },
    override: {
      applied: { type: Boolean, default: false },
      reason: { type: String, default: "" },
      officerId: String,
      timestamp: Date
    },
    labels: {
      isGroundTruthAnomaly: { type: Boolean, default: false },
      anomalyTypes: [{ type: String }]
    },
    risk: {
      ruleScore: { type: Number, default: 0 },
      mlScore: { type: Number, default: 0 },
      finalScore: { type: Number, default: 0 },
      compositeScore: { type: Number, default: 0 },
      dimensions: {
        rankIntegrity: { type: Number, default: 0 },
        documentValidity: { type: Number, default: 0 },
        timingPattern: { type: Number, default: 0 },
        quotaCompliance: { type: Number, default: 0 },
        scoreConsistency: { type: Number, default: 0 },
        overrideHistory: { type: Number, default: 0 },
        networkConnections: { type: Number, default: 0 },
        historicalPattern: { type: Number, default: 0 }
      }
    },
    anomalies: [anomalySchema],
    status: { type: String, enum: ["clean", "flagged", "under-review", "resolved"], default: "clean" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Applicant", applicantSchema);
