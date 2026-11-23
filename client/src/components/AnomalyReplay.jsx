const AnomalyReplay = ({ events = [] }) => {
  const timeline = [...events].sort(
    (a, b) => new Date(a.detectedAt || a.createdAt || 0) - new Date(b.detectedAt || b.createdAt || 0)
  );

  return (
    <div className="surface">
      <h3>Anomaly Replay Timeline</h3>
      <div className="timeline">
        {timeline.length === 0 ? <div className="muted tiny">No timeline events</div> : null}
        {timeline.map((event, idx) => (
          <div key={`${event.code || event.action}-${idx}`} className="timeline-item">
            <div className="mono tiny">{event.code || event.action || "Event"}</div>
            <div className="tiny muted">{event.description || "No description"}</div>
            <div className="tiny muted">{new Date(event.detectedAt || event.createdAt || Date.now()).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnomalyReplay;
