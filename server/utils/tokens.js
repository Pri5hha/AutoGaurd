const jwt = require("jsonwebtoken");

const signAccessToken = (user) => {
  const payload = { id: user._id.toString(), role: user.role, email: user.email };
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_TTL || "15m"
  });
};

const signRefreshToken = (user) => {
  const payload = { id: user._id.toString(), role: user.role };
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_TTL || "7d"
  });
};

module.exports = {
  signAccessToken,
  signRefreshToken
};
