import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";

const options = [
  ["approve", "Confirmed Fraud"],
  ["reject", "Reject (Clear)"],
  ["escalate", "Inconclusive"]
];

const optionLabel = (decision) => options.find(([key]) => key === decision)?.[1] || decision;
const prettifyRole = (role) =>
  String(role || "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
const voteLabel = (decision) => {
  if (decision === "approve") return "Approve";
  if (decision === "reject") return "Reject";
  if (decision === "escalate") return "Escalate";
  return decision;
};

const formatVoteBreakdown = (counts) => {
  const order = ["approve", "reject", "escalate"];
  const parts = order.filter((key) => counts[key]).map((key) => `${voteLabel(key)} ${counts[key]}`);
  return parts.length ? parts.join(" | ") : "None";
};

const AuditRoom = () => {
  const [params] = useSearchParams();
  const initialCase = params.get("case") || "";
  const { socket } = useSocket();
  const { user } = useAuth();

  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState(initialCase);
  const [caseData, setCaseData] = useState(null);
  const [comment, setComment] = useState("");
  const [feed, setFeed] = useState([]);
  const [presence, setPresence] = useState([]);
  const [votes, setVotes] = useState({});
  const [statusMessage, setStatusMessage] = useState("");

  const loadCases = async () => {
    const { data } = await api.get("/cases");
    setCases(data || []);

    if (!caseId && data?.[0]?._id) {
      const firstWithApplicant = data.find((item) => item.applicant?._id) || data[0];
      setCaseId(firstWithApplicant._id);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    if (!caseId) return;

    const current = cases.find((item) => item._id === caseId || item.caseCode === caseId);
    const resolvedId = current?._id || caseId;

    api.get(`/cases/${resolvedId}`).then((res) => {
      setCaseData(res.data);
      const existingFeed = (res.data.comments || [])
        .map((entry) => ({
          commentId: entry._id,
          body: entry.body,
          authorId: typeof entry.author === "object" ? (entry.author._id || entry.author.id) : entry.author,
          authorName: typeof entry.author === "object" ? entry.author.name : null,
          authorRole: typeof entry.author === "object" ? entry.author.role : null,
          at: entry.createdAt
        }))
        .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
      setFeed(existingFeed);

      const preVotes = (res.data.verdictVotes || []).reduce((acc, vote) => {
        const voterId = typeof vote.voter === "object" ? (vote.voter._id || vote.voter.id) : vote.voter;
        if (!voterId) return acc;
        acc[voterId] = {
          decision: vote.decision,
          name: typeof vote.voter === "object" ? vote.voter.name : voterId
        };
        return acc;
      }, {});
      setVotes(preVotes);
    }).catch(() => {
      setCaseData(null);
      setStatusMessage("Case not found. Use a valid case from the dropdown.");
    });
  }, [caseId, cases]);

  useEffect(() => {
    if (!socket || !user || !caseData?._id) return;

    const roomCaseId = caseData._id;
    socket.emit("join_case", { caseId: roomCaseId, user: { id: user.id, name: user.name, role: user.role } });

    const onPresence = (payload) => {
      setPresence((prev) => {
        if (payload.type === "left") return prev.filter((p) => p.socketId !== payload.socketId);
        return [...prev.filter((p) => p.socketId !== payload.socketId), payload];
      });
    };

    const onComment = (payload) =>
      setFeed((prev) => {
        const deduped = prev.filter((entry) => entry.commentId !== payload.commentId);
        return [payload, ...deduped].slice(0, 200);
      });
    const onVote = (payload) =>
      setVotes((prev) => ({
        ...prev,
        [payload.voterId]: {
          decision: payload.decision,
          name: payload.voterName || prev[payload.voterId]?.name || payload.voterId
        }
      }));

    socket.on("presence", onPresence);
    socket.on("comment_posted", onComment);
    socket.on("vote_cast", onVote);

    return () => {
      socket.off("presence", onPresence);
      socket.off("comment_posted", onComment);
      socket.off("vote_cast", onVote);
    };
  }, [socket, user, caseData?._id]);

  const quorum = useMemo(() => {
    const counts = Object.values(votes).reduce(
      (acc, entry) => ({ ...acc, [entry.decision]: (acc[entry.decision] || 0) + 1 }),
      {}
    );
    const totalVotes = Object.keys(votes).length;
    const reached = Object.values(counts).some((count) => count >= 2);
    return { counts, totalVotes, reached };
  }, [votes]);

  const sendComment = async () => {
    if (!comment.trim() || !caseData?._id) return;

    const payload = {
      caseId: caseData._id,
      body: comment,
      authorId: user?.id,
      at: new Date().toISOString()
    };

    if (socket) {
      socket.emit("comment_posted", payload);
    } else {
      await api.post(`/cases/${caseData._id}/comments`, { body: comment, mentions: [] }).catch(() => {});
      await api.get(`/cases/${caseData._id}`).then((res) => {
        const existingFeed = (res.data.comments || [])
          .map((entry) => ({
            commentId: entry._id,
            body: entry.body,
            authorId: typeof entry.author === "object" ? (entry.author._id || entry.author.id) : entry.author,
            authorName: typeof entry.author === "object" ? entry.author.name : null,
            authorRole: typeof entry.author === "object" ? entry.author.role : null,
            at: entry.createdAt
          }))
          .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
        setFeed(existingFeed);
      }).catch(() => {});
    }
    setComment("");
    setStatusMessage("Comment sent.");
  };

  const castVote = async (decision) => {
    if (!caseData?._id) return;
    socket?.emit("vote_cast", { caseId: caseData._id, decision, voterId: user?.id });
    const result = await api.post(`/cases/${caseData._id}/votes`, { decision, note: "Room vote" });
    setVotes((prev) => ({ ...prev, [user?.id]: { decision, name: user?.name || user?.id } }));
    setStatusMessage(`Vote submitted: ${decision}. Case status: ${result.data.status}.`);
    await loadCases();
  };

  return (
    <div className="page-grid">
      <div className="surface">
        <div className="surface-head">
          <h2>Real-Time Collaborative Audit Room</h2>
          <span className="tiny muted">Case {caseData?.caseCode || "N/A"}</span>
        </div>
        <div className="row">
          <select value={caseData?._id || caseId} onChange={(e) => setCaseId(e.target.value)}>
            <option value="">Select Case</option>
            {cases.map((item) => (
              <option key={item._id} value={item._id}>
                {item.caseCode} - {item.applicant?.applicantId || "Applicant link missing"}
              </option>
            ))}
          </select>
          <button className="btn" type="button" onClick={loadCases}>REFRESH</button>
        </div>
        {cases.length === 0 ? (
          <div className="tiny muted" style={{ marginTop: 8 }}>
            No cases visible for this account. Create a case or assign one to this auditor.
          </div>
        ) : null}
        {statusMessage ? <div className="tiny muted" style={{ marginTop: 8 }}>{statusMessage}</div> : null}
      </div>

      <div className="audit-room-grid">
        <div className="surface">
          <h3>Evidence Panel</h3>
          <div className="tiny muted">
            Applicant: {caseData?.applicant?.applicantId || "N/A"} - {caseData?.applicant?.fullName || "Missing"}
          </div>
          {!caseData?.applicant ? (
            <div className="tiny muted" style={{ marginTop: 6 }}>
              This case is not linked to a valid applicant record. Open Case Manager and create a new case from an applicant.
            </div>
          ) : null}
          <div className="tiny muted">Priority: {caseData?.priority || "N/A"}</div>
          <div className="tiny muted">Risk: {caseData?.applicant?.risk?.finalScore || 0}</div>

          <div className="surface vote-panel" style={{ marginTop: 10 }}>
            <h4>Verdict Voting</h4>
            <div className="vote-grid">
              {options.map(([decision, label]) => (
                <button key={decision} className="btn btn-danger" type="button" onClick={() => castVote(decision)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="tiny mono" style={{ marginTop: 8 }}>
              Votes: {quorum.totalVotes} ({formatVoteBreakdown(quorum.counts)})
            </div>
            <div style={{ marginTop: 8 }}>
              {Object.entries(votes).length === 0 ? (
                <div className="tiny muted">No votes yet.</div>
              ) : (
                Object.entries(votes).map(([voterId, entry]) => (
                  <div key={voterId} className="tiny mono">
                    {entry.name || voterId}: {optionLabel(entry.decision)}
                  </div>
                ))
              )}
            </div>
            <div className={`badge ${quorum.reached ? "low" : "medium"}`}>{quorum.reached ? "Quorum Reached" : "Quorum Pending"}</div>
          </div>
        </div>

        <div className="surface">
          <h3>Live Collaboration</h3>
          <div className="row" style={{ flexWrap: "wrap" }}>
            {presence.map((p) => (
              <div key={p.socketId} className="badge low">{p.user?.name || "auditor"}</div>
            ))}
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Post comment"
              onKeyDown={(e) => {
                if (e.key === "Enter") sendComment();
              }}
            />
            <button className="btn" type="button" onClick={sendComment}>SEND</button>
          </div>

          <div className="comment-feed">
            {feed.length === 0 ? <div className="tiny muted">No comments yet.</div> : null}
            {feed.map((entry, idx) => (
              <div key={idx} className="surface" style={{ padding: 8 }}>
                <div className="tiny mono">
                  {entry.authorName || entry.user?.name || entry.authorId || "auditor"}
                  {entry.authorRole ? ` (${prettifyRole(entry.authorRole)})` : ""}
                </div>
                <div>{entry.body}</div>
                <div className="tiny muted">{new Date(entry.at || Date.now()).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditRoom;
