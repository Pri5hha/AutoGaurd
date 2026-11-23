import { useEffect, useState } from "react";
import api from "../services/api";

const BlockchainLog = () => {
  const [chain, setChain] = useState([]);
  const [verification, setVerification] = useState(null);

  const load = async () => {
    const [chainRes, verifyRes] = await Promise.all([
      api.get("/dashboard/blockchain"),
      api.get("/dashboard/blockchain/verify")
    ]);
    setChain(chainRes.data);
    setVerification(verifyRes.data);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page-grid">
      <div className="surface">
        <div className="surface-head">
          <h2>Blockchain Audit Trail</h2>
          <span className={`badge ${verification?.ok ? "low" : "critical"}`}>{verification?.ok ? "VERIFIED" : "TAMPERED"}</span>
        </div>
      </div>

      <div className="surface table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Event</th>
              <th>Event Hash</th>
              <th>Prev Hash</th>
              <th>Block Hash</th>
            </tr>
          </thead>
          <tbody>
            {chain.map((b) => (
              <tr key={b._id}>
                <td>{b.sequence}</td>
                <td>{b.eventType}</td>
                <td className="mono tiny">{b.eventHash}</td>
                <td className="mono tiny">{b.previousHash}</td>
                <td className="mono tiny">{b.blockHash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BlockchainLog;
