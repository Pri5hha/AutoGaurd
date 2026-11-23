const CaseModel = require("../models/Case");

const registerLiveAuditRoom = (io) => {
  io.on("connection", (socket) => {
    socket.on("join_case", ({ caseId, user }) => {
      socket.join(`case:${caseId}`);
      socket.data.caseId = caseId;
      socket.data.user = user;

      io.to(`case:${caseId}`).emit("presence", {
        type: "joined",
        user,
        socketId: socket.id,
        at: new Date().toISOString()
      });
    });

    socket.on("cursor_move", ({ caseId, section, x, y, user }) => {
      socket.to(`case:${caseId}`).emit("cursor_move", {
        user,
        section,
        x,
        y,
        at: new Date().toISOString()
      });
    });

    socket.on("comment_posted", async ({ caseId, body, mentions = [], authorId }) => {
      const item = await CaseModel.findById(caseId);
      if (!item) return;

      const actor = socket.data.user || {};
      const finalAuthorId = actor.id || authorId;
      if (!finalAuthorId || !body?.trim()) return;

      item.comments.push({ author: finalAuthorId, body: body.trim(), mentions });
      await item.save();
      const created = item.comments[item.comments.length - 1];

      io.to(`case:${caseId}`).emit("comment_posted", {
        commentId: created?._id?.toString?.(),
        body: created?.body || body,
        mentions,
        authorId: finalAuthorId,
        authorName: actor.name || null,
        authorRole: actor.role || null,
        at: created?.createdAt ? new Date(created.createdAt).toISOString() : new Date().toISOString()
      });
    });

    socket.on("vote_cast", ({ caseId, decision, note, voterId }) => {
      const actor = socket.data.user || {};
      io.to(`case:${caseId}`).emit("vote_cast", {
        decision,
        note,
        voterId: actor.id || voterId,
        voterName: actor.name || null,
        at: new Date().toISOString()
      });
    });

    socket.on("disconnect", () => {
      if (socket.data.caseId) {
        io.to(`case:${socket.data.caseId}`).emit("presence", {
          type: "left",
          user: socket.data.user,
          socketId: socket.id,
          at: new Date().toISOString()
        });
      }
    });
  });
};

module.exports = { registerLiveAuditRoom };
