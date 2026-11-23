import { useState } from "react";
import api from "../services/api";

const WhistleblowerPortal = () => {
  const [content, setContent] = useState("");
  const [department, setDepartment] = useState("");
  const [riskHint, setRiskHint] = useState("High");
  const [status, setStatus] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/tips", { content, department, riskHint });
    setStatus("Tip submitted anonymously.");
    setContent("");
  };

  return (
    <div className="page-grid">
      <h2>Whistleblower Portal</h2>
      <form className="panel" onSubmit={submit}>
        <label>Department (optional)</label>
        <input value={department} onChange={(e) => setDepartment(e.target.value)} />
        <label>Risk Hint</label>
        <select value={riskHint} onChange={(e) => setRiskHint(e.target.value)}>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <label>Tip Content</label>
        <textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} required />
        <button type="submit">Submit Tip</button>
        {status ? <div className="muted">{status}</div> : null}
      </form>
    </div>
  );
};

export default WhistleblowerPortal;
