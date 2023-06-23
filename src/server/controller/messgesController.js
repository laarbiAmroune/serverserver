const Message = require("../db/Schema/messages");

const addmessage = async (req, res) => {
  const sender = req.query.idU;
  console.log(req.body);

  const content = req.body.message;
  console.log("iduser", sender, "content", req.body.message);
  try {
    // Create a new message
    const message = new Message({
      sender,
      content,
    });

    // Save the message to the database
    await message.save();

    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send message" });
  }
};
const getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find().populate("sender");

    res.status(200).json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get messages" });
  }
};

module.exports = { addmessage, getAllMessages };
