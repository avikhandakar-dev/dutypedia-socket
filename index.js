const io = require("socket.io")(8000, {
  cors: {
    origin: "*",
  },
});

//Socket.io
let users = [];

const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) &&
    users.push({ userId, socketId });
};

const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

io.on("connection", (socket) => {
  console.log("user connected", socket.id);

  socket.on("join", (userId) => {
    addUser(userId, socket.id);
    io.emit("getUsers", users);
    console.log("connect", users);
  });
  socket.on("notificationSend", (receiverId) => {
    const user = getUser(receiverId);
    io.to(user?.socketId).emit("notificationReceived");
  });
  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
    const user = getUser(receiverId);
    io.to(user?.socketId).emit("getMessage", {
      senderId,
      message,
    });
  });
  socket.on("newOrder", ({ receiverId, order }) => {
    const user = getUser(receiverId);
    io.to(user?.socketId).emit("getOrder", {
      order,
    });
  });
  socket.on("updateOrder", ({ receiverId, order }) => {
    const user = getUser(receiverId);
    io.to(user?.socketId).emit("updateOrder", {
      order,
    });
  });
  socket.on("disconnect", () => {
    removeUser(socket.id);
    io.emit("getUsers", users);
    console.log("disconnect", users);
  });
});
