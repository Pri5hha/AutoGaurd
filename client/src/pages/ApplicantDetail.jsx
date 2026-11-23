import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import RiskDNA from "../components/RiskDNA";
import AnomalyReplay from "../components/AnomalyReplay";

const requiredDocs = ["ID_PROOF", "SCORE_CARD", "CERTIFICATE"];

const ApplicantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [applicant, setApplicant] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.get(`/applicants/${id}`).then((res) => setApplicant(res.data));

  useEffect(() => {
    load();
  }, [id]);

  const docState = useMemo(() => {
    const set = new Set((applicant?.documents || []).map((d) => d.type));
    return requiredDocs.map((type) => ({ type, present: set.has(type) }));
  }, [applicant]);

  const runAudit = async () => {
    setSaving(true);
    try {
      await api.post(`/audits/applicant/${id}`);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const escalate = async () => {
    if (!applicant) return;
    await api.post("/cases", { applicantId: applicant._id, priority: "High" });
    navigate("/cases");
  };

  if (!applicant) return <div className="surface">Loading applicant profile...</div>;

  return (
    <div className="page-grid">
      <div className="surface">
        <div className="surface-head">
          <h2>{applicant.fullName}</h2>
          <span className={`badge ${(applicant.risk?.finalScore || 0) >= 70 ? "critical" : (applicant.risk?.finalScore || 0) >= 40 ? "medium" : "low"}`}>
            Score {applicant.risk?.finalScore || 0}
          </span>
        </div>
        <div className="three-col">
          <div>
            <div className="muted tiny">Applicant ID</div>
            <div className="mono">{applicant.applicantId}</div>
          </div>
          <div>
            <div className="muted tiny">Category</div>
            <div className="mono">{applicant.category}</div>
          </div>
          <div>
            <div className="muted tiny">Status</div>
            <div className="mono">{applicant.status}</div>
          </div>
        </div>
      </div>

      <div className="two-col">
        <RiskDNA risk={applicant.risk} />
        <div className="surface">
          <h3>Flagged Anomalies</h3>
          <div className="page-grid">
            {(applicant.anomalies || []).map((a, idx) => (
              <div key={`${a.code}-${idx}`} className="surface" style={{ padding: 8 }}>
                <div className="surface-head">
                  <strong>{a.code}</strong>
                  <span className={`badge ${String(a.severityLabel || "low").toLowerCase()}`}>{a.severityLabel || "LOW"}</span>
                </div>
                <div className="tiny muted">{a.description}</div>
                <div className="tiny mono">rule-weight {a.ruleWeight || 0} | ml-confidence {a.mlConfidence || 0}</div>
                <div className="tiny muted">{new Date(a.detectedAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="surface">
          <h3>Document Checklist</h3>
          <div className="page-grid">
            {docState.map((doc) => (
              <div key={doc.type} className="row" style={{ justifyContent: "space-between" }}>
                <span>{doc.type}</span>
                <span className={`badge ${doc.present ? "low" : "critical"}`}>{doc.present ? "Complete" : "Missing"}</span>
              </div>
            ))}
          </div>
        </div>

        <AnomalyReplay events={applicant.anomalies || []} />
      </div>

      <div className="surface">
        <div className="row">
          <button className="btn btn-danger" type="button" onClick={runAudit} disabled={saving}>{saving ? "PROCESSING" : "FLAG FOR REVIEW"}</button>
          <button className="btn btn-warn" type="button" onClick={escalate}>ESCALATE TO CASE</button>
          <a className="btn" href={`/api/documents/report/${applicant._id}`} target="_blank" rel="noreferrer">GENERATE PDF REPORT</a>
        </div>
      </div>
    </div>
  );
};

export default ApplicantDetail;
