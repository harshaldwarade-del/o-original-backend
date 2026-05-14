require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const CLIENT_ORIGINS = process.env.CLIENT_ORIGINS?.split(",").map((origin) =>
  origin.trim().replace(/\/$/, ""),
);

// ── HTTP + Socket.io setup ─────────────────────────────────────────────────────
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

// Make io accessible inside controllers via app.get("io")
app.set("io", io);

// ── Socket.io Events ───────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Client can join a room based on devID for targeted messaging (optional)
  socket.on("join:user", (devID) => {
    socket.join(`user:${devID}`);
    console.log(`   → ${devID} joined their personal room`);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

/*
  Events emitted by the server (listen to these on the frontend):

  "prospect:new"     – when any user marks a contact as a prospect
  "prospect:updated" – when a prospect's details change
  "prospect:removed" – when a contact is un-marked as a prospect
  "prospect:remark"  – when a remark is added to any prospect

  Each payload contains: { message, actor (devID/name), relevant data }
*/

// ── Bootstrap ──────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();

  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`,
    );
    console.log(`📡 Socket.io ready for real-time connections`);
  });
};

start();
