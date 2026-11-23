const mongoose = require("mongoose");

const networkEdgeSchema = new mongoose.Schema(
  {
    fromApplicant: { type: mongoose.Schema.Types.ObjectId, ref: "Applicant", required: true },
    toApplicant: { type: mongoose.Schema.Types.ObjectId, ref: "Applicant", required: true },
    relation: {
      type: String,
      enum: ["same_referee", "same_address", "same_phone", "same_doc_hash", "same_ip", "same_device"],
      required: true
    },
    strength: { type: Number, default: 1 },
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

networkEdgeSchema.index({ fromApplicant: 1, toApplicant: 1, relation: 1 }, { unique: true });

module.exports = mongoose.model("NetworkEdge", networkEdgeSchema);
