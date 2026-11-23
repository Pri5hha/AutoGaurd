/**
 * Run once to generate cryptographically strong JWT secrets.
 * Usage: node server/scripts/generate-secrets.js
 *
 * Copy the output into your .env file, then restart the server.
 * Never commit .env to git.
 */
const crypto = require("crypto");

const accessSecret = crypto.randomBytes(64).toString("hex");
const refreshSecret = crypto.randomBytes(64).toString("hex");

console.log("Add these to your server/.env file:\n");
console.log(`JWT_ACCESS_SECRET=${accessSecret}`);
console.log(`JWT_REFRESH_SECRET=${refreshSecret}`);
