const express = require("express");
const { authRequired } = require("../middleware/auth");
const { allowRoles } = require("../middleware/rbac");
const { auditApplicantById, auditAllApplicants } = require("../controllers/auditEngine");
const { ROLES } = require("../config/roles");

const router = express.Router();
router.use(authRequired);

router.post("/run-all", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR), auditAllApplicants);
router.post("/applicant/:id", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR), auditApplicantById);

module.exports = router;
