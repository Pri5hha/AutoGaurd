const express = require("express");
const { optionalAuth, authRequired } = require("../middleware/auth");
const { allowRoles } = require("../middleware/rbac");
const { submitTip, listTips } = require("../controllers/tipsController");
const { ROLES } = require("../config/roles");
const { submitTipRules, rejectIfInvalid } = require("../middleware/validate");

const router = express.Router();

router.post("/", optionalAuth, submitTipRules, rejectIfInvalid, submitTip);
router.get("/", authRequired, allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR), listTips);

module.exports = router;
