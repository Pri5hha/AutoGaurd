import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const columns = [
  { key: "Open", help: "Newly created case; waiting to be worked." },
  { key: "Investigating", help: "Auditor is actively reviewing this case." },
  { key: "Verdict Pending", help: "Votes started, quorum is not reached yet." },
  { key: "Resolved", help: "Final decision accepted and closed." },
  { key: "Escalated", help: "Needs higher-level review or legal escalation." }
];

const CaseManager = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ applicantId: "", priority: "High" });
  const [updatingCaseId, setUpdatingCaseId] = useState("");

  const load = async () => {
    const [casesRes, applicantsRes] = await Promise.all([
      api.get("/cases"),
      api.get("/applicants", { params: { limit: 200 } })
    ]);

    setCases(casesRes.data || []);
    setApplicants(applicantsRes.data.rows || []);
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const keys = columns.map((c) => c.key);
    const map = Object.fromEntries(keys.map((c) => [c, []]));

    for (const item of cases) {
      const key = keys.includes(item.status) ? item.status : "Open";
      map[key].push(item);
    }

    return map;
  }, [cases]);

  const moveCase = async (item, status) => {
    setUpdatingCaseId(item._id);
    try {
      await api.patch(`/cases/${item._id}/status`, { status });
      await load();
    } finally {
      setUpdatingCaseId("");
    }
  };

  const createCase = async () => {
    if (!form.applicantId) return;
    await api.post("/cases", form);
    setCreateOpen(false);
    setForm({ applicantId: "", priority: "High" });
    load();
  };

  const countByStatus = (status) => grouped[status]?.length || 0;

  return (
    <div className="page-grid">
      <div className="surface">
        <div className="surface-head">
          <h2>Case Manager</h2>
          <div className="row">
            <button type="button" className="btn" onClick={load}>REFRESH</button>
            <button type="button" className="btn btn-danger" onClick={() => setCreateOpen(true)}>CREATE CASE</button>
          </div>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {columns.map((column) => (
            <div key={column.key} className="badge low">{column.key}: {countByStatus(column.key)}</div>
          ))}
        </div>
      </div>

      {createOpen ? (
        <div className="surface">
          <div className="surface-head">
            <h3>Create Case</h3>
            <button type="button" className="btn" onClick={() => setCreateOpen(false)}>CLOSE</button>
          </div>
          <div className="row">
            <select value={form.applicantId} onChange={(e) => setForm((p) => ({ ...p, applicantId: e.target.value }))}>
              <option value="">Select Applicant</option>
              {applicants.map((applicant) => (
                <option key={applicant._id} value={applicant._id}>
                  {applicant.applicantId} - {applicant.fullName}
                </option>
              ))}
            </select>
            <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <button type="button" className="btn btn-danger" onClick={createCase}>SAVE</button>
          </div>
        </div>
      ) : null}

      <div className="kanban-scroll">
        <div className="kanban">
          {columns.map((column) => (
            <div key={column.key} className="kanban-col">
              <div className="kanban-col-head">
                <h3>{column.key}</h3>
                <span className="badge low">{countByStatus(column.key)}</span>
              </div>
              <div className="tiny muted" style={{ marginTop: 4 }}>{column.help}</div>
              <div className="kanban-list">
                {(grouped[column.key] || []).length === 0 ? (
                  <div className="tiny muted" style={{ marginTop: 8 }}>No cases in this stage yet.</div>
                ) : null}
                {(grouped[column.key] || []).map((item) => (
                  <div key={item._id} className="case-card">
                    <div className="mono">{item.caseCode}</div>
                    <div className="tiny">{item.applicant?.applicantId} - {item.applicant?.fullName}</div>
                    <div className={`badge ${String(item.priority || "Medium").toLowerCase()}`}>{item.priority}</div>
                    <div className="row" style={{ marginTop: 8, flexWrap: "wrap" }}>
                      <select
                        value={item.status}
                        onChange={(e) => moveCase(item, e.target.value)}
                        disabled={updatingCaseId === item._id}
                      >
                        {columns.map((status) => (
                          <option key={status.key} value={status.key}>{status.key}</option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-ok" onClick={() => navigate(`/audit-room?case=${item._id}`)}>
                        OPEN ROOM
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CaseManager;
