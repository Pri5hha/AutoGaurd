const express = require("express");
const { authRequired } = require("../middleware/auth");
const { allowRoles } = require("../middleware/rbac");
const { addDocumentFingerprint, verifyGovernmentBridges } = require("../controllers/documentsController");
const { applicantReport, legalMemo } = require("../controllers/pdfGenerator");
const { ROLES } = require("../config/roles");
const { fingerprintRules, rejectIfInvalid } = require("../middleware/validate");

const router = express.Router();
router.use(authRequired);

router.post("/fingerprint", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR), fingerprintRules, rejectIfInvalid, addDocumentFingerprint);
router.post("/verify/:applicantId", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR), verifyGovernmentBridges);
router.get("/report/:applicantId", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR, ROLES.ANALYST), applicantReport);
router.get("/legal-memo/:applicantId", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR), legalMemo);

module.exports = router;
