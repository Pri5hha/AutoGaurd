const QueryLog = require("../models/QueryLog");

const listQueryLogs = async (req, res) => {
  const logs = await QueryLog.find().sort({ createdAt: -1 }).limit(200).lean();
  return res.json(logs);
};

module.exports = {
  listQueryLogs
};
