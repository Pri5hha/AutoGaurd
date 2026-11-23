const { body, validationResult } = require("express-validator");

const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const VERDICT_DECISIONS = ["approve", "reject", "escalate"];
const VALID_ROLES = ["system-admin", "senior-auditor", "auditor", "analyst", "read-only"];
const RISK_HINTS = ["Critical", "High", "Medium", "Low"];
const CATEGORIES = ["GEN", "SC", "ST", "OBC", "EWS"];
const QUOTA_TYPES = ["NONE", "SC", "ST", "OBC", "EWS"];

// ── Auth ───────────────────────────────────────────────────────────────────
const registerRules = [
  body("name").trim().notEmpty().withMessage("name is required").isLength({ max: 120 }),
  body("email").trim().isEmail().withMessage("valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 8 }).withMessage("password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("password must contain an uppercase letter")
    .matches(/[0-9]/).withMessage("password must contain a digit"),
  body("role").optional().isIn(VALID_ROLES).withMessage("invalid role"),
  body("department").optional().trim().isLength({ max: 100 })
];

const loginRules = [
  body("email").trim().isEmail().withMessage("valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("password is required")
];

// ── Cases ──────────────────────────────────────────────────────────────────
const createCaseRules = [
  body("applicantId").trim().notEmpty().withMessage("applicantId is required"),
  body("priority").optional().isIn(PRIORITIES).withMessage("invalid priority"),
  body("deadline")
    .optional({ nullable: true })
    .isISO8601().withMessage("deadline must be a valid ISO 8601 date")
];

const addCommentRules = [
  body("body")
    .trim()
    .notEmpty().withMessage("comment body is required")
    .isLength({ max: 5000 }).withMessage("comment must be under 5000 characters")
];

const voteVerdictRules = [
  body("decision")
    .isIn(VERDICT_DECISIONS)
    .withMessage("decision must be approve, reject, or escalate"),
  body("note").optional().trim().isLength({ max: 2000 })
];

// ── Alerts ─────────────────────────────────────────────────────────────────
const sendCriticalRules = [
  body("alertId")
    .trim()
    .notEmpty().withMessage("alertId is required")
    .isMongoId().withMessage("alertId must be a valid MongoDB ObjectId"),
  body("emailTo")
    .optional({ nullable: true })
    .isEmail().withMessage("emailTo must be a valid email address"),
  body("smsTo")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 }).withMessage("smsTo must be under 20 characters")
];

// ── Whistleblower Tips ─────────────────────────────────────────────────────
const submitTipRules = [
  body("content")
    .trim()
    .notEmpty().withMessage("tip content is required")
    .isLength({ max: 10000 }).withMessage("tip content must be under 10000 characters"),
  body("department").optional().trim().isLength({ max: 100 }),
  body("riskHint").optional().isIn(RISK_HINTS).withMessage("invalid riskHint value"),
  body("contactOptional").optional().trim().isLength({ max: 200 })
];

// ── Documents ──────────────────────────────────────────────────────────────
const fingerprintRules = [
  body("applicantId").trim().notEmpty().withMessage("applicantId is required"),
  body("name")
    .trim()
    .notEmpty().withMessage("document name is required")
    .isLength({ max: 200 }),
  body("type")
    .trim()
    .notEmpty().withMessage("document type is required")
    .isLength({ max: 100 }),
  body("contentBase64")
    .isString().withMessage("contentBase64 must be a string")
    .notEmpty().withMessage("contentBase64 is required"),
  body("claimedDate")
    .optional({ nullable: true })
    .isISO8601().withMessage("claimedDate must be a valid ISO 8601 date")
];

// ── Applicants ─────────────────────────────────────────────────────────────
const createApplicantRules = [
  body("applicantId").trim().notEmpty().withMessage("applicantId is required"),
  body("fullName").trim().notEmpty().withMessage("fullName is required").isLength({ max: 200 }),
  body("department").trim().notEmpty().withMessage("department is required").isLength({ max: 100 }),
  body("state").trim().notEmpty().withMessage("state is required").isLength({ max: 100 }),
  body("category").isIn(CATEGORIES).withMessage(`category must be one of: ${CATEGORIES.join(", ")}`),
  body("quotaClaimed").optional().isIn(QUOTA_TYPES).withMessage("invalid quotaClaimed value"),
  body("gpa").isFloat({ min: 0, max: 10 }).withMessage("gpa must be a number between 0 and 10"),
  body("entranceScore").isFloat({ min: 0, max: 100 }).withMessage("entranceScore must be between 0 and 100"),
  body("rankCurrent").isInt({ min: 1 }).withMessage("rankCurrent must be a positive integer"),
  body("submission.ipAddress").trim().notEmpty().withMessage("submission.ipAddress is required"),
  body("submission.deviceFingerprint").trim().notEmpty().withMessage("submission.deviceFingerprint is required"),
  body("submission.submittedAt").isISO8601().withMessage("submission.submittedAt must be a valid date"),
  body("submission.decisionAt").isISO8601().withMessage("submission.decisionAt must be a valid date")
];

const conversationalSearchRules = [
  body("query")
    .trim()
    .notEmpty().withMessage("query is required")
    .isLength({ max: 1000 }).withMessage("query must be under 1000 characters")
];

// ── Error collector ────────────────────────────────────────────────────────
const rejectIfInvalid = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array({ onlyFirstError: true }) });
  }
  return next();
};

module.exports = {
  registerRules,
  loginRules,
  createCaseRules,
  addCommentRules,
  voteVerdictRules,
  sendCriticalRules,
  submitTipRules,
  fingerprintRules,
  createApplicantRules,
  conversationalSearchRules,
  rejectIfInvalid
};
