const puppeteer = require("puppeteer");
const fs = require("fs");
const mongoose = require("mongoose");
const Applicant = require("../models/Applicant");
const CaseModel = require("../models/Case");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const RISK_DIMENSIONS = [
  ["rankIntegrity", "Rank Integrity"],
  ["documentValidity", "Document Validity"],
  ["timingPattern", "Timing Pattern"],
  ["quotaCompliance", "Quota Compliance"],
  ["scoreConsistency", "Score Consistency"],
  ["overrideHistory", "Override History"],
  ["networkConnections", "Network Connections"],
  ["historicalPattern", "Historical Pattern"]
];

const toRiskScore = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const polarPoint = (cx, cy, radius, angle) => [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];

const buildRiskDnaSvg = (dimensions = {}) => {
  const size = 360;
  const cx = 180;
  const cy = 180;
  const maxRadius = 118;
  const levels = 5;
  const angleStep = (Math.PI * 2) / RISK_DIMENSIONS.length;

  const gridPolygons = Array.from({ length: levels }, (_, i) => {
    const levelRadius = ((i + 1) / levels) * maxRadius;
    const points = RISK_DIMENSIONS.map((_, idx) => {
      const angle = -Math.PI / 2 + idx * angleStep;
      const [x, y] = polarPoint(cx, cy, levelRadius, angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `<polygon points="${points}" fill="none" stroke="#cbd5e1" stroke-width="0.8"/>`;
  }).join("");

  const axisLines = RISK_DIMENSIONS.map((_, idx) => {
    const angle = -Math.PI / 2 + idx * angleStep;
    const [x, y] = polarPoint(cx, cy, maxRadius, angle);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#94a3b8" stroke-width="0.9"/>`;
  }).join("");

  const labelNodes = RISK_DIMENSIONS.map(([, label], idx) => {
    const angle = -Math.PI / 2 + idx * angleStep;
    const [x, y] = polarPoint(cx, cy, maxRadius + 22, angle);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="9.5" fill="#1e293b" text-anchor="middle">${escapeHtml(label)}</text>`;
  }).join("");

  const dnaPoints = RISK_DIMENSIONS.map(([key], idx) => {
    const angle = -Math.PI / 2 + idx * angleStep;
    const radius = (toRiskScore(dimensions[key]) / 100) * maxRadius;
    const [x, y] = polarPoint(cx, cy, radius, angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const markerDots = RISK_DIMENSIONS.map(([key], idx) => {
    const angle = -Math.PI / 2 + idx * angleStep;
    const radius = (toRiskScore(dimensions[key]) / 100) * maxRadius;
    const [x, y] = polarPoint(cx, cy, radius, angle);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.3" fill="#be123c"/>`;
  }).join("");

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Applicant Risk DNA Radar">
      <rect x="0" y="0" width="${size}" height="${size}" fill="#ffffff"/>
      ${gridPolygons}
      ${axisLines}
      <polygon points="${dnaPoints}" fill="rgba(190,18,60,0.18)" stroke="#be123c" stroke-width="1.8"/>
      ${markerDots}
      ${labelNodes}
    </svg>
  `;
};

const reportHtml = ({ applicant, caseData }) => {
  const generatedAt = new Date().toLocaleString("en-IN", { hour12: true });
  const riskDnaSvg = buildRiskDnaSvg(applicant.risk?.dimensions || {});
  const riskRows = RISK_DIMENSIONS.map(
    ([key, label]) => `<tr><td class="label">${escapeHtml(label)}</td><td>${toRiskScore(applicant.risk?.dimensions?.[key])}</td></tr>`
  ).join("");
  const anomaliesRows = (applicant.anomalies || [])
    .map(
      (a, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(a.code)}</td>
        <td>${escapeHtml(a.description)}</td>
        <td>${escapeHtml(a.severityLabel || a.severity || "Medium")}</td>
      </tr>
    `
    )
    .join("");

  return `
  <html>
  <head>
    <style>
      @page { size: A4; margin: 22mm 16mm 20mm 16mm; }
      body {
        font-family: "Times New Roman", Georgia, serif;
        font-size: 11pt;
        line-height: 1.45;
        color: #0b1220;
      }
      .letterhead {
        border-bottom: 2px solid #0b1220;
        margin-bottom: 12px;
        padding-bottom: 6px;
      }
      .org { font-size: 15pt; font-weight: 700; letter-spacing: 0.4px; }
      .sub { font-size: 10pt; margin-top: 2px; }
      .title { text-align: center; margin: 14px 0 12px; font-size: 14pt; font-weight: 700; text-transform: uppercase; }
      .meta-grid { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      .meta-grid td { border: 1px solid #9aa4b2; padding: 6px 8px; vertical-align: top; }
      .label { width: 28%; font-weight: 700; background: #f6f8fb; }
      .section {
        margin-top: 10px;
        border: 1px solid #9aa4b2;
      }
      .risk-dna-section {
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .section h3 {
        margin: 0;
        padding: 6px 8px;
        font-size: 11pt;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        border-bottom: 1px solid #9aa4b2;
        background: #f6f8fb;
      }
      .section-body { padding: 8px; }
      table.grid { width: 100%; border-collapse: collapse; }
      table.grid th, table.grid td {
        border: 1px solid #9aa4b2;
        padding: 6px 7px;
        vertical-align: top;
      }
      table.grid th {
        font-size: 10pt;
        text-transform: uppercase;
        background: #eef2f7;
      }
      .risk-dna-table {
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .risk-dna-table tr {
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .dna-wrap {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .muted { color: #334155; font-size: 10pt; }
      .signature {
        margin-top: 18px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }
      .sign-box { border-top: 1px solid #0b1220; padding-top: 4px; }
    </style>
  </head>
  <body>
    <div class="letterhead">
      <div class="org">AUTOGUARD ADMISSIONS AUDIT CELL</div>
      <div class="sub">Confidential Compliance Document</div>
    </div>

    <div class="title">Admissions Audit Report</div>

    <table class="meta-grid">
      <tr><td class="label">Applicant Name</td><td>${escapeHtml(applicant.fullName)}</td></tr>
      <tr><td class="label">Applicant ID</td><td>${escapeHtml(applicant.applicantId)}</td></tr>
      <tr><td class="label">Case Reference</td><td>${escapeHtml(caseData?.caseCode || "N/A")}</td></tr>
      <tr><td class="label">Generated On</td><td>${escapeHtml(generatedAt)}</td></tr>
    </table>

    <div class="section">
      <h3>Executive Summary</h3>
      <div class="section-body">
        <table class="grid">
          <tr><td class="label">Composite Risk Score</td><td>${escapeHtml(applicant.risk?.finalScore || 0)}</td></tr>
          <tr><td class="label">Applicant Status</td><td>${escapeHtml(applicant.status)}</td></tr>
          <tr><td class="label">Final Verdict</td><td>${escapeHtml(caseData?.finalVerdict?.decision || "Pending")}</td></tr>
        </table>
      </div>
    </div>

    <div class="section risk-dna-section">
      <h3>Applicant Risk DNA</h3>
      <div class="section-body">
        <div class="dna-wrap">${riskDnaSvg}</div>
        <table class="grid risk-dna-table" style="margin-top:8px;">
          ${riskRows}
        </table>
      </div>
    </div>

    <div class="section">
      <h3>Anomaly Findings</h3>
      <div class="section-body">
        <table class="grid">
          <thead>
            <tr>
              <th style="width:7%;">#</th>
              <th style="width:22%;">Code</th>
              <th>Description</th>
              <th style="width:18%;">Severity</th>
            </tr>
          </thead>
          <tbody>
            ${
              anomaliesRows ||
              `<tr><td colspan="4">No anomaly findings were recorded for this applicant.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <h3>Auditor Notes</h3>
      <div class="section-body">
        <div>${escapeHtml(caseData?.finalVerdict?.note || "No final notes submitted.")}</div>
        <div class="muted" style="margin-top:10px;">Prepared by AutoGuard Evidence Engine for compliance review.</div>
      </div>
    </div>

    <div class="signature">
      <div class="sign-box">Prepared By: ____________________</div>
      <div class="sign-box">Authorized Signatory: ____________________</div>
    </div>
  </body>
  </html>
  `;
};

const memoHtml = ({ applicant, caseData }) => {
  const generatedAt = new Date().toLocaleDateString("en-IN");
  return `
  <html>
  <head>
    <style>
      @page { size: A4; margin: 22mm 16mm 20mm 16mm; }
      body {
        font-family: "Times New Roman", Georgia, serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #0b1220;
      }
      .title { text-align:center; font-size: 14pt; font-weight:700; margin-bottom: 4px; text-transform: uppercase; }
      .subtitle { text-align:center; font-size: 10pt; margin-bottom: 14px; }
      .meta { margin-bottom: 10px; }
      .meta div { margin: 2px 0; }
      .box { border: 1px solid #9aa4b2; padding: 10px; margin: 10px 0; }
      .sign { margin-top: 26px; }
    </style>
  </head>
  <body>
    <div class="title">Show-Cause Notice (Draft)</div>
    <div class="subtitle">Issued by AutoGuard Admissions Audit Cell</div>

    <div class="meta">
      <div><strong>Date:</strong> ${escapeHtml(generatedAt)}</div>
      <div><strong>Case Reference:</strong> ${escapeHtml(caseData?.caseCode || "N/A")}</div>
      <div><strong>Applicant ID:</strong> ${escapeHtml(applicant.applicantId)}</div>
      <div><strong>To:</strong> ${escapeHtml(applicant.fullName)}</div>
    </div>

    <div class="box">
      1. You are hereby informed that preliminary audit scrutiny has identified potential irregularities in your admissions record under the above reference.
      <br/><br/>
      2. The observations include the following flagged indicators: ${escapeHtml((applicant.anomalies || []).map((a) => a.code).join(", ") || "None")}.
      <br/><br/>
      3. You are required to submit a written explanation with supporting documentary evidence within seven (7) working days from receipt of this notice.
      <br/><br/>
      4. In the absence of a satisfactory response within the stipulated period, the competent authority may proceed with further regulatory action as per applicable policy.
    </div>

    <div class="sign">
      Authorized Officer<br/>
      AutoGuard Admissions Audit Cell
    </div>
  </body>
  </html>
`;
};

const baseLaunchArgs = [
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-sandbox",
  "--disable-setuid-sandbox"
];

let browserPromise = null;

const launchBrowser = async () => {
  const configuredExecutable = process.env.PUPPETEER_EXECUTABLE_PATH || "";

  if (configuredExecutable && fs.existsSync(configuredExecutable)) {
    try {
      return await puppeteer.launch({
        headless: true,
        executablePath: configuredExecutable,
        args: baseLaunchArgs
      });
    } catch (error) {
      // fall through to default launcher
    }
  }

  return puppeteer.launch({
    headless: true,
    args: baseLaunchArgs
  });
};

const getBrowser = async () => {
  if (!browserPromise) {
    browserPromise = launchBrowser();
    const browser = await browserPromise;
    browser.on("disconnected", () => {
      browserPromise = null;
    });
  }
  return browserPromise;
};

const closeSharedBrowser = async () => {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch (error) {
    // ignore shutdown errors
  } finally {
    browserPromise = null;
  }
};

process.once("SIGINT", closeSharedBrowser);
process.once("SIGTERM", closeSharedBrowser);
process.once("exit", closeSharedBrowser);

const generatePdfFromHtml = async (html) => {
  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    page.setDefaultTimeout(0);

    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith("data:") || url.startsWith("about:") || request.resourceType() === "document") {
        request.continue();
        return;
      }
      request.abort();
    });

    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 0 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" }
    });
    const pdfBuffer = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
    if (!pdfBuffer.length || pdfBuffer.subarray(0, 5).toString("utf8") !== "%PDF-") {
      throw new Error("Generated output is not a valid PDF binary");
    }
    await page.close();
    return pdfBuffer;
  } catch (error) {
    if (page) {
      await page.close().catch(() => {});
    }
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

const normalizeApplicantId = (value) => {
  const raw = String(value || "").trim();
  if (!/^\d+$/.test(raw)) return null;
  return `AG-2026-${raw.padStart(5, "0")}`;
};

const resolveApplicant = async (ref) => {
  const value = String(ref || "").trim();
  if (!value) return null;

  if (mongoose.Types.ObjectId.isValid(value)) {
    const byObjectId = await Applicant.findById(value).lean();
    if (byObjectId) return byObjectId;
  }

  const byApplicantId = await Applicant.findOne({ applicantId: value }).lean();
  if (byApplicantId) return byApplicantId;

  const normalized = normalizeApplicantId(value);
  if (!normalized) return null;

  return Applicant.findOne({ applicantId: normalized }).lean();
};

const applicantReport = async (req, res) => {
  try {
    const applicant = await resolveApplicant(req.params.applicantId);
    if (!applicant) return res.status(404).json({ message: "Applicant not found" });

    const caseData = await CaseModel.findOne({ applicant: applicant._id }).sort({ createdAt: -1 }).lean();
    const pdfBuffer = await generatePdfFromHtml(reportHtml({ applicant, caseData }));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${applicant.applicantId}-audit-report.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("PDF report generation error:", error.message);
    return res.status(500).json({
      message: error.message || "Failed to generate audit PDF",
      hint: "Set PUPPETEER_EXECUTABLE_PATH in server/.env to your Chrome path if needed."
    });
  }
};

const legalMemo = async (req, res) => {
  try {
    const applicant = await resolveApplicant(req.params.applicantId);
    if (!applicant) return res.status(404).json({ message: "Applicant not found" });

    const caseData = await CaseModel.findOne({ applicant: applicant._id }).sort({ createdAt: -1 }).lean();
    const pdfBuffer = await generatePdfFromHtml(memoHtml({ applicant, caseData }));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${applicant.applicantId}-legal-memo.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("PDF legal memo generation error:", error.message);
    return res.status(500).json({
      message: error.message || "Failed to generate legal memo PDF",
      hint: "Set PUPPETEER_EXECUTABLE_PATH in server/.env to your Chrome path if needed."
    });
  }
};

module.exports = {
  applicantReport,
  legalMemo
};
