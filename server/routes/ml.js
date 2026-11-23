const express = require("express");
const { authRequired } = require("../middleware/auth");
const { allowRoles } = require("../middleware/rbac");
const { predictEndpoint, retrainEndpoint } = require("../controllers/mlBridge");
const { ROLES } = require("../config/roles");

const router = express.Router();
router.use(authRequired);

router.post("/predict", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR, ROLES.AUDITOR), predictEndpoint);
router.post("/retrain", allowRoles(ROLES.SYSTEM_ADMIN, ROLES.SENIOR_AUDITOR), retrainEndpoint);

module.exports = router;
