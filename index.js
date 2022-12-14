const io = require("socket.io")(8000, {
  cors: {
    origin: "*",
  },
});

//Socket.io
let users = [];
const roomUsers = {};
const socketToRoom = {};

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

  //Join
  socket.on("join", (userId) => {
    addUser(userId, socket.id);
    io.emit("getUsers", users);
    console.log("connect", users);
  });

  //Notifications and message
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

  //Orders
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

  //Call
  socket.on("callUser", ({ receiverId, data }) => {
    const user = getUser(receiverId);
    user?.socketId.forEach((id) => {
      io.to(id).emit("incomingCall", data);
    });
  });
  socket.on("answerCall", ({ userId, data }) => {
    const user = getUser(userId);
    user?.socketId.forEach((id) => {
      io.to(id).emit("callAccepted", data);
    });
  });
  socket.on("endCall", (userId) => {
    const user = getUser(userId);
    user?.socketId.forEach((id) => {
      io.to(id).emit("callEnded");
      //Test
      const roomID = socketToRoom[id];
      let room = roomUsers[roomID];
      if (room) {
        room = room.filter((rId) => rId !== id);
        roomUsers[roomID] = room;
      }
    });
  });
  socket.on("busy", (userId) => {
    const user = getUser(userId);
    user?.socketId.forEach((id) => {
      io.to(id).emit("userBusy");
    });
  });
  socket.on("rejectCall", (userId) => {
    const user = getUser(userId);
    user?.socketId.forEach((id) => {
      io.to(id).emit("callRejected");
    });
  });
  socket.on("switchCam", ({ id, camera }) => {
    io.to(id).emit("switchCamera", camera);
  });

  //Test

  socket.on("join room", (roomID) => {
    if (roomUsers[roomID]) {
      const length = roomUsers[roomID].length;
      if (length === 4) {
        socket.emit("room full");
        return;
      }
      roomUsers[roomID].push(socket.id);
    } else {
      roomUsers[roomID] = [socket.id];
    }
    socketToRoom[socket.id] = roomID;
    const usersInThisRoom = roomUsers[roomID].filter((id) => id !== socket.id);

    socket.emit("all users", usersInThisRoom);
  });

  socket.on("sending signal", (payload) => {
    io.to(payload.userToSignal).emit("user joined", {
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });

  socket.on("returning signal", (payload) => {
    io.to(payload.callerID).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  //Disconnect
  socket.on("disconnect", () => {
    const roomID = socketToRoom[socket.id];
    let room = roomUsers[roomID];
    if (room) {
      room = room.filter((id) => id !== socket.id);
      roomUsers[roomID] = room;
    }

    removeUser(socket.id);
    io.emit("getUsers", users);
    console.log("disconnect", users);
  });
});
