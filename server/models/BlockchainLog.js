const mongoose = require("mongoose");

const blockchainLogSchema = new mongoose.Schema(
  {
    sequence: { type: Number, required: true, unique: true },
    eventType: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    payload: mongoose.Schema.Types.Mixed,
    eventHash: { type: String, required: true },
    previousHash: { type: String, required: true },
    blockHash: { type: String, required: true },
    verified: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("BlockchainLog", blockchainLogSchema);
