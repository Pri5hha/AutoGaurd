const LiveCursors = ({ cursors = [] }) => {
  return (
    <div className="panel">
      <h3>Live Cursors</h3>
      <div className="cursor-list">
        {cursors.length === 0 ? <div className="muted">No active collaborators</div> : null}
        {cursors.map((c, idx) => (
          <div key={`${c.user}-${idx}`} className="cursor-item">
            <strong>{c.user?.name || "Auditor"}</strong>
            <span>{c.section}</span>
            <span className="muted tiny">x:{Math.round(c.x)} y:{Math.round(c.y)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveCursors;
