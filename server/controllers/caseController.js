const CaseModel = require("../models/Case");
const Applicant = require("../models/Applicant");
const mongoose = require("mongoose");
const { appendBlock } = require("../services/blockchainService");
const { ROLES } = require("../config/roles");

const normalizeApplicantCode = (value) => {
  const raw = String(value || "").trim();
  if (!/^\d+$/.test(raw)) return null;
  return `AG-2026-${raw.padStart(5, "0")}`;
};

const resolveApplicant = async (ref) => {
  const raw = String(ref || "").trim();
  if (!raw) return null;

  if (mongoose.Types.ObjectId.isValid(raw)) {
    const byId = await Applicant.findById(raw).lean();
    if (byId) return byId;
  }

  const byCode = await Applicant.findOne({ applicantId: raw }).lean();
  if (byCode) return byCode;

  const normalized = normalizeApplicantCode(raw);
  if (!normalized) return null;
  return Applicant.findOne({ applicantId: normalized }).lean();
};

const createCase = async (req, res) => {
  const { applicantId, assignedTo, priority = "Medium", deadline } = req.body;
  const applicant = await resolveApplicant(applicantId);
  if (!applicant) return res.status(404).json({ message: "Applicant not found" });

  const count = await CaseModel.countDocuments();
  const item = await CaseModel.create({
    caseCode: `CASE-${String(count + 1).padStart(5, "0")}`,
    applicant: applicant._id,
    assignedTo: assignedTo || null,
    priority,
    deadline: deadline ? new Date(deadline) : null,
    status: "Open"
  });

  await appendBlock({
    eventType: "CASE_CREATED",
    actorId: req.user.id,
    payload: { caseCode: item.caseCode, applicantId: applicant.applicantId }
  });

  return res.status(201).json(item);
};

const listCases = async (req, res) => {
  const filter = {};
  const includeAll = req.query.all === "1";

  if (req.user.role === ROLES.AUDITOR && !includeAll) {
    filter.$or = [{ assignedTo: req.user.id }, { assignedTo: null }];
  }

  if (req.query.status) filter.status = req.query.status;

  const cases = await CaseModel.find(filter)
    .populate("applicant", "applicantId fullName department risk")
    .populate("assignedTo", "name email role")
    .sort({ createdAt: -1 })
    .lean();

  return res.json(cases);
};

const getCase = async (req, res) => {
  const item = await CaseModel.findById(req.params.id)
    .populate("applicant")
    .populate("assignedTo", "name role")
    .populate("comments.author", "name role")
    .populate("verdictVotes.voter", "name role")
    .lean();

  if (!item) return res.status(404).json({ message: "Case not found" });
  return res.json(item);
};

const assignCase = async (req, res) => {
  const { assignedTo, deadline } = req.body;
  const item = await CaseModel.findByIdAndUpdate(
    req.params.id,
    { $set: { assignedTo, deadline, status: "Investigating" } },
    { new: true }
  );

  if (!item) return res.status(404).json({ message: "Case not found" });

  await appendBlock({
    eventType: "CASE_ASSIGNED",
    actorId: req.user.id,
    payload: { caseCode: item.caseCode, assignedTo }
  });

  return res.json(item);
};

const updateStatus = async (req, res) => {
  const { status } = req.body;
  const item = await CaseModel.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
  if (!item) return res.status(404).json({ message: "Case not found" });

  await appendBlock({
    eventType: "CASE_STATUS_CHANGED",
    actorId: req.user.id,
    payload: { caseCode: item.caseCode, status }
  });

  return res.json(item);
};

const addComment = async (req, res) => {
  const { body, mentions = [] } = req.body;
  const item = await CaseModel.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Case not found" });

  item.comments.push({ author: req.user.id, body, mentions });
  await item.save();

  await appendBlock({
    eventType: "CASE_COMMENT",
    actorId: req.user.id,
    payload: { caseCode: item.caseCode, body }
  });

  return res.json(item.comments[item.comments.length - 1]);
};

const voteVerdict = async (req, res) => {
  const { decision, note } = req.body;
  const item = await CaseModel.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Case not found" });

  item.verdictVotes.push({ voter: req.user.id, decision, note });

  const voteSummary = item.verdictVotes.reduce((acc, v) => {
    acc[v.decision] = (acc[v.decision] || 0) + 1;
    return acc;
  }, {});

  const quorumReached = Object.values(voteSummary).some((count) => count >= 2);

  if (quorumReached) {
    const [winner] = Object.entries(voteSummary).sort((a, b) => b[1] - a[1]);
    item.status = winner[0] === "escalate" ? "Escalated" : "Resolved";
    item.finalVerdict = {
      by: req.user.id,
      decision: winner[0],
      note: `Quorum reached (${winner[1]} votes)` + (note ? ` | ${note}` : ""),
      at: new Date()
    };

    await Applicant.findByIdAndUpdate(item.applicant, {
      $set: { status: item.status === "Escalated" ? "under-review" : "resolved" }
    });
  } else {
    item.status = "Verdict Pending";
  }

  await item.save();

  await appendBlock({
    eventType: "CASE_VOTE",
    actorId: req.user.id,
    payload: { caseCode: item.caseCode, decision }
  });

  return res.json({
    caseId: item._id,
    status: item.status,
    votes: voteSummary,
    finalVerdict: item.finalVerdict || null
  });
};

module.exports = {
  createCase,
  listCases,
  getCase,
  assignCase,
  updateStatus,
  addComment,
  voteVerdict
};
