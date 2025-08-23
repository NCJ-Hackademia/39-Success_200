import ChatRoom from "../models/ChatRoom.js";
import Message from "../models/Message.js";
import Booking from "../models/Booking.js";
import Proposal from "../models/Proposal.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import multer from "multer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = join(__dirname, "../../uploads/chat");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname +
        "-" +
        uniqueSuffix +
        "." +
        file.originalname.split(".").pop()
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images and documents are allowed"));
    }
  },
});

// Get or create chat room for a booking
export const getOrCreateChatRoom = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Verify booking exists and user has access
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if user is part of this booking
    if (
      booking.consumer.toString() !== req.user.id &&
      booking.provider.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check if chat room already exists
    let chatRoom = await ChatRoom.findOne({ bookingId })
      .populate("participants", "name email role")
      .populate("lastMessage");

    if (!chatRoom) {
      // Create new chat room
      chatRoom = new ChatRoom({
        bookingId,
        participants: [booking.consumer, booking.provider],
        negotiationData: {
          originalPrice: booking.originalAmount || booking.totalAmount,
          currentOffer: booking.totalAmount,
          counterOffers: [],
        },
      });

      await chatRoom.save();

      // Update booking with chat room ID
      await Booking.findByIdAndUpdate(bookingId, { chatRoomId: chatRoom._id });

      // Populate the participants
      chatRoom = await ChatRoom.findById(chatRoom._id)
        .populate("participants", "name email role")
        .populate("lastMessage");
    }

    res.status(200).json({
      success: true,
      data: chatRoom,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get messages for a chat room
export const getChatMessages = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify chat room exists and user has access
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "Chat room not found" });
    }

    if (!chatRoom.participants.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({ chatRoomId })
      .populate("senderId", "name email role")
      .populate("replyTo", "content.text senderId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Mark messages as read by current user
    await Message.updateMany(
      {
        chatRoomId,
        senderId: { $ne: req.user.id },
        "readBy.userId": { $ne: req.user.id },
      },
      {
        $push: {
          readBy: {
            userId: req.user.id,
            readAt: new Date(),
          },
        },
      }
    );

    // Update unread count in chat room
    const unreadCount = { ...chatRoom.unreadCount };
    unreadCount[req.user.id] = 0;
    await ChatRoom.findByIdAndUpdate(chatRoomId, { unreadCount });

    res.status(200).json({
      success: true,
      data: messages.reverse(), // Return in chronological order
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const { messageType, content } = req.body;

    // Verify chat room exists and user has access
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "Chat room not found" });
    }

    if (!chatRoom.participants.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Create message
    const message = new Message({
      chatRoomId,
      senderId: req.user.id,
      messageType: messageType || "text",
      content: content,
    });

    await message.save();

    // Update chat room's last message and unread counts
    const unreadCount = { ...chatRoom.unreadCount };
    chatRoom.participants.forEach((participantId) => {
      if (participantId.toString() !== req.user.id) {
        unreadCount[participantId] = (unreadCount[participantId] || 0) + 1;
      }
    });

    await ChatRoom.findByIdAndUpdate(chatRoomId, {
      lastMessage: message._id,
      unreadCount,
    });

    // Populate sender info
    await message.populate("senderId", "name email role");

    // TODO: Emit real-time event to other participants
    // io.to(chatRoomId).emit('new_message', message);

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Send price offer
export const sendPriceOffer = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const { amount, description, validUntil } = req.body;

    // Verify chat room and access
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "Chat room not found" });
    }

    if (!chatRoom.participants.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Create price offer message
    const message = new Message({
      chatRoomId,
      senderId: req.user.id,
      messageType: "price_offer",
      content: {
        priceOffer: {
          amount: parseFloat(amount),
          description: description || "",
          validUntil: validUntil
            ? new Date(validUntil)
            : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
        },
      },
    });

    await message.save();

    // Update negotiation data in chat room
    chatRoom.negotiationData.counterOffers.push({
      offeredBy: req.user.id,
      amount: parseFloat(amount),
      message: description || "",
      timestamp: new Date(),
      status: "pending",
    });

    chatRoom.negotiationData.currentOffer = parseFloat(amount);
    await chatRoom.save();

    // Update chat room's last message
    await ChatRoom.findByIdAndUpdate(chatRoomId, {
      lastMessage: message._id,
    });

    await message.populate("senderId", "name email role");

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Accept/Reject price offer
export const respondToPriceOffer = async (req, res) => {
  try {
    const { chatRoomId, messageId } = req.params;
    const { action, message: responseMessage } = req.body; // action: 'accept' or 'reject'

    // Verify access
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom || !chatRoom.participants.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Find the price offer message
    const priceOfferMessage = await Message.findById(messageId);
    if (!priceOfferMessage || priceOfferMessage.messageType !== "price_offer") {
      return res.status(404).json({ message: "Price offer not found" });
    }

    // Update the offer status in negotiation data
    const offerIndex = chatRoom.negotiationData.counterOffers.findIndex(
      (offer) =>
        offer.timestamp.getTime() === priceOfferMessage.createdAt.getTime()
    );

    if (offerIndex !== -1) {
      chatRoom.negotiationData.counterOffers[offerIndex].status =
        action === "accept" ? "accepted" : "rejected";

      if (action === "accept") {
        chatRoom.negotiationData.agreedPrice =
          chatRoom.negotiationData.counterOffers[offerIndex].amount;
        chatRoom.negotiationData.priceNegotiated = true;

        // Update booking with negotiated price
        await Booking.findByIdAndUpdate(chatRoom.bookingId, {
          negotiatedAmount: chatRoom.negotiationData.agreedPrice,
          totalAmount: chatRoom.negotiationData.agreedPrice,
          status: "confirmed",
          "negotiationData.isNegotiated": true,
        });
      }

      await chatRoom.save();
    }

    // Send response message
    const responseMsg = new Message({
      chatRoomId,
      senderId: req.user.id,
      messageType: "system",
      content: {
        text: `Price offer ${action}ed. ${responseMessage || ""}`,
      },
      replyTo: messageId,
    });

    await responseMsg.save();

    await ChatRoom.findByIdAndUpdate(chatRoomId, {
      lastMessage: responseMsg._id,
    });

    await responseMsg.populate("senderId", "name email role");

    res.status(200).json({
      success: true,
      data: responseMsg,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Upload file to chat
export const uploadChatFile = [
  upload.single("file"),
  async (req, res) => {
    try {
      const { chatRoomId } = req.params;
      const { description } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Verify chat room access
      const chatRoom = await ChatRoom.findById(chatRoomId);
      if (!chatRoom || !chatRoom.participants.includes(req.user.id)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Determine file type
      const fileType = req.file.mimetype.startsWith("image/")
        ? "image"
        : "document";

      // Create message with file attachment
      const message = new Message({
        chatRoomId,
        senderId: req.user.id,
        messageType: fileType,
        content: {
          text: description || "",
          attachments: [
            {
              type: fileType,
              url: `/uploads/chat/${req.file.filename}`,
              filename: req.file.originalname,
              size: req.file.size,
            },
          ],
        },
      });

      await message.save();

      // Update chat room
      await ChatRoom.findByIdAndUpdate(chatRoomId, {
        lastMessage: message._id,
      });

      await message.populate("senderId", "name email role");

      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },
];

// Send schedule modification request
export const sendScheduleModification = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const { proposedDate, proposedTime, reason } = req.body;

    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom || !chatRoom.participants.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const message = new Message({
      chatRoomId,
      senderId: req.user.id,
      messageType: "schedule_modification",
      content: {
        scheduleModification: {
          proposedDate: new Date(proposedDate),
          proposedTime,
          reason: reason || "",
        },
      },
    });

    await message.save();

    await ChatRoom.findByIdAndUpdate(chatRoomId, {
      lastMessage: message._id,
    });

    await message.populate("senderId", "name email role");

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get user's chat rooms
export const getUserChatRooms = async (req, res) => {
  try {
    const chatRooms = await ChatRoom.find({
      participants: req.user.id,
      isActive: true,
    })
      .populate("participants", "name email role")
      .populate("lastMessage")
      .populate({
        path: "bookingId",
        populate: {
          path: "service",
          select: "name description",
        },
      })
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: chatRooms,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
