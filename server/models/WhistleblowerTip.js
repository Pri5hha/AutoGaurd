const mongoose = require("mongoose");

const tipSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    department: String,
    contactOptional: String,
    riskHint: { type: String, enum: ["Critical", "High", "Medium", "Low"], default: "Medium" }
  },
  { timestamps: true }
);

module.exports = mongoose.models.WhistleblowerTip || mongoose.model("WhistleblowerTip", tipSchema);
