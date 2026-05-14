const jwt = require("jsonwebtoken");
const User = require("../models/User");

const allowedOrigins = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(",")
  : ["http://localhost:3000"];

let io; // module-level singleton

// ── Initialise Socket.IO on the HTTP server ───────────────────────────────────
const init = (httpServer) => {
  const { Server } = require("socket.io");

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  // ── Auth middleware for sockets ──────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) return next(new Error("Authentication error: no token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user || !user.isActive) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication error: invalid token"));
    }
  });

  io.on("connection", (socket) => {
    // Each user joins their personal room + the broadcast room
    socket.join(`user:${socket.user._id}`);
    socket.join("all_users");

    console.log(
      `🟢  Socket connected — ${socket.user.name} (${socket.user.devID})`,
    );

    socket.on("disconnect", () => {
      console.log(`🔴  Socket disconnected — ${socket.user.name}`);
    });
  });

  return io;
};

// ── Helpers used by controllers ───────────────────────────────────────────────

/** Broadcast to every connected user */
const broadcastToAll = (event, payload) => {
  if (io) io.to("all_users").emit(event, payload);
};

/** Send to a specific user only */
const emitToUser = (userId, event, payload) => {
  if (io) io.to(`user:${userId}`).emit(event, payload);
};

const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialised");
  return io;
};

module.exports = { init, broadcastToAll, emitToUser, getIO };
