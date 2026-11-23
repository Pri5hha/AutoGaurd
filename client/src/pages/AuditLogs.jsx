import { useEffect, useState } from "react";
import api from "../services/api";

const AuditLogs = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get("/dashboard/summary").then((res) => setEvents(res.data.recentEvents || []));
  }, []);

  return (
    <div className="page-grid">
      <div className="surface">
        <h2>Audit Logs</h2>
      </div>
      <div className="surface table-wrap">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Role</th>
              <th>Timestamp</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e._id}>
                <td>{e.action}</td>
                <td>{e.actorRole || "system"}</td>
                <td>{new Date(e.createdAt).toLocaleString()}</td>
                <td>{e.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogs;
