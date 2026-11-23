let ioRef = null;

const setIo = (io) => {
  ioRef = io;
};

const emitAlert = (alert) => {
  if (!ioRef) return;
  ioRef.emit("alert:new", alert);
};

const registerNotificationHub = (io) => {
  io.on("connection", (socket) => {
    socket.on("subscribe_department", (department) => {
      socket.join(`dept:${department}`);
    });
  });
};

module.exports = {
  setIo,
  emitAlert,
  registerNotificationHub
};
