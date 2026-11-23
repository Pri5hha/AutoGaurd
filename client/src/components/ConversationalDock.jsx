import { useState } from "react";
import api from "../services/api";

const examples = [
  "Show SC category applicants whose rank improved more than 50%",
  "List all applicants with a manual override in the last 7 days",
  "How many applicants share the same document hash?"
];

const ConversationalDock = ({ onResult }) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (q) => {
    if (!q?.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post("/applicants/search/conversational", { query: q });
      onResult?.(data);
      setQuery("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="query-dock">
      <div className="chips">
        {examples.map((item) => (
          <button key={item} type="button" className="chip" onClick={() => submit(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="query-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about the admissions data..."
        />
        <button type="button" className="btn btn-danger" onClick={() => submit(query)} disabled={loading}>
          {loading ? "RUNNING" : "QUERY"}
        </button>
      </div>
    </div>
  );
};

export default ConversationalDock;
