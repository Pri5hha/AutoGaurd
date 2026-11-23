const express = require("express");
const { authRequired } = require("../middleware/auth");
const { allowRoles } = require("../middleware/rbac");
const { listAlerts, markRead, markAllRead, sendCritical } = require("../controllers/alertController");
const { ROLES } = require("../config/roles");
const { sendCriticalRules, rejectIfInvalid } = require("../middleware/validate");

const router = express.Router();
router.use(authRequired);

router.get("/", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR, ROLES.ANALYST, ROLES.READ_ONLY), listAlerts);
router.patch("/:id/read", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR, ROLES.ANALYST), markRead);
router.patch("/mark-all-read", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR, ROLES.ANALYST), markAllRead);
router.post("/send-critical", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR), sendCriticalRules, rejectIfInvalid, sendCritical);

module.exports = router;
