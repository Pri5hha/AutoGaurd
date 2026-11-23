const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { connectDb } = require("../config/db");
const { ROLES } = require("../config/roles");
const Applicant = require("../models/Applicant");
const User = require("../models/User");
const CaseModel = require("../models/Case");
const Alert = require("../models/Alert");
const NetworkEdge = require("../models/NetworkEdge");
const BlockchainLog = require("../models/BlockchainLog");
const AuditLog = require("../models/AuditLog");
const QueryLog = require("../models/QueryLog");
const { runAuditOnApplicant } = require("../controllers/auditEngine");
const { buildEdgesFromApplicants } = require("../services/networkService");

const departments = ["Computer Science", "Mechanical", "Civil", "ECE", "Biotech", "Economics"];
const states = ["Tamil Nadu", "Kerala", "Karnataka", "Maharashtra", "Delhi", "Gujarat", "Punjab"];
const categories = ["GEN", "SC", "ST", "OBC", "EWS"];

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];

const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const md5 = (value) => crypto.createHash("md5").update(value).digest("hex");

const buildDocs = (idPrefix) => [
  {
    name: `${idPrefix}-id.pdf`,
    type: "ID_PROOF",
    hashMd5: md5(`${idPrefix}-id`),
    hashSha256: sha(`${idPrefix}-id`)
  },
  {
    name: `${idPrefix}-score.pdf`,
    type: "SCORE_CARD",
    hashMd5: md5(`${idPrefix}-score`),
    hashSha256: sha(`${idPrefix}-score`)
  },
  {
    name: `${idPrefix}-cert.pdf`,
    type: "CERTIFICATE",
    hashMd5: md5(`${idPrefix}-cert`),
    hashSha256: sha(`${idPrefix}-cert`)
  }
];

const makeApplicant = (idx) => {
  const category = categories[idx % categories.length];
  const submittedAt = new Date(Date.now() - (idx + 2) * 3600 * 1000);
  const decisionAt = new Date(submittedAt.getTime() + (5 + rand(28)) * 3600 * 1000);

  return {
    applicantId: `AG-2026-${String(idx + 1).padStart(5, "0")}`,
    fullName: `Applicant ${idx + 1}`,
    department: departments[idx % departments.length],
    state: states[idx % states.length],
    category,
    quotaClaimed: category === "GEN" ? "NONE" : category,
    gpa: Number((6 + Math.random() * 3.5).toFixed(2)),
    entranceScore: Number((52 + Math.random() * 43).toFixed(2)),
    rankCurrent: 120 + idx * 6 + rand(45),
    rankPreviousYear: 130 + idx * 7 + rand(55),
    referee: `Ref-${idx % 70}`,
    address: `Block ${idx % 150}, Chennai`,
    phone: `9${String(100000000 + idx).slice(0, 9)}`,
    documents: buildDocs(`app-${idx}`),
    submission: {
      submittedAt,
      decisionAt,
      ipAddress: `10.40.${Math.floor(idx / 240)}.${(idx % 240) + 1}`,
      deviceFingerprint: `dev-${idx}`
    },
    override: {
      applied: false,
      reason: "",
      officerId: "",
      timestamp: null
    },
    labels: {
      isGroundTruthAnomaly: false,
      anomalyTypes: []
    }
  };
};

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const pickDistinct = (pool, count) => shuffle(pool).slice(0, Math.min(count, pool.length));

const applyAnomaly = (record, type, state) => {
  record.labels.isGroundTruthAnomaly = true;
  if (!record.labels.anomalyTypes.includes(type)) record.labels.anomalyTypes.push(type);

  switch (type) {
    case "RANK_JUMP_ANOMALY": {
      record.rankPreviousYear = 2200 + rand(400);
      record.rankCurrent = 700 + rand(220);
      break;
    }
    case "CATEGORY_MISUSE": {
      record.gpa = Number((9.2 + Math.random() * 0.7).toFixed(2));
      record.quotaClaimed = pick(["SC", "ST", "OBC", "EWS"]);
      break;
    }
    case "UNAUTHORIZED_OVERRIDE": {
      record.override = { applied: true, reason: "", officerId: `OF-${rand(40)}`, timestamp: new Date() };
      break;
    }
    case "TIMING_SPEED_ANOMALY": {
      record.submission.decisionAt = new Date(record.submission.submittedAt.getTime() + (10 + rand(45)) * 60000);
      break;
    }
    case "TIMING_HOURS_ANOMALY": {
      const decision = new Date(record.submission.submittedAt);
      decision.setHours(23, rand(59), 0, 0);
      if (decision < record.submission.submittedAt) decision.setDate(decision.getDate() + 1);
      record.submission.decisionAt = decision;
      break;
    }
    case "DOCUMENT_INCONSISTENCY": {
      record.documents = record.documents.filter((d) => d.type !== "CERTIFICATE");
      break;
    }
    case "GPA_MISMATCH": {
      record.gpa = Number((9.6 + Math.random() * 0.3).toFixed(2));
      record.entranceScore = Number((38 + Math.random() * 8).toFixed(2));
      break;
    }
    case "DUPLICATE_DOCUMENT_HASH": {
      const key = `dup-${Math.floor(state.duplicateCounter / 2)}`;
      const sharedHash = sha(key);
      record.documents[0].hashSha256 = sharedHash;
      record.documents[0].hashMd5 = md5(key);
      state.duplicateCounter += 1;
      break;
    }
    default:
      break;
  }
};

