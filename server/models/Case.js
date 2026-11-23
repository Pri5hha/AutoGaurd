const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

const evidenceSchema = new mongoose.Schema(
  {
    filename: String,
    url: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    hash: String
  },
  { timestamps: true }
);

const verdictSchema = new mongoose.Schema(
  {
    voter: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    decision: { type: String, enum: ["approve", "reject", "escalate"] },
    note: String
  },
  { timestamps: true }
);

const caseSchema = new mongoose.Schema(
  {
    caseCode: { type: String, required: true, unique: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "Applicant", required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deadline: Date,
    priority: { type: String, enum: ["Critical", "High", "Medium", "Low"], default: "Medium" },
    status: {
      type: String,
      enum: ["Open", "Investigating", "Evidence Gathered", "Verdict Pending", "Resolved", "Escalated"],
      default: "Open"
    },
    comments: [commentSchema],
    evidence: [evidenceSchema],
    verdictVotes: [verdictSchema],
    finalVerdict: {
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      decision: String,
      note: String,
      at: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Case", caseSchema);
