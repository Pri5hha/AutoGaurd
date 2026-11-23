import { useState } from "react";
import api from "../services/api";

const parseBlobError = async (payload) => {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  if (payload instanceof Blob) {
    const text = await payload.text();
    try {
      const parsed = JSON.parse(text);
      return parsed.message || text;
    } catch (e) {
      return text;
    }
  }
  return payload.message || "";
};

const extractFilename = (contentDisposition, fallback) => {
  const source = contentDisposition || "";
  const match = source.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (!match) return fallback;
  return decodeURIComponent(match[1]);
};

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
};

const isPdfBlob = async (blob) => {
  if (!(blob instanceof Blob) || blob.size < 8) return false;
  const headerBuffer = await blob.slice(0, 5).arrayBuffer();
  const header = new TextDecoder("utf-8").decode(headerBuffer);
  return header === "%PDF-";
};

const Reports = () => {
  const [applicantRef, setApplicantRef] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("low");
  const [loading, setLoading] = useState(false);

  const openPdf = async (type) => {
    if (loading) return;
    if (!applicantRef.trim()) {
      setMessageTone("medium");
      setMessage("Enter an applicant number (example: 489).");
      return;
    }

    try {
      setLoading(true);
      setMessageTone("low");
      setMessage("Generating PDF...");
      const endpoint = type === "memo"
        ? `/documents/legal-memo/${encodeURIComponent(applicantRef.trim())}`
        : `/documents/report/${encodeURIComponent(applicantRef.trim())}`;
      const response = await api.get(endpoint, { responseType: "blob" });
      const contentType = String(response.headers["content-type"] || "");
      const blob = response.data;
      const validPdf = await isPdfBlob(blob);
      if (!contentType.includes("application/pdf") || !validPdf) {
        const serverMessage = await parseBlobError(blob);
        setMessageTone("high");
        setMessage(serverMessage || "Server returned an invalid PDF file.");
        return;
      }
      const fallbackName = type === "memo" ? `autogaurd-legal-memo-${applicantRef.trim()}.pdf` : `autogaurd-audit-report-${applicantRef.trim()}.pdf`;
      const filename = extractFilename(response.headers["content-disposition"], fallbackName);
      triggerDownload(blob, filename);
      setMessageTone("low");
      setMessage(`${type === "memo" ? "Legal memo" : "Audit report"} downloaded.`);
    } catch (err) {
      const status = err.response?.status;
      const serverMessage = await parseBlobError(err.response?.data);
      if (status === 403) {
        setMessageTone("high");
        setMessage(serverMessage || "You do not have permission for this PDF type.");
        return;
      }
      if (status === 404) {
        setMessageTone("medium");
        setMessage(serverMessage || "Applicant not found. Try a valid applicant number, e.g. 489.");
        return;
      }
      setMessageTone("high");
      setMessage(serverMessage || "PDF generation failed. Check server logs and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-grid">
      <div className="surface">
        <div className="surface-head">
          <h2>Reports</h2>
        </div>
        <div className="row">
          <input
            value={applicantRef}
            onChange={(e) => setApplicantRef(e.target.value)}
            placeholder="Applicant Number (e.g., 489)"
          />
          <button className="btn" type="button" disabled={loading} onClick={() => openPdf("report")}>
            {loading ? "GENERATING..." : "GENERATE AUDIT PDF"}
          </button>
          <button className="btn btn-danger" type="button" disabled={loading} onClick={() => openPdf("memo")}>
            {loading ? "GENERATING..." : "SHOW-CAUSE MEMO"}
          </button>
        </div>
        <p className="tiny muted">Enter applicant number and generate your report instantly.</p>
        {message ? <div className={`badge ${messageTone}`}>{message}</div> : null}
      </div>
    </div>
  );
};

export default Reports;