const buildFraudClusters = (records, anomalousIndices) => {
  const clusters = [];
  const shuffled = shuffle(anomalousIndices);

  for (let c = 0; c < 3; c += 1) {
    const cluster = shuffled.slice(c * 6, c * 6 + 6);
    if (cluster.length < 4) continue;

    const sharedRef = `ClusterRef-${c + 1}`;
    const sharedAddress = `Cluster Street ${c + 1}, Chennai`;
    const sharedIp = `172.19.${c + 1}.44`;
    const sharedHash = sha(`cluster-doc-${c + 1}`);

    cluster.forEach((idx) => {
      const rec = records[idx];
      rec.labels.isGroundTruthAnomaly = true;
      ["DUPLICATE_DOCUMENT_HASH", "NETWORK_CLUSTER"].forEach((t) => {
        if (!rec.labels.anomalyTypes.includes(t)) rec.labels.anomalyTypes.push(t);
      });
      rec.referee = sharedRef;
      rec.address = sharedAddress;
      rec.submission.ipAddress = sharedIp;
      rec.submission.deviceFingerprint = `cluster-device-${c + 1}`;
      rec.documents[1].hashSha256 = sharedHash;
      rec.documents[1].hashMd5 = md5(`cluster-doc-${c + 1}`);
    });

    clusters.push(cluster);
  }

  return clusters;
};

const createDataset = () => {
  const records = Array.from({ length: 500 }, (_, i) => makeApplicant(i));
  const byCategory = new Map();
  categories.forEach((cat) => byCategory.set(cat, []));

  records.forEach((record, idx) => {
    byCategory.get(record.category).push(idx);
  });

  // 8-15% anomaly prevalence per category (12% target)
  const anomalousIndices = [];
  byCategory.forEach((indices) => {
    anomalousIndices.push(...pickDistinct(indices, 12));
  });

  const types = [
    "RANK_JUMP_ANOMALY",
    "CATEGORY_MISUSE",
    "UNAUTHORIZED_OVERRIDE",
    "TIMING_SPEED_ANOMALY",
    "TIMING_HOURS_ANOMALY",
    "DOCUMENT_INCONSISTENCY",
    "GPA_MISMATCH",
    "DUPLICATE_DOCUMENT_HASH"
  ];

  const state = { duplicateCounter: 0 };
  anomalousIndices.forEach((idx, i) => {
    const type = types[i % types.length];
    applyAnomaly(records[idx], type, state);
  });

  buildFraudClusters(records, anomalousIndices);

  // guarantee every anomaly type appears at least once
  types.forEach((type, i) => applyAnomaly(records[anomalousIndices[i]], type, state));

  return records;
};

const seedUsers = async () => {
  const users = [
    { name: "System Admin", email: "admin@autoguard.local", role: ROLES.SYSTEM_ADMIN, department: "Administration" },
    { name: "Senior Auditor", email: "senior@autoguard.local", role: ROLES.SENIOR_AUDITOR, department: "Audit" },
    { name: "Auditor", email: "auditor@autoguard.local", role: ROLES.AUDITOR, department: "Audit" },
    { name: "Analyst", email: "analyst@autoguard.local", role: ROLES.ANALYST, department: "Computer Science" },
    { name: "Read Only", email: "readonly@autoguard.local", role: ROLES.READ_ONLY, department: "Compliance" }
  ];

  for (const entry of users) {
    const user = new User({ ...entry, passwordHash: "placeholder" });
    // eslint-disable-next-line no-await-in-loop
    await user.setPassword("Password@123");
    // eslint-disable-next-line no-await-in-loop
    await user.save();
  }
};

const run = async () => {
  await connectDb();

  await Promise.all([
    Applicant.deleteMany({}),
    User.deleteMany({}),
    CaseModel.deleteMany({}),
    Alert.deleteMany({}),
    NetworkEdge.deleteMany({}),
    BlockchainLog.deleteMany({}),
    AuditLog.deleteMany({}),
    QueryLog.deleteMany({})
  ]);

  await seedUsers();
  const senior = await User.findOne({ role: ROLES.SENIOR_AUDITOR });

  const records = createDataset();
  const created = await Applicant.insertMany(records);

  for (const applicant of created) {
    // eslint-disable-next-line no-await-in-loop
    await runAuditOnApplicant(applicant, senior?._id?.toString());
  }

  const all = await Applicant.find().lean();
  await buildEdgesFromApplicants(all);

  const perCategory = await Applicant.aggregate([
    { $group: { _id: "$category", total: { $sum: 1 }, anomalies: { $sum: { $cond: ["$labels.isGroundTruthAnomaly", 1, 0] } } } },
    { $project: { _id: 1, total: 1, anomalies: 1, prevalencePct: { $round: [{ $multiply: [{ $divide: ["$anomalies", "$total"] }, 100] }, 2] } } }
  ]);

  const summary = {
    totalApplicants: await Applicant.countDocuments(),
    flaggedByEngine: await Applicant.countDocuments({ status: "flagged" }),
    openCases: await CaseModel.countDocuments(),
    categoryPrevalence: perCategory
  };

  // eslint-disable-next-line no-console
  console.log("Seed completed", summary);
  process.exit(0);
};

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Seed failed", err);
  process.exit(1);
});
