const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const Property = require('../models/Property');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all chats for a user
// @route   GET /api/v1/chats
// @access  Private
exports.getChats = asyncHandler(async (req, res, next) => {
  try {
    console.log('Fetching chats for user:', req.user.id);
    
    const chats = await Chat.find({ participants: req.user.id })
      .populate('participants', 'name email')
      .populate('property', 'title owner')
      .sort({ updatedAt: -1 });

    // Add unread message count for each chat and role information
    const chatsWithDetails = await Promise.all(chats.map(async (chat) => {
      // Count unread messages for this user in this chat
      const unreadCount = await Message.countDocuments({
        chat: chat._id,
        recipient: req.user.id,
        isRead: false
      });
      
      // Identify the other participant
      const otherParticipant = chat.participants.find(
        participant => participant._id.toString() !== req.user.id.toString()
      );
      
      // Determine if the other participant is the property owner
      let isOtherParticipantOwner = false;
      if (chat.property && chat.property.owner) {
        isOtherParticipantOwner = otherParticipant && otherParticipant._id.toString() === chat.property.owner.toString();
      }
      
      return {
        ...chat.toObject(),
        unreadCount,
        otherParticipant: otherParticipant ? {
          ...otherParticipant.toObject(),
          isOwner: isOtherParticipantOwner
        } : null
      };
    }));

    res.status(200).json({
      success: true,
      count: chatsWithDetails.length,
      data: chatsWithDetails
    });
  } catch (error) {
    console.error('Error in getChats:', error);
    return next(new ErrorResponse('Failed to fetch chats', 500));
  }
});

// @desc    Get single chat with messages
// @route   GET /api/v1/chats/:id
// @access  Private
exports.getChat = asyncHandler(async (req, res, next) => {
  try {
    console.log('Fetching chat:', req.params.id, 'for user:', req.user.id);
    
    const chat = await Chat.findById(req.params.id)
      .populate('participants', 'name email')
      .populate('property', 'title owner');

    if (!chat) {
      console.log('Chat not found:', req.params.id);
      return next(
        new ErrorResponse(`No chat found with id of ${req.params.id}`, 404)
      );
    }

    // Check if user is participant of the chat
    const isParticipant = chat.participants.some(participant => participant._id.toString() === req.user.id.toString());
    if (!isParticipant) {
      console.log('User not authorized for chat:', req.user.id, req.params.id);
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to access this chat`,
          401
        )
      );
    }

    // Get messages for this chat with pagination to prevent overload
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;
    
    const messages = await Message.find({ chat: req.params.id })
      .populate('sender', 'name')
      .populate('recipient', 'name')
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(startIndex)
      .limit(limit);

    console.log('Found messages:', messages.length);

    // Mark messages as read
    const markedRead = await Message.updateMany(
      { chat: req.params.id, recipient: req.user.id, isRead: false },
      { isRead: true }
    );
    console.log('Marked messages as read:', markedRead.modifiedCount);

    // Identify the other participant
    const otherParticipant = chat.participants.find(
      participant => participant._id.toString() !== req.user.id.toString()
    );
    
    // Determine if the other participant is the property owner
    let isOtherParticipantOwner = false;
    if (chat.property && chat.property.owner) {
      isOtherParticipantOwner = otherParticipant && otherParticipant._id.toString() === chat.property.owner.toString();
    }

    const chatData = {
      ...chat.toObject(),
      otherParticipant: otherParticipant ? {
        ...otherParticipant.toObject(),
        isOwner: isOtherParticipantOwner
      } : null
    };

    console.log('Returning chat data:', {
      chatId: chat._id,
      participants: chat.participants.length,
      messages: messages.length
    });

    res.status(200).json({
      success: true,
      data: {
        chat: chatData,
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: {
          page,
          limit,
          total: await Message.countDocuments({ chat: req.params.id })
        }
      }
    });
  } catch (error) {
    console.error('Error in getChat:', error);
    return next(new ErrorResponse('Failed to fetch chat', 500));
  }
});

// @desc    Create or get existing chat between two users for a property
// @route   POST /api/v1/chats
// @access  Private
exports.createChat = asyncHandler(async (req, res, next) => {
  try {
    const { recipientId, propertyId } = req.body;
    
    console.log('Creating chat with:', { userId: req.user.id, recipientId, propertyId });

    // Validate required fields
    if (!recipientId || !propertyId) {
      return next(new ErrorResponse('Recipient ID and Property ID are required', 400));
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      console.log('Recipient not found:', recipientId);
      return next(new ErrorResponse('Recipient not found', 404));
    }

    // Check if property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      console.log('Property not found:', propertyId);
      return next(new ErrorResponse('Property not found', 404));
    }

    // Check if chat already exists between these users for this property
    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, recipientId] },
      property: propertyId
    });

    if (!chat) {
      console.log('Creating new chat');
      // Create new chat
      chat = await Chat.create({
        participants: [req.user.id, recipientId],
        property: propertyId
      });
    } else {
      console.log('Found existing chat:', chat._id);
    }

    // Populate chat with participant and property details
    await chat.populate('participants', 'name email');
    await chat.populate('property', 'title owner');

    // Identify the other participant
    const otherParticipant = chat.participants.find(
      participant => participant._id.toString() !== req.user.id.toString()
    );
    
    // Determine if the other participant is the property owner
    let isOtherParticipantOwner = false;
    if (chat.property && chat.property.owner) {
      isOtherParticipantOwner = otherParticipant && otherParticipant._id.toString() === chat.property.owner.toString();
    }

    res.status(201).json({
      success: true,
      data: {
        ...chat.toObject(),
        otherParticipant: otherParticipant ? {
          ...otherParticipant.toObject(),
          isOwner: isOtherParticipantOwner
        } : null
      }
    });
  } catch (error) {
    console.error('Error in createChat:', error);
    return next(new ErrorResponse('Failed to create chat', 500));
  }
});

// @desc    Send a message in a chat
// @route   POST /api/v1/chats/:id/messages
// @access  Private
exports.sendMessage = asyncHandler(async (req, res, next) => {
  try {
    const { content } = req.body;

    // Check if chat exists
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return next(new ErrorResponse('Chat not found', 404));
    }

    // Check if user is participant of the chat
    if (!chat.participants.some(participant => participant._id.toString() === req.user.id.toString())) {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to send messages in this chat`,
          401
        )
      );
    }

    // Determine recipient (the other participant)
    const recipient = chat.participants.find(
      participant => participant._id.toString() !== req.user.id.toString()
    );

    // Create message
    const message = await Message.create({
      chat: req.params.id,
      sender: req.user.id,
      recipient: recipient._id,
      content
    });

    // Populate message with sender and recipient details
    await message.populate('sender', 'name');
    await message.populate('recipient', 'name');

    // Update chat's updatedAt timestamp
    chat.updatedAt = Date.now();
    await chat.save();

    // Emit message to socket.io rooms
    const io = req.app.get('io');
    if (io) {
      // Emit message to recipient
      io.to(recipient._id.toString()).emit('receive_message', {
        _id: message._id.toString(),
        sender: {
          _id: message.sender._id.toString(),
          name: message.sender.name
        },
        recipient: {
          _id: recipient._id.toString(),
          name: recipient.name
        },
        content: message.content,
        timestamp: message.createdAt,
        createdAt: message.createdAt
      });
      
      // Emit message to sender (for confirmation)
      io.to(req.user.id.toString()).emit('receive_message', {
        _id: message._id.toString(),
        sender: {
          _id: message.sender._id.toString(),
          name: message.sender.name
        },
        recipient: {
          _id: recipient._id.toString(),
          name: recipient.name
        },
        content: message.content,
        timestamp: message.createdAt,
        createdAt: message.createdAt
      });
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return next(new ErrorResponse('Failed to send message', 500));
  }
});

