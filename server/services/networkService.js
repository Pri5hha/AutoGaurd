const NetworkEdge = require("../models/NetworkEdge");

const buildEdgesFromApplicants = async (applicants) => {
  const edges = [];

  for (let i = 0; i < applicants.length; i += 1) {
    for (let j = i + 1; j < applicants.length; j += 1) {
      const a = applicants[i];
      const b = applicants[j];

      const relations = [];
      if (a.referee && b.referee && a.referee === b.referee) relations.push("same_referee");
      if (a.address && b.address && a.address === b.address) relations.push("same_address");
      if (a.phone && b.phone && a.phone === b.phone) relations.push("same_phone");
      if (a.submission?.ipAddress === b.submission?.ipAddress) relations.push("same_ip");
      if (a.submission?.deviceFingerprint === b.submission?.deviceFingerprint) relations.push("same_device");

      const hashesA = new Set((a.documents || []).map((d) => d.hashSha256));
      const shareDoc = (b.documents || []).some((d) => hashesA.has(d.hashSha256));
      if (shareDoc) relations.push("same_doc_hash");

      if (relations.length) {
        relations.forEach((relation) => {
          edges.push({
            fromApplicant: a._id,
            toApplicant: b._id,
            relation,
            strength: relations.length,
            metadata: { from: a.applicantId, to: b.applicantId }
          });
        });
      }
    }
  }

  if (edges.length) {
    const operations = edges.map((edge) => ({
      updateOne: {
        filter: {
          fromApplicant: edge.fromApplicant,
          toApplicant: edge.toApplicant,
          relation: edge.relation
        },
        update: { $set: edge },
        upsert: true
      }
    }));

    await NetworkEdge.bulkWrite(operations, { ordered: false });
  }

  return edges.length;
};

module.exports = { buildEdgesFromApplicants };
