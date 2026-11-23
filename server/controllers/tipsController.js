const WhistleblowerTip = require("../models/WhistleblowerTip");
const Alert = require("../models/Alert");
const { appendBlock } = require("../services/blockchainService");

const submitTip = async (req, res) => {
  const tip = await WhistleblowerTip.create(req.body);

  await Alert.create({
    title: "Whistleblower tip received",
    message: `Anonymous tip submitted for department ${tip.department || "unspecified"}`,
    severity: tip.riskHint,
    channels: ["in-app"]
  });

  await appendBlock({
    eventType: "TIP_SUBMITTED",
    actorId: req.user?.id,
    payload: { tipId: tip._id.toString(), riskHint: tip.riskHint }
  });

  return res.status(201).json({ id: tip._id, createdAt: tip.createdAt });
};

const listTips = async (req, res) => {
  const tips = await WhistleblowerTip.find().sort({ createdAt: -1 }).lean();
  return res.json(tips);
};

module.exports = {
  submitTip,
  listTips
};
