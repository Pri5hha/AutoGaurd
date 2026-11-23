const Applicant = require("../models/Applicant");
const QueryLog = require("../models/QueryLog");
const { runAuditOnApplicant } = require("./auditEngine");
const { appendBlock } = require("../services/blockchainService");
const { parseNaturalLanguageToMongo } = require("../services/queryParser");
const { ROLES } = require("../config/roles");

const byRoleScope = (user) => {
  if (!user) return { _id: null };

  if ([ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR, ROLES.READ_ONLY].includes(user.role)) {
    return {};
  }

  if (user.role === ROLES.ANALYST) {
    return user.department ? { department: user.department } : {};
  }

  return { _id: null };
};

const listApplicants = async (req, res) => {
  const scope = byRoleScope(req.user);
  const query = { ...scope };

  if (req.query.department) query.department = req.query.department;
  if (req.query.category) query.category = req.query.category;
  if (req.query.status) query.status = req.query.status;

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    Applicant.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Applicant.countDocuments(query)
  ]);

  return res.json({ page, limit, total, rows });
};

const getApplicant = async (req, res) => {
  const applicant = await Applicant.findById(req.params.id).lean();
  if (!applicant) return res.status(404).json({ message: "Applicant not found" });
  return res.json(applicant);
};

const createApplicant = async (req, res) => {
  const applicant = await Applicant.create(req.body);

  await appendBlock({
    eventType: "APPLICANT_CREATED",
    actorId: req.user?.id,
    payload: { applicantId: applicant.applicantId }
  });

  const audited = await runAuditOnApplicant(applicant, req.user?.id);
  return res.status(201).json(audited.applicant);
};

const updateApplicant = async (req, res) => {
  const applicant = await Applicant.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!applicant) return res.status(404).json({ message: "Applicant not found" });

  await appendBlock({
    eventType: "APPLICANT_UPDATED",
    actorId: req.user?.id,
    payload: { applicantId: applicant.applicantId }
  });

  const audited = await runAuditOnApplicant(applicant, req.user?.id);
  return res.json(audited.applicant);
};

const conversationalSearch = async (req, res) => {
  const start = Date.now();
  const { query } = req.body;
  const parsed = parseNaturalLanguageToMongo(query || "");
  const scope = byRoleScope(req.user);
  const mongo = { ...scope, ...parsed.mongo };

  const results = await Applicant.find(mongo).limit(100).lean();
  const latencyMs = Date.now() - start;

  await QueryLog.create({
    userId: req.user?.id,
    userRole: req.user?.role,
    naturalLanguage: query || "",
    generatedQuery: mongo,
    resultCount: results.length,
    latencyMs
  });

  await appendBlock({
    eventType: "CONVERSATIONAL_QUERY",
    actorId: req.user?.id,
    payload: { naturalLanguage: query, generatedQuery: mongo, resultCount: results.length }
  });

  return res.json({
    query,
    generatedQuery: mongo,
    explanation: parsed.explanation,
    resultCount: results.length,
    latencyMs,
    results
  });
};

module.exports = {
  listApplicants,
  getApplicant,
  createApplicant,
  updateApplicant,
  conversationalSearch
};
