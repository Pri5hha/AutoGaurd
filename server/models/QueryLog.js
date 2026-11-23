const mongoose = require("mongoose");

const queryLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userRole: String,
    naturalLanguage: { type: String, required: true },
    generatedQuery: mongoose.Schema.Types.Mixed,
    resultCount: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("QueryLog", queryLogSchema);
