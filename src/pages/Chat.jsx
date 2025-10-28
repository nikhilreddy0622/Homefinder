import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Phone, Video, MoreVertical, Search, MessageCircle, Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { io } from 'socket.io-client';
import { toast } from 'sonner';

const Chat = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showConversations, setShowConversations] = useState(true); // For mobile view toggle
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (user) {
      // Connect to socket - extract base URL without /api/v1
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4012';
      const socketUrl = apiUrl.replace('/api/v1', '');
      
      socketRef.current = io(socketUrl, {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      // Listen for incoming messages
      socketRef.current.on('receive_message', (message) => {
        // Check if this message is already in the messages array to prevent duplicates
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === message._id);
          if (!exists) {
            // Check if user object is available
            if (!user) {
              return prev;
            }
            
            // Robustly determine if this message was sent by the current user
            let isOwn = false;
            try {
              const messageSenderId = message?.sender?._id;
              const currentUserId = user?._id || user?.id;
              
              // Handle different data types (ObjectId, string, etc.)
              const normalizedMessageSenderId = messageSenderId?.toString?.() || String(messageSenderId);
              const normalizedCurrentUserId = currentUserId?.toString?.() || String(currentUserId);
              
              isOwn = Boolean(
                normalizedMessageSenderId && 
                normalizedCurrentUserId && 
                normalizedMessageSenderId === normalizedCurrentUserId
              );
            } catch (error) {
              console.error('Error determining message ownership:', error);
            }
            
            return [...prev, {
              id: message._id,
              sender: message.sender.name,
              content: message.content,
              timestamp: new Date(message.timestamp || message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isOwn: isOwn
            }];
          }
          return prev;
        });
        
        // Refresh conversations to update unread counts
        fetchConversations();
      });

      // Listen for typing indicators
      socketRef.current.on('typing', (data) => {
        // Handle typing indicator
        console.log('User is typing:', data);
      });

      // Listen for stop typing indicators
      socketRef.current.on('stop_typing', (data) => {
        // Handle stop typing indicator
        console.log('User stopped typing:', data);
      });

      // Clean up socket connection
      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [user]);

  // Handle URL parameters to automatically open/create chat
  useEffect(() => {
    const handleUrlParams = async () => {
      if (!user) return;
      
      const params = new URLSearchParams(location.search);
      const userId = params.get('userId');
      const propertyId = params.get('propertyId');
      const chatId = params.get('chatId');
      
      console.log('Handling URL params:', { userId, propertyId, chatId });
      
      // If we have a chatId, try to open that specific chat
      if (chatId) {
        try {
          // Fetch the specific chat
          const response = await api.get(`/chats/${chatId}`);
          console.log('Fetched chat:', response.data);
          if (response.data.success && response.data.data) {
            setActiveConversation(response.data.data.chat);
            // On mobile, switch to chat view
            if (window.innerWidth < 768) {
              setShowConversations(false);
            }
            // Set messages for this chat
            const formattedMessages = response.data.data.messages.map(msg => {
              // Robustly determine if this message was sent by the current user
              let isOwn = false;
              try {
                const messageSenderId = msg?.sender?._id;
                const currentUserId = user?._id || user?.id;
                
                // Handle different data types (ObjectId, string, etc.)
                const normalizedMessageSenderId = messageSenderId?.toString?.() || String(messageSenderId);
                const normalizedCurrentUserId = currentUserId?.toString?.() || String(currentUserId);
                
                isOwn = Boolean(
                  normalizedMessageSenderId && 
                  normalizedCurrentUserId && 
                  normalizedMessageSenderId === normalizedCurrentUserId
                );
              } catch (error) {
                console.error('Error determining message ownership:', error);
              }
              
              return {
                id: msg._id,
                sender: msg.sender.name,
                content: msg.content,
                timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isOwn: isOwn
              };
            });
            setMessages(formattedMessages);
          }
          // Clear URL parameters
          window.history.replaceState({}, document.title, '/chat');
          return;
        } catch (error) {
          console.error('Error fetching chat:', error);
          toast.error('Failed to open chat');
        }
      }
      
      // If we have userId and propertyId, create or get existing chat
      if (userId && propertyId) {
        try {
          // Create or get existing chat
          const response = await api.post('/chats', {
            recipientId: userId,
            propertyId: propertyId
          });
          
          console.log('Created/opened chat:', response.data);
          
          // Set the created/opened chat as active
          setActiveConversation(response.data.data);
          // On mobile, switch to chat view
          if (window.innerWidth < 768) {
            setShowConversations(false);
          }
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, '/chat');
        } catch (error) {
          console.error('Error creating/opening chat:', error);
          if (error.response) {
            console.error('Error response:', error.response.data);
          }
          toast.error('Failed to open chat with user');
        }
      }
    };
    
    handleUrlParams();
  }, [user, location.search]);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const response = await api.get('/chats');
      setConversations(response.data.data);
      if (response.data.data.length > 0 && !activeConversation) {
        setActiveConversation(response.data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  // Setup auto-refresh
  useEffect(() => {
    if (user) {
      // Initial fetch
      fetchConversations();
      
      // Set up interval to refresh every 3 seconds
      refreshIntervalRef.current = setInterval(() => {
        fetchConversations();
      }, 3000);
      
      // Clean up interval
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [user, activeConversation]);

  // Fetch messages for active conversation
  useEffect(() => {
    const fetchMessages = async () => {
      if (activeConversation) {
        try {
          const response = await api.get(`/chats/${activeConversation._id}`);
          const formattedMessages = response.data.data.messages.map(msg => {
            // Robustly determine if this message was sent by the current user
            let isOwn = false;
            try {
              const messageSenderId = msg?.sender?._id;
              const currentUserId = user?._id || user?.id;
              
              // Handle different data types (ObjectId, string, etc.)
              const normalizedMessageSenderId = messageSenderId?.toString?.() || String(messageSenderId);
              const normalizedCurrentUserId = currentUserId?.toString?.() || String(currentUserId);
              
              isOwn = Boolean(
                normalizedMessageSenderId && 
                normalizedCurrentUserId && 
                normalizedMessageSenderId === normalizedCurrentUserId
              );
            } catch (error) {
              console.error('Error determining message ownership:', error);
            }
            
            return {
              id: msg._id,
              sender: msg.sender.name,
              content: msg.content,
              timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isOwn: isOwn
            };
          });
          setMessages(formattedMessages);
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      }
    };

    fetchMessages();
  }, [activeConversation, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && activeConversation && !sending) {
      try {
        setSending(true);
        
        // Send message through API
        const response = await api.post(`/chats/${activeConversation._id}/messages`, {
          content: newMessage
        });

        // Clear input field
        setNewMessage('');
        
        // Refresh conversations to update unread counts
        setTimeout(() => {
          fetchConversations();
        }, 500);
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      } finally {
        setSending(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get the display name for the other participant
  const getOtherParticipantName = (conversation) => {
    if (conversation.otherParticipant) {
      return conversation.otherParticipant.name;
    }
    
    // Fallback to old method
    const otherParticipant = conversation.participants?.find(
      p => p._id?.toString() !== user?.id?.toString()
    );
    return otherParticipant?.name || 'Unknown User';
  };

  // Get the display role for the other participant
  const getOtherParticipantRole = (conversation) => {
    if (conversation.otherParticipant) {
      return conversation.otherParticipant.isOwner ? 'Owner' : 'Tenant';
    }
    
    // Fallback - try to determine from property ownership
    if (conversation.property?.owner) {
      const otherParticipant = conversation.participants?.find(
        p => p._id?.toString() !== user?.id?.toString()
      );
      if (otherParticipant && otherParticipant._id?.toString() === conversation.property.owner.toString()) {
        return 'Owner';
      }
    }
    
    return 'User';
  };

  // Get the first letter for avatar
  const getOtherParticipantInitial = (conversation) => {
    const name = getOtherParticipantName(conversation);
    return name.charAt(0) || 'U';
  };

  // Handle conversation selection on mobile
  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
    if (window.innerWidth < 768) {
      setShowConversations(false);
    }
  };

  // Handle back to conversations on mobile
  const handleBackToConversations = () => {
    setShowConversations(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
        <div className="flex h-[calc(100vh-200px)]">
          {/* Conversations Sidebar - Always visible on desktop (md+), toggle on mobile */}
          <div className="hidden md:block md:w-80 lg:w-80 xl:w-96 border-r flex flex-col conversation-sidebar">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">Messages</h2>
            </div>
            
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Improved mobile scrolling for conversations list */}
            <div className="flex-1 overflow-y-auto mobile-scrollable">
              {conversations.length === 0 ? (
                <div className="empty-conversations p-4 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No conversations yet</p>
                  <p className="text-sm mt-1 text-muted-foreground">Start a conversation by booking a property or contacting an owner</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation._id}
                    className="conversation-item flex items-center gap-3 cursor-pointer hover:bg-muted transition-colors border-b border-border last:border-b-0"
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    <div className="relative chat-avatar flex-shrink-0 p-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-semibold text-primary">
                          {getOtherParticipantInitial(conversation)}
                        </span>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">{conversation.unreadCount}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 py-3">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold conversation-title">
                          {getOtherParticipantName(conversation)}
                        </h3>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(conversation.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-sm text-muted-foreground conversation-property text-truncate">
                          {conversation.property?.title || 'Property conversation'}
                        </p>
                        <span className="text-xs text-muted-foreground conversation-role whitespace-nowrap">
                          {getOtherParticipantRole(conversation)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Mobile version of conversations - only shown on mobile when showConversations is true */}
          {showConversations && (
            <div className="md:hidden w-full border-r flex flex-col absolute inset-0 z-10 bg-card">
              <div className="p-4 border-b flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="mr-2"
                  onClick={() => setShowConversations(false)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-xl font-bold">Messages</h2>
              </div>
              
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto mobile-scrollable">
                {conversations.length === 0 ? (
                  <div className="empty-conversations p-4 text-center">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No conversations yet</p>
                    <p className="text-sm mt-1 text-muted-foreground">Start a conversation by booking a property or contacting an owner</p>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation._id}
                      className="conversation-item flex items-center gap-3 cursor-pointer hover:bg-muted transition-colors border-b border-border last:border-b-0"
                      onClick={() => handleSelectConversation(conversation)}
                    >
                      <div className="relative chat-avatar flex-shrink-0 p-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-semibold text-primary">
                            {getOtherParticipantInitial(conversation)}
                          </span>
                        </div>
                        {conversation.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-bold">{conversation.unreadCount}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 py-3">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold conversation-title">
                            {getOtherParticipantName(conversation)}
                          </h3>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(conversation.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-sm text-muted-foreground conversation-property text-truncate">
                            {conversation.property?.title || 'Property conversation'}
                          </p>
                          <span className="text-xs text-muted-foreground conversation-role whitespace-nowrap">
                            {getOtherParticipantRole(conversation)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {/* Chat Area - Always visible on desktop, toggle on mobile */}
          <div className={`flex-1 flex flex-col min-w-0 ${showConversations ? 'hidden md:flex' : 'flex'}`}>
            {activeConversation ? (
              <>
                {/* Chat Header - Mobile version with back button */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="md:hidden mr-2"
                      onClick={() => setShowConversations(true)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="chat-avatar flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-semibold text-primary">
                          {getOtherParticipantInitial(activeConversation)}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">
                        {getOtherParticipantName(activeConversation)}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {getOtherParticipantRole(activeConversation)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="hidden md:inline-flex">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="hidden md:inline-flex">
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 bg-muted/30 chat-messages-container mobile-scrollable">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`message-bubble px-4 py-2 rounded-lg max-w-[85%] sm:max-w-xs lg:max-w-md xl:max-w-lg ${
                            message.isOwn
                              ? 'bg-blue-500 text-white rounded-br-none'
                              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                          }`}
                        >
                          {/* Always show sender name for clarity */}
                          <p className={`text-xs font-semibold mb-1 ${message.isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                            {message.isOwn ? 'You' : message.sender}
                          </p>
                          <p className="message-content break-words">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              message.isOwn ? 'text-blue-100' : 'text-gray-500'
                            }`}
                          >
                            {message.timestamp}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
                
                {/* Message Input */}
                <div className="p-4 border-t chat-input-area">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={sending}
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!newMessage.trim() || sending}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No conversation selected</h3>
                  <p className="text-muted-foreground">
                    Select a conversation from the sidebar to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
