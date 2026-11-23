const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    // Log only the minimum needed to trace the issue — no stack traces in production logs
    // eslint-disable-next-line no-console
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${status}: ${err.message}`);
  } else {
    // Full stack in development
    // eslint-disable-next-line no-console
    console.error(err);
  }

  // Never expose internal details (stack, DB errors, file paths) to the client in production
  const message = isProd && status >= 500 ? "Internal server error" : (err.message || "Internal server error");
  res.status(status).json({ message });
};

module.exports = { errorHandler };
