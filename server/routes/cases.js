const express = require("express");
const { authRequired } = require("../middleware/auth");
const { allowRoles } = require("../middleware/rbac");
const {
  createCase,
  listCases,
  getCase,
  assignCase,
  updateStatus,
  addComment,
  voteVerdict
} = require("../controllers/caseController");
const { ROLES } = require("../config/roles");
const { createCaseRules, addCommentRules, voteVerdictRules, rejectIfInvalid } = require("../middleware/validate");

const router = express.Router();
router.use(authRequired);

router.post("/", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR), createCaseRules, rejectIfInvalid, createCase);
router.get("/", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR, ROLES.ANALYST, ROLES.READ_ONLY), listCases);
router.get("/:id", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR, ROLES.ANALYST, ROLES.READ_ONLY), getCase);
router.patch("/:id/assign", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR), assignCase);
router.patch("/:id/status", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR), updateStatus);
router.post("/:id/comments", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR), addCommentRules, rejectIfInvalid, addComment);
router.post("/:id/votes", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR), voteVerdictRules, rejectIfInvalid, voteVerdict);

module.exports = router;
