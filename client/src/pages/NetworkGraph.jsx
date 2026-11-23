import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import api from "../services/api";

const edgeTypes = ["same_referee", "same_address", "same_phone", "same_doc_hash", "same_ip", "same_device"];
const GRAPH_WIDTH = 1100;
const GRAPH_HEIGHT = 700;

const NetworkGraph = () => {
  const svgRef = useRef(null);
  const [graph, setGraph] = useState({ nodes: [], links: [], clusters: [] });
  const [selected, setSelected] = useState(null);
  const [minRisk, setMinRisk] = useState(0);
  const [activeTypes, setActiveTypes] = useState(edgeTypes.reduce((acc, type) => ({ ...acc, [type]: true }), {}));

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get("/dashboard/network");
      setGraph(data);
    };
    load();
  }, []);

  const rebuildGraph = async () => {
    await api.post("/dashboard/network/rebuild");
    const { data } = await api.get("/dashboard/network");
    setGraph(data);
  };

  const filtered = useMemo(() => {
    const nodes = graph.nodes.filter((n) => n.risk >= minRisk);
    const allowedNodeIds = new Set(nodes.map((n) => n.id));
    const links = graph.links.filter((l) => activeTypes[l.relation] && allowedNodeIds.has(l.source) && allowedNodeIds.has(l.target));
    const clusters = (graph.clusters || []).filter((cluster) => cluster.some((id) => allowedNodeIds.has(id)));
    return { nodes, links, clusters };
  }, [graph, minRisk, activeTypes]);

  useEffect(() => {
    const width = GRAPH_WIDTH;
    const height = GRAPH_HEIGHT;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", [0, 0, width, height]);

    const zoomGroup = svg.append("g");

    svg.call(
      d3.zoom().scaleExtent([0.3, 3]).on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
      })
    );

    const nodes = filtered.nodes.map((n) => ({ ...n }));
    const links = filtered.links.map((l) => ({ ...l }));

    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(75))
      .force("charge", d3.forceManyBody().strength(-230))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const hullLayer = zoomGroup.append("g").attr("fill", "rgba(230,57,70,0.09)").attr("stroke", "#E63946");

    const link = zoomGroup
      .append("g")
      .attr("stroke", "#5B6576")
      .attr("stroke-opacity", 0.45)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d) => Math.max(1, d.strength || 1));

    const node = zoomGroup
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => 5 + Math.min(18, Math.round(d.risk / 7)))
      .attr("fill", (d) => (d.risk >= 70 ? "#E63946" : d.risk >= 40 ? "#F4A261" : "#2EC4B6"))
      .attr("stroke", "#0D1117")
      .attr("stroke-width", 1)
      .on("click", (_, d) => setSelected(d))
      .call(
        d3
          .drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    const labels = zoomGroup
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d) => d.applicantId)
      .attr("fill", "#5B6576")
      .attr("font-size", 9)
      .attr("dx", 7)
      .attr("dy", 3);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      labels.attr("x", (d) => d.x).attr("y", (d) => d.y);

      const hullData = (filtered.clusters || [])
        .map((cluster) => {
          const points = cluster
            .map((id) => nodes.find((n) => n.id === id))
            .filter(Boolean)
            .map((n) => [n.x, n.y]);
          if (points.length < 3) return null;
          return d3.polygonHull(points);
        })
        .filter(Boolean);

      hullLayer
        .selectAll("path")
        .data(hullData)
        .join("path")
        .attr("d", (d) => `M${d.join("L")}Z`)
        .attr("stroke-width", 1);
    });

    return () => simulation.stop();
  }, [filtered]);

  return (
    <div className="page-grid network-page">
      <div className="surface">
        <div className="surface-head">
          <h2>Network Fraud Graph</h2>
          <span className="tiny muted">Nodes: {filtered.nodes.length} | Edges: {filtered.links.length}</span>
        </div>

        <div className="row">
          <label className="tiny">Min Risk {minRisk}</label>
          <input type="range" min="0" max="100" value={minRisk} onChange={(e) => setMinRisk(Number(e.target.value))} />
          <button type="button" className="btn btn-danger" onClick={rebuildGraph}>REBUILD GRAPH</button>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {edgeTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={`btn ${activeTypes[type] ? "btn-danger" : ""}`}
              onClick={() => setActiveTypes((prev) => ({ ...prev, [type]: !prev[type] }))}
            >
              {type}
            </button>
          ))}
        </div>

        {selected ? (
          <div className="surface" style={{ marginTop: 8 }}>
            <h3>Node Detail</h3>
            <div className="mono">{selected.applicantId} - {selected.label}</div>
            <div className="tiny muted">Department: {selected.department}</div>
            <div className="tiny muted">Risk Tier: {selected.risk}</div>
          </div>
        ) : null}
      </div>

      <div className="surface network-graph-card">
        <div className="network-graph-frame">
          <svg ref={svgRef} style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT }} />
        </div>
      </div>
    </div>
  );
};

export default NetworkGraph;
