const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ACCESS_COOKIE } = require("../controllers/authController");
const { normalizeRole } = require("../config/roles");

const readToken = (req) => {
  const cookieToken = req.cookies?.[ACCESS_COOKIE];
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);

  return null;
};

const authRequired = async (req, res, next) => {
  try {
    const token = readToken(req);

    if (!token) {
      return res.status(401).json({ message: "Missing access token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id).lean();

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = {
      id: user._id.toString(),
      role: normalizeRole(user.role),
      email: user.email,
      department: user.department
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = readToken(req);
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return next();
  }
};

module.exports = {
  authRequired,
  optionalAuth
};
