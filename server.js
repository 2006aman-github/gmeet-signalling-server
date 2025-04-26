const fs = require("fs");
const https = require("https");
const http = require("http");
const express = require("express");
const app = express();
const socketio = require("socket.io");
const port = 8181;
const key = fs.readFileSync("cert.key", "utf-8");
const cert = fs.readFileSync("cert.crt", "utf-8");
const cors = require("cors");
const { randomStr, checkName, checkRoomId } = require("./utils");
app.use(
  cors({
    origin: "*",
    // origin: [
    //   "http://localhost:5173",
    //   "http://192.168.29.177:5173/",
    //   process.env.FRONTEND_URI,
    // ],
  })
);

app.get("/test", (req, res) => {
  res.send({ message: "hey" });
});

const connectedSockets = [];

const meets = [
  {
    meetId: "",
    offer: {},
    offerIceCandidates: [],
    answererUserName: null,
    answer: null,
    answererIceCandidates: [],
  },
];

// const expressServer = https.createServer({ key, cert }, app); //
const expressServer = http.createServer(app); //
// create our socket.io server... it will listen to our express port
const io = socketio(expressServer, {
  cors: {
    origin: "*",
    // origin: [
    //   "http://192.168.29.177:5173/", //if using a phone or another computer
    //   "http://localhost:5173",
    //   //process.env.FRONTEND_URI,
    // ],
    methods: ["GET", "POST"],
  },
});
const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();

const checkJoinDetails = (name, room) => {
  if (checkName(name) && checkRoomId(room)) {
    return true;
  } else {
    return false;
  }
};

io.on("connection", (socket) => {
  // console.log(`user connected ${socket.id}`);
  let roomId;
  socket.on("room:create", (data) => {
    const { name, room } = data;

    // name must be above 3 and room id exactly equal to 10 chars
    if (!checkJoinDetails(name, room)) {
      io.to(socket.id).emit("error:message", {
        message:
          "name and room ID length shall not be less than 3 and 10 chars respectively.",
      });
    } else if (socket.rooms.has(roomId)) {
      io.to(socket.id).emit("error:message", {
        message: "room already exists with this ID",
      });
    } else {
      socket.join(room);
      io.to(socket.id).emit("room:join", data);
    }
  });
  socket.on("room:join", (data) => {
    const { name, room } = data;
    roomId = room;
    console.log("yoo somebody wants to join " + room + " room  => ", socket.id);
    emailToSocketIdMap.set(name, socket.id);
    socketidToEmailMap.set(socket.id, name);
    // if (!io.socket.adapter.rooms.has(room)) {
    //   io.to(socket.id).emit("room:notfound", { message: "Room Not found" });
    // }

    if (!checkJoinDetails(name, room)) {
      io.to(socket.id).emit("error:message", {
        message:
          "name and room ID length shall not be less than 3 and 10 chars respectively.",
      });
    }

    // check if its rejoining
    else if (socket.rooms.has(roomId)) {
      console.log("already in this room");
      //
    } else {
      io.to(room).emit("user:joined", { name, id: socket.id });
      socket.join(room);
      io.to(socket.id).emit("room:join", data);
    }
  });

  // incoming call
  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incoming:call", { from: socket.id, offer });
  });

  socket.on("caller:join:complete", ({ to, name }) => {
    io.to(to).emit("caller:join:complete", { id: socket.id, name });
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    // console.log(to);
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });
  socket.on("peer:nego:done", ({ to, ans }) => {
    // console.log("peer:nego:done", ans);
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });
  socket.on("ask:for:stream", ({ to }) => {
    io.to(to).emit("send:stream");
  });

  // changes in video visibility
  socket.on("my:video:stopped", ({ to }) => {
    io.to(to).emit("remote:video:stopped", { from: socket.id });
  });
  socket.on("my:video:restarted", ({ to }) => {
    io.to(to).emit("remote:video:restarted", { from: socket.id });
  });

  // changes in audio
  socket.on("my:audio:stopped", ({ to }) => {
    io.to(to).emit("remote:audio:stopped", { from: socket.id });
  });
  socket.on("my:audio:restarted", ({ to }) => {
    io.to(to).emit("remote:audio:restarted", { from: socket.id });
  });

  // disconnection

  socket.on("room:leave", ({ roomId }) => {
    socket.leave(roomId);
    io.to(socket.id).emit("room:left");

    // console.log(roomId);
    io.to(roomId).emit("user:left", this.id + "left");
  });

  socket.on("disconnecting", function () {
    io.to(roomId).emit("user:left", this.id + "left");
  });
});

expressServer.listen(port, () => console.log("listening on: ", port));
