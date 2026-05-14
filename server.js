require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const socketManager = require("./src/socket/socketManager");

const PORT = process.env.PORT || 5000;

// ── Boot ──────────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();

  const httpServer = http.createServer(app);

  // Attach Socket.IO to the HTTP server
  socketManager.init(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`\n🚀  CRM Server running on port ${PORT}`);
    console.log(`📡  Socket.IO listening on ws://localhost:${PORT}`);
    console.log(`🌍  Environment: ${process.env.NODE_ENV || "development"}\n`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully...");
    httpServer.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  });
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
