const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const http = require("http");
const cookieParser = require("cookie-parser");

const { connectDb } = require("./config/db");
const { apiLimiter } = require("./middleware/rateLimiter");
const { sessionLogger } = require("./middleware/sessionLogger");
const { errorHandler } = require("./middleware/errorHandler");
const { initSocketServer } = require("./sockets");

dotenv.config();

const app = express();
const server = http.createServer(app);

initSocketServer(server);

const configuredOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const isLocalDevOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin || "");

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (no Origin header) and common local dev hosts.
      if (!origin || configuredOrigins.includes(origin) || isLocalDevOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Blocked by CORS policy"));
    },
    credentials: true
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());
app.use(apiLimiter);
app.use(sessionLogger);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "autogaurd-server", timestamp: new Date().toISOString() });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/applicants", require("./routes/applicants"));
app.use("/api/audits", require("./routes/audits"));
app.use("/api/alerts", require("./routes/alerts"));
app.use("/api/cases", require("./routes/cases"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/ml", require("./routes/ml"));
app.use("/api/documents", require("./routes/documents"));
app.use("/api/tips", require("./routes/tips"));
app.use("/api/query-logs", require("./routes/queryLogs"));

app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);

const start = async () => {
  await connectDb();
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on ${PORT}`);
  });
};

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Startup failed", error);
  process.exit(1);
});

module.exports = { app, server };
