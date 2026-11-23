const axios = require("axios");

const categoryEncoding = {
  GEN: 0,
  EWS: 1,
  OBC: 2,
  SC: 3,
  ST: 4
};

const featureVector = (applicant) => {
  const requiredTypes = new Set((applicant.documents || []).map((d) => d.type));

  return {
    normalized_rank: Math.min(1, Number(applicant.rankCurrent || 0) / 5000),
    normalized_gpa: Math.min(1, Number(applicant.gpa || 0) / 10),
    normalized_entrance_score: Math.min(1, Number(applicant.entranceScore || 0) / 100),
    timing_delta_minutes: Math.max(
      0,
      (new Date(applicant.submission.decisionAt) - new Date(applicant.submission.submittedAt)) / 60000
    ),
    override_flag: applicant.override?.applied ? 1 : 0,
    document_completeness_flag:
      requiredTypes.has("ID_PROOF") && requiredTypes.has("SCORE_CARD") && requiredTypes.has("CERTIFICATE")
        ? 1
        : 0,
    category_encoding: categoryEncoding[applicant.category] ?? 0
  };
};

const predictWithMl = async (applicant) => {
  const mlUrl = process.env.ML_SERVICE_URL || "http://127.0.0.1:5001";

  try {
    const response = await axios.post(`${mlUrl}/predict`, {
      applicantId: applicant.applicantId,
      features: featureVector(applicant)
    });

    return response.data;
  } catch (error) {
    return {
      isolation_score: 0,
      autoencoder_error: 0,
      composite_ml_score: 0,
      fallback: true,
      reason: error.message
    };
  }
};

const predictEndpoint = async (req, res) => {
  try {
    const mlUrl = process.env.ML_SERVICE_URL || "http://127.0.0.1:5001";
    const response = await axios.post(`${mlUrl}/predict`, req.body);
    return res.json(response.data);
  } catch (error) {
    return res.status(502).json({ message: "ML service unavailable", details: error.message });
  }
};

const retrainEndpoint = async (req, res) => {
  try {
    const mlUrl = process.env.ML_SERVICE_URL || "http://127.0.0.1:5001";
    const response = await axios.post(`${mlUrl}/retrain`, req.body || {});
    return res.json(response.data);
  } catch (error) {
    return res.status(502).json({ message: "ML retrain failed", details: error.message });
  }
};

module.exports = {
  predictWithMl,
  predictEndpoint,
  retrainEndpoint,
  featureVector
};
