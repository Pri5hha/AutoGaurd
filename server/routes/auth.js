const express = require("express");
const { register, login, refresh, logout, me } = require("../controllers/authController");
const { authRequired } = require("../middleware/auth");
const { allowRoles } = require("../middleware/rbac");
const { authLimiter } = require("../middleware/rateLimiter");
const { ROLES } = require("../config/roles");
const { registerRules, loginRules, rejectIfInvalid } = require("../middleware/validate");

const router = express.Router();

router.post("/register", authLimiter, authRequired, allowRoles(ROLES.SYSTEM_ADMIN), registerRules, rejectIfInvalid, register);
router.post("/login", authLimiter, loginRules, rejectIfInvalid, login);
router.post("/refresh", authLimiter, refresh);
router.post("/logout", authRequired, logout);
router.get("/me", authRequired, me);

module.exports = router;
