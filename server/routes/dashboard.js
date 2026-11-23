const express = require("express");
const { authRequired } = require("../middleware/auth");
const { allowRoles } = require("../middleware/rbac");
const { dashboardSummary } = require("../controllers/dashboardController");
const { buildNetwork, getNetworkGraph } = require("../controllers/networkAnalysis");
const { getChain, verify } = require("../controllers/blockchainLogger");
const { ROLES } = require("../config/roles");

const router = express.Router();
router.use(authRequired);

router.get("/summary", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR, ROLES.ANALYST, ROLES.READ_ONLY), dashboardSummary);
router.post("/network/rebuild", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR), buildNetwork);
router.get("/network", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR, ROLES.ANALYST, ROLES.READ_ONLY), getNetworkGraph);
router.get("/blockchain", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.ANALYST, ROLES.READ_ONLY), getChain);
router.get("/blockchain/verify", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.ANALYST, ROLES.READ_ONLY), verify);

module.exports = router;
