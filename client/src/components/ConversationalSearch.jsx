import { useState } from "react";
import api from "../services/api";

const ConversationalSearch = ({ onResults }) => {
  const [query, setQuery] = useState("Show SC applicants from Tamil Nadu whose rank improved over 50% with manual overrides");
  const [loading, setLoading] = useState(false);

  const runSearch = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/applicants/search/conversational", { query });
      onResults(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h3>Conversational Search</h3>
      <div className="row">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type your audit query" />
        <button type="button" onClick={runSearch} disabled={loading}>{loading ? "Searching..." : "Search"}</button>
      </div>
    </div>
  );
};

export default ConversationalSearch;
