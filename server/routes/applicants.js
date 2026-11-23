const express = require("express");
const {
  listApplicants,
  getApplicant,
  createApplicant,
  updateApplicant,
  conversationalSearch
} = require("../controllers/applicantController");
const { authRequired } = require("../middleware/auth");
const { allowRoles } = require("../middleware/rbac");
const { ROLES } = require("../config/roles");
const { createApplicantRules, conversationalSearchRules, rejectIfInvalid } = require("../middleware/validate");

const router = express.Router();
router.use(authRequired);

router.get("/", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR, ROLES.ANALYST, ROLES.READ_ONLY), listApplicants);
router.get("/:id", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR, ROLES.ANALYST, ROLES.READ_ONLY), getApplicant);
router.post("/", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR), createApplicantRules, rejectIfInvalid, createApplicant);
router.patch("/:id", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR), updateApplicant);
router.post("/search/conversational", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR, ROLES.ANALYST), conversationalSearchRules, rejectIfInvalid, conversationalSearch);

module.exports = router;
