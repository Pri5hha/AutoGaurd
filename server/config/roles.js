const ROLES = {
  SYSTEM_ADMIN: "system-admin",
  SENIOR_AUDITOR: "senior-auditor",
  AUDITOR: "auditor",
  ANALYST: "analyst",
  READ_ONLY: "read-only"
};

const LEGACY_ROLE_MAP = {
  "super-admin": ROLES.SYSTEM_ADMIN,
  "chief-auditor": ROLES.SENIOR_AUDITOR,
  "field-auditor": ROLES.AUDITOR,
  "department-head": ROLES.ANALYST,
  whistleblower: ROLES.READ_ONLY
};

const normalizeRole = (role) => LEGACY_ROLE_MAP[role] || role;

const ROLE_HIERARCHY = [
  ROLES.SYSTEM_ADMIN,
  ROLES.SENIOR_AUDITOR,
  ROLES.AUDITOR,
  ROLES.ANALYST,
  ROLES.READ_ONLY
];

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  LEGACY_ROLE_MAP,
  normalizeRole
};
