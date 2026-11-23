import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ShieldMark from "./ShieldMark";
import ConversationalDock from "./ConversationalDock";

const links = [
  ["/", "Dashboard"],
  ["/applicants", "Applicants"],
  ["/alerts", "Alerts"],
  ["/network", "Network Graph"],
  ["/cases", "Case Manager"],
  ["/audit-room", "Audit Room"],
  ["/reports", "Reports"],
  ["/audit-logs", "Audit Logs"],
  ["/blockchain", "Chain"]
];

const formatCount = (count) => `${count} applicant${count === 1 ? "" : "s"} matched`;

const Layout = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [queryResult, setQueryResult] = useState(null);

  return (
    <div className="ag-shell">
      <div className="mesh-bg" aria-hidden="true" />
      <aside className="ag-rail">
        <div className="brand-row">
          <ShieldMark />
          <div>
            <h1>AUTOGUARD</h1>
            <p>Audit Intelligence. Zero Tolerance.</p>
          </div>
        </div>

        <nav className="ag-nav">
          {links.map(([to, label]) => (
            <Link key={to} to={to} className={location.pathname === to ? "active" : ""}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="ag-session">
          <div>{user?.name}</div>
          <div className="mono tiny">{user?.role}</div>
          <button type="button" className="btn btn-danger" onClick={logout}>LOGOUT</button>
        </div>
      </aside>

      <main className="ag-main">{children}</main>
      <ConversationalDock onResult={setQueryResult} />
      {queryResult ? (
        <div className="query-result-panel">
          <div className="title-row">
            <strong>Query Result</strong>
            <button type="button" className="btn" onClick={() => setQueryResult(null)}>CLOSE</button>
          </div>
          <p className="tiny"><strong>Matches:</strong> {formatCount(queryResult.resultCount || 0)}</p>
          {(queryResult.results || []).length > 0 ? (
            <p className="tiny">
              <strong>Top Results:</strong>{" "}
              {(queryResult.results || [])
                .slice(0, 3)
                .map((row) => `${row.applicantId} (${row.fullName})`)
                .join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default Layout;
