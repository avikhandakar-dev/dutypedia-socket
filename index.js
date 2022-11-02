const io = require("socket.io")(8000, {
  cors: {
    origin: "*",
  },
});

//Socket.io
let users = [];

const removeUser = (socketId) => {
  users.forEach((element, index) => {
    if (element.socketId?.includes(socketId)) {
      if (users[index].socketId?.length > 1) {
        const tmpSocketIds = users[index].socketId?.filter(
          (s) => s !== socketId
        );
        return (users[index].socketId = tmpSocketIds);
      } else {
        return (users = users.filter(
          (user) => !user.socketId?.includes(socketId)
        ));
      }
    }
  });
};

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

const addUser = (userId, socketId) => {
  if (users.some((user) => user.socketId?.includes(socketId))) {
    return;
  }
  if (users.some((user) => user.userId === userId)) {
    users.forEach((element, index) => {
      if (element.userId === userId) {
        users[index].socketId.push(socketId);
      }
    });
  } else {
    users.push({ userId, socketId: [socketId] });
  }
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
    user?.socketId.forEach((id) => {
      io.to(id).emit("notificationReceived");
    });
  });
  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
    const user = getUser(receiverId);
    user?.socketId.forEach((id) => {
      io.to(id).emit("getMessage", {
        senderId,
        message,
      });
    });
  });
  socket.on("newOrder", ({ receiverId, order }) => {
    const user = getUser(receiverId);
    user?.socketId.forEach((id) => {
      io.to(id).emit("getOrder", {
        order,
      });
    });
  });
  socket.on("updateOrder", ({ receiverId, order }) => {
    const user = getUser(receiverId);
    user?.socketId.forEach((id) => {
      io.to(id).emit("updateOrder", {
        order,
      });
    });
  });
  socket.on("disconnect", () => {
    removeUser(socket.id);
    io.emit("getUsers", users);
    console.log("disconnect", users);
  });
});
