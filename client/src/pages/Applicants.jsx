import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const riskColor = (score) => {
  if (score > 70) return "#E63946";
  if (score >= 40) return "#F4A261";
  return "#2EC4B6";
};

const Applicants = () => {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ category: "", status: "" });
  const limit = 25;

  const load = async (targetPage = page) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/applicants", {
        params: {
          page: targetPage,
          limit,
          category: filters.category || undefined,
          status: filters.status || undefined
        }
      });
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setPage(data.page || targetPage);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(err.response?.data?.message || "Failed to load applicants.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, [filters.category, filters.status]);

  return (
    <div className="page-grid">
      <div className="surface">
        <div className="surface-head">
          <h2>Applicants Table</h2>
          <span className="tiny muted">Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
        </div>
        <div className="row">
          <select value={filters.category} onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}>
            <option value="">All Categories</option>
            <option>GEN</option>
            <option>SC</option>
            <option>ST</option>
            <option>OBC</option>
            <option>EWS</option>
          </select>
          <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option value="clean">clean</option>
            <option value="flagged">flagged</option>
            <option value="under-review">under-review</option>
            <option value="resolved">resolved</option>
          </select>
          <button className="btn" type="button" onClick={() => load(1)}>APPLY</button>
        </div>
      </div>

      <div className="surface table-wrap">
        {loading ? <div className="tiny muted">Loading applicants...</div> : null}
        {error ? <div className="badge high" style={{ marginBottom: 8 }}>{error}</div> : null}
        <table>
          <thead>
            <tr>
              <th>Applicant ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>GPA</th>
              <th>Entrance Score</th>
              <th>Rank</th>
              <th>Anomaly Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {!loading && !error && rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="tiny muted">
                  No applicants found for current filters. If this is first run, seed data with:
                  <code style={{ marginLeft: 6 }}>npm --prefix server run seed</code>
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const score = Number(row.risk?.finalScore || 0);
              return (
                <tr key={row._id}>
                  <td><Link to={`/applicants/${row._id}`}>{row.applicantId}</Link></td>
                  <td>{row.fullName}</td>
                  <td>{row.category}</td>
                  <td>{row.gpa}</td>
                  <td>{row.entranceScore}</td>
                  <td>{row.rankCurrent}</td>
                  <td>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${score}%`, background: riskColor(score) }} />
                    </div>
                    <div className="tiny mono">{score}</div>
                  </td>
                  <td>{row.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="row">
        <button className="btn" type="button" disabled={page <= 1} onClick={() => load(page - 1)}>PREV</button>
        <button className="btn" type="button" disabled={page * limit >= total} onClick={() => load(page + 1)}>NEXT</button>
      </div>
    </div>
  );
};

export default Applicants;
