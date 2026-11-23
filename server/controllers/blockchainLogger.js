const BlockchainLog = require("../models/BlockchainLog");
const { appendBlock, verifyChain } = require("../services/blockchainService");

const logEvent = async (req, res) => {
  const block = await appendBlock({
    eventType: req.body.eventType || "MANUAL_EVENT",
    actorId: req.user?.id,
    payload: req.body.payload || {}
  });

  return res.status(201).json(block);
};

const getChain = async (req, res) => {
  const chain = await BlockchainLog.find().sort({ sequence: 1 }).lean();
  return res.json(chain);
};

const verify = async (req, res) => {
  const result = await verifyChain();
  return res.json(result);
};

module.exports = {
  logEvent,
  getChain,
  verify
};
