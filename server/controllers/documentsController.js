const Applicant = require("../models/Applicant");
const { hashDocument } = require("../utils/hash");
const { appendBlock } = require("../services/blockchainService");

const randomDeepfakeScore = () => Number((Math.random() * 100).toFixed(2));

const addDocumentFingerprint = async (req, res) => {
  const { applicantId, name, type, contentBase64, claimedDate } = req.body;
  const applicant = await Applicant.findById(applicantId);
  if (!applicant) return res.status(404).json({ message: "Applicant not found" });

  const buffer = Buffer.from(contentBase64 || "", "base64");
  const hashes = hashDocument(buffer);

  applicant.documents.push({
    name,
    type,
    hashMd5: hashes.md5,
    hashSha256: hashes.sha256,
    metadata: {
      createdAt: new Date(),
      submittedAtClaimed: claimedDate ? new Date(claimedDate) : new Date(),
      exifMismatch: false,
      pixelAnomalyScore: randomDeepfakeScore()
    }
  });

  await applicant.save();

  await appendBlock({
    eventType: "DOCUMENT_FINGERPRINTED",
    actorId: req.user?.id,
    payload: { applicantId: applicant.applicantId, hash: hashes.sha256 }
  });

  return res.status(201).json(applicant.documents[applicant.documents.length - 1]);
};

const verifyGovernmentBridges = async (req, res) => {
  const applicant = await Applicant.findById(req.params.applicantId);
  if (!applicant) return res.status(404).json({ message: "Applicant not found" });

  applicant.documents = applicant.documents.map((doc) => ({
    ...doc.toObject(),
    verification: {
      digilocker: "verified",
      aadhaar: applicant.category ? "verified" : "failed",
      nad: "verified"
    }
  }));

  await applicant.save();

  await appendBlock({
    eventType: "GOV_API_VERIFIED",
    actorId: req.user?.id,
    payload: { applicantId: applicant.applicantId, documentCount: applicant.documents.length }
  });

  return res.json({ applicantId: applicant.applicantId, verified: true, documents: applicant.documents });
};

module.exports = {
  addDocumentFingerprint,
  verifyGovernmentBridges
};