// @desc    Mark messages as read
// @route   PUT /api/v1/chats/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res, next) => {
  try {
    const { messageId } = req.body;

    // Check if chat exists and user is participant
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return next(new ErrorResponse('Chat not found', 404));
    }

    if (!chat.participants.some(participant => participant._id.toString() === req.user.id.toString())) {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to access this chat`,
          401
        )
      );
    }

    // Mark specific message or all messages as read
    let updatedCount = 0;
    if (messageId) {
      const result = await Message.updateOne(
        { _id: messageId, recipient: req.user.id },
        { isRead: true }
      );
      updatedCount = result.nModified || result.modifiedCount || 0;
    } else {
      const result = await Message.updateMany(
        { chat: req.params.id, recipient: req.user.id, isRead: false },
        { isRead: true }
      );
      updatedCount = result.nModified || result.modifiedCount || 0;
    }

    res.status(200).json({
      success: true,
      data: {},
      updatedCount
    });
  } catch (error) {
    console.error('Error in markAsRead:', error);
    return next(new ErrorResponse('Failed to mark messages as read', 500));
  }
});

// @desc    Get unread message count for current user
// @route   GET /api/v1/chats/unread-count
// @access  Private
exports.getUnreadCount = asyncHandler(async (req, res, next) => {
  try {
    console.log('Fetching unread count for user:', req.user.id);
    // Count all unread messages for the current user
    const unreadCount = await Message.countDocuments({
      recipient: req.user.id,
      isRead: false
    });
    
    console.log('Unread count for user', req.user.id, ':', unreadCount);

    res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return next(new ErrorResponse('Failed to fetch unread message count', 500));
  }
});