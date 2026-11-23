const Applicant = require("../models/Applicant");
const Alert = require("../models/Alert");
const CaseModel = require("../models/Case");
const AuditLog = require("../models/AuditLog");

const dashboardSummary = async (req, res) => {
  const [
    totalApplicants,
    flaggedRecords,
    openCases,
    criticalAlerts,
    cleanRecords,
    recentEvents,
    topRisk,
    categoryBreakdown,
    severityBreakdown
  ] = await Promise.all([
    Applicant.countDocuments(),
    Applicant.countDocuments({ status: "flagged" }),
    CaseModel.countDocuments({ status: { $in: ["Open", "Investigating", "Evidence Gathered", "Verdict Pending"] } }),
    Alert.countDocuments({ severity: "Critical" }),
    Applicant.countDocuments({ status: "clean" }),
    AuditLog.find().sort({ createdAt: -1 }).limit(10).lean(),
    Applicant.find().sort({ "risk.finalScore": -1 }).limit(5).select("applicantId fullName risk department").lean(),
    Applicant.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
    Alert.aggregate([{ $group: { _id: "$severity", count: { $sum: 1 } } }])
  ]);

  const auditCompletionRate = totalApplicants ? Math.round(((cleanRecords + (totalApplicants - flaggedRecords)) / totalApplicants) * 100) : 0;

  return res.json({
    kpis: {
      totalApplicants,
      flaggedRecords,
      openCases,
      criticalAlerts,
      cleanRecords,
      auditCompletionRate
    },
    recentEvents,
    topRiskApplicants: topRisk,
    categoryBreakdown,
    severityBreakdown
  });
};

module.exports = { dashboardSummary };

