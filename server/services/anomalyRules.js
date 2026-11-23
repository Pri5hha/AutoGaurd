const Applicant = require("../models/Applicant");

const RESERVED_QUOTAS = ["SC", "ST", "OBC", "EWS"];
const REQUIRED_DOCUMENT_TYPES = ["ID_PROOF", "SCORE_CARD", "CERTIFICATE"];

const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

const severityBand = (points) => {
  if (points >= 40) return "Critical";
  if (points >= 25) return "High";
  if (points >= 12) return "Medium";
  return "Low";
};

const dimensionBoost = (base, points) => clamp(base + points * 2);

const pushAnomaly = (anomalies, code, description, points, source = "rule", mlConfidence = 0) => {
  anomalies.push({
    code,
    description,
    severity: clamp(points * 2.2),
    severityLabel: severityBand(points),
    ruleWeight: points,
    mlConfidence,
    source,
    detectedAt: new Date()
  });
};

const evaluateApplicantRules = async (applicant, existingAnomalies = []) => {
  const anomalies = [...existingAnomalies];
  const dimensions = {
    rankIntegrity: 0,
    documentValidity: 0,
    timingPattern: 0,
    quotaCompliance: 0,
    scoreConsistency: 0,
    overrideHistory: 0,
    networkConnections: applicant.risk?.dimensions?.networkConnections || 0,
    historicalPattern: applicant.risk?.dimensions?.historicalPattern || 0
  };

  let score = 0;
  const anomalyTypes = [];

  if (applicant.rankPreviousYear && applicant.rankCurrent) {
    const change = ((applicant.rankPreviousYear - applicant.rankCurrent) / applicant.rankPreviousYear) * 100;
    if (Math.abs(change) > 30) {
      const points = Math.abs(change) > 70 ? 40 : Math.abs(change) > 50 ? 30 : 20;
      score += points;
      anomalyTypes.push("RANK_JUMP_ANOMALY");
      dimensions.rankIntegrity = dimensionBoost(dimensions.rankIntegrity, points);
      pushAnomaly(anomalies, "RANK_JUMP_ANOMALY", `Rank changed ${change.toFixed(1)}% YoY`, points);
    }
  }

  if (RESERVED_QUOTAS.includes(applicant.quotaClaimed) && applicant.gpa > 9) {
    const points = 25;
    score += points;
    anomalyTypes.push("CATEGORY_MISUSE");
    dimensions.quotaCompliance = dimensionBoost(dimensions.quotaCompliance, points);
    pushAnomaly(anomalies, "CATEGORY_MISUSE", "Reserved quota claim with GPA > 9.0", points);
  }

  if (applicant.override?.applied && !applicant.override?.reason) {
    const points = 45;
    score += points;
    anomalyTypes.push("UNAUTHORIZED_OVERRIDE");
    dimensions.overrideHistory = dimensionBoost(dimensions.overrideHistory, points);
    pushAnomaly(anomalies, "UNAUTHORIZED_OVERRIDE", "Manual override without documented reason", points);
  }

  const submittedAt = new Date(applicant.submission.submittedAt);
  const decisionAt = new Date(applicant.submission.decisionAt);
  const deltaMinutes = Math.max(0, (decisionAt - submittedAt) / (1000 * 60));
  const decisionHour = decisionAt.getHours();

  if (deltaMinutes < 60) {
    const points = 20;
    score += points;
    anomalyTypes.push("TIMING_SPEED_ANOMALY");
    dimensions.timingPattern = dimensionBoost(dimensions.timingPattern, points);
    pushAnomaly(anomalies, "TIMING_SPEED_ANOMALY", `Decision in ${deltaMinutes.toFixed(0)} minutes`, points);
  }

  if (decisionHour < 8 || decisionHour >= 20) {
    const points = 10;
    score += points;
    anomalyTypes.push("TIMING_HOURS_ANOMALY");
    dimensions.timingPattern = dimensionBoost(dimensions.timingPattern, points);
    pushAnomaly(anomalies, "TIMING_HOURS_ANOMALY", `Decision outside window at ${decisionHour}:00`, points);
  }

  const types = new Set((applicant.documents || []).map((d) => d.type));
  const missing = REQUIRED_DOCUMENT_TYPES.filter((type) => !types.has(type));
  if (missing.length) {
    const points = Math.min(20, 10 + (missing.length - 1) * 10);
    score += points;
    anomalyTypes.push("DOCUMENT_INCONSISTENCY");
    dimensions.documentValidity = dimensionBoost(dimensions.documentValidity, points);
    pushAnomaly(anomalies, "DOCUMENT_INCONSISTENCY", `Missing documents: ${missing.join(", ")}`, points);
  }

  const gpaPercent = (applicant.gpa / 10) * 100;
  const discrepancy = Math.abs(gpaPercent - applicant.entranceScore);
  if (discrepancy > 35) {
    const points = discrepancy > 55 ? 20 : 12;
    score += points;
    anomalyTypes.push("GPA_MISMATCH");
    dimensions.scoreConsistency = dimensionBoost(dimensions.scoreConsistency, points);
    pushAnomaly(anomalies, "GPA_MISMATCH", `GPA-score discrepancy ${discrepancy.toFixed(1)}%`, points);
  }

  const hashList = (applicant.documents || []).map((d) => d.hashSha256).filter(Boolean);
  if (hashList.length) {
    const duplicateHash = await Applicant.findOne({
      _id: { $ne: applicant._id },
      "documents.hashSha256": { $in: hashList }
    }).lean();

    if (duplicateHash) {
      const points = 40;
      score += points;
      anomalyTypes.push("DUPLICATE_DOCUMENT_HASH");
      dimensions.documentValidity = dimensionBoost(dimensions.documentValidity, points);
      pushAnomaly(
        anomalies,
        "DUPLICATE_DOCUMENT_HASH",
        `Duplicate document hash also appears in ${duplicateHash.applicantId}`,
        points
      );
    }
  }

  const ipCount = await Applicant.countDocuments({
    _id: { $ne: applicant._id },
    "submission.ipAddress": applicant.submission.ipAddress
  });

  if (ipCount > 0) {
    const points = 15;
    score += points;
    anomalyTypes.push("SHARED_IP_ORIGIN");
    dimensions.networkConnections = dimensionBoost(dimensions.networkConnections, points);
    pushAnomaly(anomalies, "SHARED_IP_ORIGIN", `Shared IP seen across ${ipCount + 1} applications`, points);
  }

  const ruleScore = clamp(score);
  const status = ruleScore >= 40 || anomalies.length ? "flagged" : "clean";

  return {
    ruleScore,
    dimensions,
    anomalies,
    status,
    anomalyTypes
  };
};

module.exports = {
  evaluateApplicantRules
};
