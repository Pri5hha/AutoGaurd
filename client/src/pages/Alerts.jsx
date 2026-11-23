import { Fragment, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [filters, setFilters] = useState({ severity: "", type: "" });
  const [selected, setSelected] = useState({});
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("low");
  const [creatingCase, setCreatingCase] = useState(false);

  const load = async () => {
    const { data } = await api.get("/alerts", {
      params: { severity: filters.severity || undefined }
    });
    setAlerts(data);
  };

  useEffect(() => {
    load();
  }, [filters.severity]);

  const filtered = useMemo(() => {
    if (!filters.type) return alerts;
    return alerts.filter((a) => (a.title || "").toLowerCase().includes(filters.type.toLowerCase()));
  }, [alerts, filters.type]);

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  const applicantRefFromAlert = (alert) =>
    alert?.applicant?._id || alert?.applicantId?._id || alert?.applicantId || "";

  const toPriority = (severity) => {
    if (["Critical", "High", "Medium", "Low"].includes(severity)) return severity;
    return "Medium";
  };

  const acknowledgeBulk = async () => {
    if (!selectedIds.length) return;
    await Promise.all(selectedIds.map((id) => api.patch(`/alerts/${id}/read`)));
    load();
  };

  const createCaseFromAlert = async (alert) => {
    const applicantRef = applicantRefFromAlert(alert);
    if (!applicantRef) return { ok: false, status: 400 };
    try {
      await api.post("/cases", { applicantId: applicantRef, priority: toPriority(alert.severity) });
      return { ok: true };
    } catch (error) {
      return { ok: false, status: error.response?.status || 500 };
    }
  };

  const createCasesBulk = async () => {
    const rows = filtered.filter((a) => selected[a._id] && applicantRefFromAlert(a));
    if (!rows.length) {
      setMessageTone("medium");
      setMessage("Select at least one alert with a valid applicant.");
      return;
    }

    setCreatingCase(true);
    const results = await Promise.all(rows.map((row) => createCaseFromAlert(row)));
    const successCount = results.filter((r) => r.ok).length;
    const failCount = results.length - successCount;
    const permissionDenied = results.some((r) => !r.ok && r.status === 403);

    if (permissionDenied) {
      setMessageTone("high");
      setMessage("You do not have permission to create cases from alerts.");
    } else if (failCount === 0) {
      setMessageTone("low");
      setMessage(`Created ${successCount} case${successCount === 1 ? "" : "s"} successfully.`);
    } else if (successCount > 0) {
      setMessageTone("medium");
      setMessage(`Created ${successCount} case(s), ${failCount} failed.`);
    } else {
      setMessageTone("high");
      setMessage("Case creation failed for selected alerts.");
    }

    setCreatingCase(false);
    load();
  };

  return (
    <div className="page-grid">
      <div className="surface">
        <div className="surface-head">
          <h2>Alerts Queue</h2>
          <span className="tiny muted">{filtered.length} records</span>
        </div>
        <div className="row">
          <select value={filters.severity} onChange={(e) => setFilters((p) => ({ ...p, severity: e.target.value }))}>
            <option value="">All Severity</option>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <input
            value={filters.type}
            onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
            placeholder="Filter anomaly type"
          />
          <button className="btn" type="button" onClick={acknowledgeBulk}>ACKNOWLEDGE</button>
          <button className="btn btn-danger" type="button" disabled={creatingCase} onClick={createCasesBulk}>
            {creatingCase ? "CREATING..." : "CREATE CASE"}
          </button>
        </div>
        {message ? <div className={`badge ${messageTone}`}>{message}</div> : null}
      </div>

      <div className="surface table-wrap">
        <table>
          <thead>
            <tr>
              <th />
              <th>Severity</th>
              <th>Anomaly Type</th>
              <th>Applicant</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((alert) => (
              <Fragment key={alert._id}>
                <tr>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!selected[alert._id]}
                      onChange={(e) => setSelected((prev) => ({ ...prev, [alert._id]: e.target.checked }))}
                    />
                  </td>
                  <td><span className={`badge ${alert.severity.toLowerCase()}`}>{alert.severity}</span></td>
                  <td>{alert.title}</td>
                  <td>{alert.applicantId || "N/A"}</td>
                  <td>{new Date(alert.createdAt).toLocaleString()}</td>
                  <td>
                    <div className="row">
                      <button
                        className="btn btn-danger"
                        type="button"
                        disabled={creatingCase}
                        onClick={async () => {
                          setCreatingCase(true);
                          const result = await createCaseFromAlert(alert);
                          if (result.ok) {
                            setMessageTone("low");
                            setMessage(`Case created from alert ${alert._id}.`);
                          } else if (result.status === 403) {
                            setMessageTone("high");
                            setMessage("You do not have permission to create cases.");
                          } else {
                            setMessageTone("high");
                            setMessage("Unable to create case from this alert.");
                          }
                          setCreatingCase(false);
                          load();
                        }}
                      >
                        CASE
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => setExpanded((prev) => ({ ...prev, [alert._id]: !prev[alert._id] }))}
                      >
                        {expanded[alert._id] ? "HIDE" : "EXPAND"}
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded[alert._id] ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="surface" style={{ margin: 4 }}>
                        <div className="tiny muted">{alert.message}</div>
                        <div className="tiny mono">channels: {(alert.channels || []).join(", ")}</div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Alerts;
