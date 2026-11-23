const { ROLES } = require("../config/roles");

const roleWeights = {
  [ROLES.SYSTEM_ADMIN]: 5,
  [ROLES.SENIOR_AUDITOR]: 4,
  [ROLES.AUDITOR]: 3,
  [ROLES.ANALYST]: 2,
  [ROLES.READ_ONLY]: 1
};

const parseNaturalLanguageToMongo = (queryText = "") => {
  const q = queryText.toLowerCase();
  const mongo = {};
  const explanation = [];

  if (q.includes("sc category") || q.includes("sc applicants") || q.includes("category sc")) {
    mongo.category = "SC";
    explanation.push("Category is SC");
  }

  if (q.includes("st category") || q.includes("st applicants")) {
    mongo.category = "ST";
    explanation.push("Category is ST");
  }

  if (q.includes("manual override")) {
    mongo["override.applied"] = true;
    explanation.push("Manual override is present");
  }

  if (q.includes("tamil nadu")) {
    mongo.state = "Tamil Nadu";
    explanation.push("State is Tamil Nadu");
  }

  if (q.includes("last 7 days")) {
    mongo.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    explanation.push("Created in the last 7 days");
  }

  const rankMatch = q.match(/rank improved (?:over|more than)\s*(\d+)/i);
  if (rankMatch) {
    const threshold = Number(rankMatch[1]);
    mongo.$expr = {
      $gt: [
        {
          $multiply: [
            {
              $divide: [
                { $subtract: ["$rankPreviousYear", "$rankCurrent"] },
                { $ifNull: ["$rankPreviousYear", 1] }
              ]
            },
            100
          ]
        },
        threshold
      ]
    };
    explanation.push(`Rank improvement above ${threshold}%`);
  }

  if (q.includes("same document hash") || q.includes("shared document hash")) {
    mongo["anomalies.code"] = "DUPLICATE_DOCUMENT_HASH";
    explanation.push("Duplicate document hash anomalies");
  }

  if (q.includes("high risk") || q.includes("critical")) {
    mongo["risk.finalScore"] = { $gte: 70 };
    explanation.push("Risk score is 70 or above");
  }

  return {
    mongo,
    explanation: explanation.length ? explanation : ["No specific filter detected, so a broad search was used"]
  };
};

module.exports = {
  parseNaturalLanguageToMongo,
  roleWeights
};
