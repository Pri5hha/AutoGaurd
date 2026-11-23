const crypto = require("crypto");

const hashEvent = (input) => {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
};

const hashDocument = (buffer) => {
  return {
    md5: crypto.createHash("md5").update(buffer).digest("hex"),
    sha256: crypto.createHash("sha256").update(buffer).digest("hex")
  };
};

module.exports = {
  hashEvent,
  hashDocument
};
