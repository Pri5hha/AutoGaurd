const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { signAccessToken, signRefreshToken } = require("../utils/tokens");
const { normalizeRole } = require("../config/roles");

const ACCESS_COOKIE = "ag_access";
const REFRESH_COOKIE = "ag_refresh";

const cookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: maxAgeMs
});

const register = async (req, res) => {
  const { name, email, password, role, department } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: "User already exists" });

  const user = new User({ name, email, role, department, passwordHash: "placeholder" });
  await user.setPassword(password);
  await user.save();

  return res.status(201).json({ id: user._id, email: user.email, role: normalizeRole(user.role) });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await user.validatePassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save();

  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(15 * 60 * 1000));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));

  return res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      department: user.department
    }
  });
};

const refresh = async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
  if (!refreshToken) return res.status(400).json({ message: "refreshToken required" });

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (e) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const user = await User.findById(payload.id);
  if (!user || !user.refreshTokenHash) return res.status(401).json({ message: "Unauthorized" });

  const tokenMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!tokenMatch) return res.status(401).json({ message: "Unauthorized" });

  const accessToken = signAccessToken(user);
  const nextRefresh = signRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(nextRefresh, 10);
  await user.save();

  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(15 * 60 * 1000));
  res.cookie(REFRESH_COOKIE, nextRefresh, cookieOptions(7 * 24 * 60 * 60 * 1000));

  return res.json({ ok: true });
};

const logout = async (req, res) => {
  const token = req.cookies?.[ACCESS_COOKIE] || null;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      await User.findByIdAndUpdate(decoded.id, { $unset: { refreshTokenHash: 1 } });
    } catch (err) {
      // ignore
    }
  }

  res.clearCookie(ACCESS_COOKIE);
  res.clearCookie(REFRESH_COOKIE);
  return res.json({ ok: true });
};

const me = async (req, res) => {
  const user = await User.findById(req.user.id).select("-passwordHash -refreshTokenHash").lean();
  if (!user) return res.status(404).json({ message: "User not found" });

  user.role = normalizeRole(user.role);
  return res.json(user);
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  ACCESS_COOKIE,
  REFRESH_COOKIE
};
