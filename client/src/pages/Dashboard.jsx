import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../services/api";

const Dashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    Promise.all([api.get("/dashboard/summary"), api.get("/alerts")]).then(([s, a]) => {
      setSummary(s.data);
      setAlerts((a.data || []).slice(0, 5));
    });
  }, []);

  const trend = useMemo(
    () =>
      Array.from({ length: 30 }, (_, idx) => ({
        day: idx + 1,
        value: Math.max(0, Math.round(12 + 6 * Math.sin(idx / 4) + (idx % 5)))
      })),
    []
  );

  return (
    <div className="page-grid">
      <div className="surface">
        <div className="surface-head">
          <h2>Operational Dashboard</h2>
        </div>

        <div className="metric-strip">
          <div className="metric">
            <div className="label">Total Applicants</div>
            <div className="value mono">{summary?.kpis?.totalApplicants ?? "--"}</div>
          </div>
          <div className="metric">
            <div className="label">Active Alerts</div>
            <div className="value mono">{summary?.kpis?.criticalAlerts ?? "--"}</div>
          </div>
          <div className="metric">
            <div className="label">Open Cases</div>
            <div className="value mono">{summary?.kpis?.openCases ?? "--"}</div>
          </div>
          <div className="metric">
            <div className="label">Flagged Today</div>
            <div className="value mono">{summary?.kpis?.flaggedRecords ?? "--"}</div>
          </div>
        </div>
      </div>

      <div className="two-col dashboard-two-col">
        <div className="surface dashboard-chart-surface">
          <div className="surface-head">
            <h3>Anomaly Trend (30D)</h3>
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 12, right: 16, left: 10, bottom: 8 }}>
                <CartesianGrid stroke="#2a364c" strokeDasharray="4 4" />
                <XAxis dataKey="day" stroke="#8ea0b8" tick={{ fontSize: 10 }} />
                <YAxis stroke="#8ea0b8" tick={{ fontSize: 10 }} width={34} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#E63946" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface dashboard-alerts-surface">
          <div className="surface-head">
            <h3>Live Alerts Feed</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Anomaly</th>
                  <th>Severity</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert._id}>
                    <td>{alert.applicantId || "N/A"}</td>
                    <td>{alert.title}</td>
                    <td>
                      <span className={`badge ${alert.severity.toLowerCase()}`}>{alert.severity}</span>
                    </td>
                    <td>{new Date(alert.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="surface">
        <div className="row">
          <button className="btn btn-danger" type="button" onClick={() => navigate("/alerts")}>REVIEW ALERTS</button>
          <button className="btn" type="button" onClick={() => navigate("/network")}>OPEN NETWORK GRAPH</button>
          <button className="btn btn-ok" type="button" onClick={() => navigate("/audit-room")}>START AUDIT ROOM</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
