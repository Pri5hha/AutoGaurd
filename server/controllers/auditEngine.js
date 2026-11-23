const Applicant = require("../models/Applicant");
const CaseModel = require("../models/Case");
const Alert = require("../models/Alert");
const { evaluateApplicantRules } = require("../services/anomalyRules");
const { predictWithMl } = require("./mlBridge");
const { appendBlock } = require("../services/blockchainService");
const { emitAlert } = require("../sockets/notificationHub");

const determineSeverity = (score) => {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
};

const ensureCase = async (applicant, userId, severity) => {
  const existingOpen = await CaseModel.findOne({
    applicant: applicant._id,
    status: { $in: ["Open", "Investigating", "Evidence Gathered", "Verdict Pending"] }
  });

  if (existingOpen) return existingOpen;

  const count = await CaseModel.countDocuments();
  const created = await CaseModel.create({
    caseCode: `CASE-${String(count + 1).padStart(5, "0")}`,
    applicant: applicant._id,
    priority: severity,
    status: "Open",
    assignedTo: userId || null,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  return created;
};

const runAuditOnApplicant = async (applicant, userId) => {
  const rules = await evaluateApplicantRules(applicant, []);
  const ml = await predictWithMl(applicant);

  const mlComposite = Number(ml.composite_ml_score || 0);
  const finalScore = Math.max(0, Math.min(100, Math.round(rules.ruleScore * 0.5 + mlComposite * 0.5)));
  const severity = determineSeverity(finalScore);

  applicant.risk = {
    ...applicant.risk,
    ruleScore: rules.ruleScore,
    mlScore: mlComposite,
    finalScore,
    compositeScore: finalScore,
    dimensions: { ...applicant.risk?.dimensions, ...rules.dimensions }
  };

  const mlAnomaly = {
    code: "ML_COMPOSITE_ANOMALY",
    description: `Isolation=${Number(ml.isolation_score || 0).toFixed(2)}, Autoencoder=${Number(ml.autoencoder_error || 0).toFixed(2)}`,
    severity: Math.round(mlComposite),
    severityLabel: determineSeverity(mlComposite),
    ruleWeight: 0,
    mlConfidence: Math.round(mlComposite),
    source: "ml",
    detectedAt: new Date()
  };

  applicant.anomalies = [...rules.anomalies, mlAnomaly].slice(-50);
  applicant.labels = {
    ...applicant.labels,
    isGroundTruthAnomaly: finalScore >= 40,
    anomalyTypes: rules.anomalyTypes
  };
  applicant.status = finalScore >= 40 ? "flagged" : rules.status;
  await applicant.save();

  let createdCase = null;
  let alert = null;

  if (applicant.status === "flagged") {
    createdCase = await ensureCase(applicant, userId, severity);

    alert = await Alert.create({
      applicantId: applicant._id,
      caseId: createdCase._id,
      title: `Anomaly Detected: ${applicant.applicantId}`,
      message: `Final anomaly score ${finalScore} (${severity}) for ${applicant.fullName}`,
      severity,
      channels: severity === "Critical" ? ["in-app", "email", "sms"] : ["in-app", "email"]
    });

    emitAlert({
      id: alert._id.toString(),
      applicantId: applicant.applicantId,
      caseId: createdCase.caseCode,
      severity,
      title: alert.title,
      message: alert.message
    });
  }

  await appendBlock({
    eventType: "ANOMALY_AUDIT",
    actorId: userId || null,
    payload: {
      applicantId: applicant.applicantId,
      ruleScore: rules.ruleScore,
      mlComposite,
      finalScore,
      flagged: applicant.status === "flagged"
    }
  });

  return { applicant, createdCase, alert, ml };
};

const auditApplicantById = async (req, res) => {
  const applicant = await Applicant.findById(req.params.id);
  if (!applicant) return res.status(404).json({ message: "Applicant not found" });

  const result = await runAuditOnApplicant(applicant, req.user?.id);

  return res.json({
    applicant: result.applicant,
    case: result.createdCase,
    alert: result.alert,
    ml: result.ml
  });
};

const auditAllApplicants = async (req, res) => {
  const applicants = await Applicant.find();
  const results = [];

  for (const applicant of applicants) {
    // eslint-disable-next-line no-await-in-loop
    const out = await runAuditOnApplicant(applicant, req.user?.id);
    results.push({ applicantId: out.applicant.applicantId, score: out.applicant.risk.finalScore });
  }

  return res.json({ count: results.length, results });
};

module.exports = {
  runAuditOnApplicant,
  auditApplicantById,
  auditAllApplicants
};
