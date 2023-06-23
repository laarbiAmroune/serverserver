const express = require("express");
const mongoose = require("mongoose");
const router = require("./src/server/api/router.js");
const bodyParser = require("body-parser");
const cors = require("cors");
const admin = require("firebase-admin");
var cookieParser = require("cookie-parser");
const fs = require("fs");
const nodemailer = require("nodemailer");

// Specify the directory path
const directory = "./public";

const app = express();

const http = require("http");
const server = http.createServer(app);

const io = require("socket.io")(server);
//const { Server } = require("socket.io");

//const io = new Server({ cors :{origin:"http://192.168.161.192:5000"}});

// Collection to store connected users
const connectedUsers = {};
const pendingNotifications = {};

io.on("connection", (socket) => {
  console.log("A user connected.");

  socket.on("join", (userId) => {
    // Add the user to the connected users collection
    connectedUsers[userId] = socket.id;
    console.log("Joined user ID:", userId);
    console.log(connectedUsers);

    // Check if there is a pending notification for the receiver
    const pendingNotification = pendingNotifications[userId];
    if (pendingNotification) {
      console.log("Pending notification found for user:", userId);
      console.log("Sending pending notification:", pendingNotification);

      // Send the pending notification to the receiver
      io.to(socket.id).emit("notification", pendingNotification);

      // Remove the pending notification from the storage
      delete pendingNotifications[userId];
    }
  });

  socket.on("notification", (notification) => {
    // Handle the notification on the server
    const { senderId, receiverId, message } = notification;
    // Perform your desired actions with the notification data
    console.log(
      `Received notification from ${senderId} to ${receiverId}: ${message}`
    );

    // Check if the receiver is connected
    const receiverSocketId = connectedUsers[receiverId];
    if (receiverSocketId) {
      console.log("Receiver is connected");
      console.log("Receiver Socket ID:", receiverSocketId);
      console.log("destinataire trouver");
      // Send the notification to the receiver
      io.to(receiverSocketId).emit("notification", notification);
    } else {
      console.log(
        "Receiver is not connected. Storing the notification for later."
      );
      // Store the notification for the receiver
      pendingNotifications[receiverId] = notification;
    }
  });

  /*socket.on('notification', ({ userId, message }) => {
    // Get the socket ID of the targeted user
    const targetSocketId = connectedUsers[userId];

    // Send the notification to the targeted user
    if (targetSocketId) {
      io.to(targetSocketId).emit('notification', message);
    }
  });*/

  socket.on("disconnect", () => {
    // Remove the disconnected user from the connected users collection
    const userId = Object.keys(connectedUsers).find(
      (key) => connectedUsers[key] === socket.id
    );
    if (userId) {
      delete connectedUsers[userId];
    }
    console.log("A user disconnected.");
  });
});

app.use(cookieParser());

app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));

// Check if the directory exists
if (!fs.existsSync(directory)) {
  // If not, create the directory
  fs.mkdirSync(directory);
}

app.use(express.static("uploads"));
app.use(express.static("public"));
app.use(express.json());
mongoose.set("strictQuery", false);

const mongoDB = "mongodb://0.0.0.0:27017/ELMida";

main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect(mongoDB).then(() => console.log("db connected"));
}

app.use(router);
/*
app.listen(3000, () => {
  console.log("Server is running at port 3000");
});*/
server.listen(5000, () => {
  console.log("ServerIO is running at port 5000");
});
