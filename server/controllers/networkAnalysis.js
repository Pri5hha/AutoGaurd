const Applicant = require("../models/Applicant");
const NetworkEdge = require("../models/NetworkEdge");
const { buildEdgesFromApplicants } = require("../services/networkService");

const buildNetwork = async (req, res) => {
  const applicants = await Applicant.find().lean();
  const totalEdges = await buildEdgesFromApplicants(applicants);
  return res.json({ message: "Network graph rebuilt", totalEdges });
};

const getNetworkGraph = async (req, res) => {
  const applicants = await Applicant.find().select("applicantId fullName risk department category").lean();
  const edges = await NetworkEdge.find().lean();

  const nodes = applicants.map((a) => ({
    id: a._id.toString(),
    applicantId: a.applicantId,
    label: a.fullName,
    risk: a.risk?.finalScore || 0,
    department: a.department,
    category: a.category
  }));

  const links = edges.map((e) => ({
    source: e.fromApplicant.toString(),
    target: e.toApplicant.toString(),
    relation: e.relation,
    strength: e.strength
  }));

  const adjacency = new Map();
  nodes.forEach((n) => adjacency.set(n.id, new Set()));
  links.forEach((l) => {
    if (adjacency.has(l.source)) adjacency.get(l.source).add(l.target);
    if (adjacency.has(l.target)) adjacency.get(l.target).add(l.source);
  });

  const visited = new Set();
  const clusters = [];

  for (const n of nodes) {
    if (visited.has(n.id)) continue;
    const stack = [n.id];
    const cluster = [];
    visited.add(n.id);

    while (stack.length) {
      const current = stack.pop();
      cluster.push(current);
      adjacency.get(current).forEach((next) => {
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      });
    }

    if (cluster.length > 1) {
      clusters.push(cluster);
    }
  }

  return res.json({ nodes, links, clusters });
};

module.exports = {
  buildNetwork,
  getNetworkGraph
};

