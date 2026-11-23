const BlockchainLog = require("../models/BlockchainLog");
const { hashEvent } = require("../utils/hash");

const appendBlock = async ({ eventType, actorId, payload }) => {
  const last = await BlockchainLog.findOne().sort({ sequence: -1 }).lean();
  const sequence = last ? last.sequence + 1 : 1;
  const previousHash = last ? last.blockHash : "GENESIS";

  const eventHash = hashEvent({ eventType, actorId, payload });
  const blockHash = hashEvent({ sequence, eventHash, previousHash, timestamp: new Date().toISOString() });

  const block = await BlockchainLog.create({
    sequence,
    eventType,
    actorId,
    payload,
    eventHash,
    previousHash,
    blockHash,
    verified: true
  });

  return block;
};

const verifyChain = async () => {
  const blocks = await BlockchainLog.find().sort({ sequence: 1 }).lean();
  let prev = "GENESIS";

  const verification = blocks.map((block) => {
    const expectedHash = hashEvent({
      sequence: block.sequence,
      eventHash: block.eventHash,
      previousHash: block.previousHash,
      timestamp: new Date(block.createdAt).toISOString()
    });

    const valid = block.previousHash === prev && expectedHash === block.blockHash;
    prev = block.blockHash;
    return { sequence: block.sequence, valid };
  });

  const ok = verification.every((v) => v.valid);
  if (!ok) {
    const invalidIds = verification.filter((v) => !v.valid).map((v) => v.sequence);
    await BlockchainLog.updateMany({ sequence: { $in: invalidIds } }, { $set: { verified: false } });
  }

  return { ok, verification };
};

module.exports = {
  appendBlock,
  verifyChain
};
