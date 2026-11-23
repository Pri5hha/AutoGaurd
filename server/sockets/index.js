const { Server } = require("socket.io");
const { registerLiveAuditRoom } = require("./liveAuditRoom");
const { registerNotificationHub, setIo } = require("./notificationHub");

const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true
    }
  });

  registerLiveAuditRoom(io);
  registerNotificationHub(io);
  setIo(io);

  return io;
};

module.exports = { initSocketServer };
