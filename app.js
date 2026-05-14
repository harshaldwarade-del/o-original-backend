const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const contactRoutes = require("./routes/contacts");
const prospectRoutes = require("./routes/prospects");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// ── Core Middleware ────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Health Check ───────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res
    .status(200)
    .json({ success: true, message: "Server is up and running 🚀" });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/prospects", prospectRoutes);

// ── 404 Handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global Error Handler (must be last) ───────────────────────────────────────
app.use(errorHandler);

module.exports = app;
