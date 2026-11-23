import { useState } from "react";
import api from "../services/api";

const VerdictPanel = ({ caseId, onVoted }) => {
  const [note, setNote] = useState("");

  const castVote = async (decision) => {
    if (!caseId) return;
    const { data } = await api.post(`/cases/${caseId}/votes`, { decision, note });
    onVoted?.(data);
  };

  return (
    <div className="panel">
      <h3>Verdict Panel</h3>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add vote note" rows={3} />
      <div className="row">
        <button type="button" onClick={() => castVote("approve")}>Approve</button>
        <button type="button" onClick={() => castVote("reject")}>Reject</button>
        <button type="button" onClick={() => castVote("escalate")}>Escalate</button>
      </div>
    </div>
  );
};

export default VerdictPanel;
