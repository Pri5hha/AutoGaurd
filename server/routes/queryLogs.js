const express = require("express");
const { authRequired } = require("../middleware/auth");
const { allowRoles } = require("../middleware/rbac");
const { ROLES } = require("../config/roles");
const { listQueryLogs } = require("../controllers/queryLogController");

const router = express.Router();

router.use(authRequired);
router.get("/", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.ANALYST), listQueryLogs);

module.exports = router;
