const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

// Store active clients and QR codes
const activeClients = new Map();
const qrCodes = new Map();
const connectionStatus = new Map();
const initializingClients = new Map(); // Track clients being initialized

/**
 * Check if WhatsApp session files exist for a user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if session files exist
 */
async function hasSessionFiles(userId) {
  try {
    const userDataDir = path.join(__dirname, 'data', userId);
    
    // Check if directory exists
    try {
      await fs.access(userDataDir);
    } catch {
      return false;
    }

    // Check for session files (LocalAuth stores in .wwebjs_auth folder)
    const authDir = path.join(userDataDir, '.wwebjs_auth');
    try {
      const files = await fs.readdir(authDir);
      // Check if there are any session files
      return files.length > 0;
    } catch {
      return false;
    }
  } catch (error) {
    console.error(`Error checking session files for user ${userId}:`, error);
    return false;
  }
}

/**
 * Restore/load existing WhatsApp session for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Connection status
 */
async function restoreWhatsAppSession(userId) {
  try {
    // Check if client already exists and is ready
    if (activeClients.has(userId)) {
      const existingClient = activeClients.get(userId);
      if (existingClient.info) {
        return {
          success: true,
          connected: true,
          hasSession: true,
          message: 'WhatsApp already connected'
        };
      }
      // If client exists but not ready, wait a bit and check again
      if (connectionStatus.get(userId) === 'restoring' || connectionStatus.get(userId) === 'initializing') {
        // Wait for initialization to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (existingClient.info) {
          return {
            success: true,
            connected: true,
            hasSession: true,
            message: 'WhatsApp session restored'
          };
        }
      }
    }

    // Check if already initializing
    if (initializingClients.has(userId)) {
      // Wait for existing initialization
      const initPromise = initializingClients.get(userId);
      return await initPromise;
    }

    // Check if session files exist
    const hasSession = await hasSessionFiles(userId);
    
    if (!hasSession) {
      return {
        success: true,
        connected: false,
        hasSession: false,
        message: 'No existing session found'
      };
    }

    // Mark as initializing
    const initPromise = (async () => {
      try {
        // Create user data directory
        const userDataDir = path.join(__dirname, 'data', userId);
        await fs.mkdir(userDataDir, { recursive: true });

        // Create client with LocalAuth pointing to user's directory
        const client = new Client({
          authStrategy: new LocalAuth({
            dataPath: userDataDir
          }),
          puppeteer: {
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--disable-gpu'
            ]
          }
        });

        // Store client
        activeClients.set(userId, client);
        connectionStatus.set(userId, 'restoring');

        // Set up event handlers
        client.on('ready', () => {
          console.log(`WhatsApp client restored and ready for user ${userId}`);
          connectionStatus.set(userId, 'connected');
          // Emit event to update user data (will be handled by the endpoint)
        });

        client.on('authenticated', () => {
          console.log(`WhatsApp authenticated for user ${userId}`);
          connectionStatus.set(userId, 'authenticated');
        });

        client.on('auth_failure', (msg) => {
          console.error(`WhatsApp auth failure for user ${userId}:`, msg);
          connectionStatus.set(userId, 'auth_failure');
          activeClients.delete(userId);
        });

        client.on('disconnected', (reason) => {
          console.log(`WhatsApp disconnected for user ${userId}:`, reason);
          connectionStatus.set(userId, 'disconnected');
          activeClients.delete(userId);
        });

        // Initialize client (will use existing session if available)
        await client.initialize();

        // Wait a bit to see if it connects automatically
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if connected
        if (client.info) {
          connectionStatus.set(userId, 'connected');
          return {
            success: true,
            connected: true,
            hasSession: true,
            message: 'WhatsApp session restored successfully'
          };
        }

        return {
          success: true,
          connected: false,
          hasSession: true,
          message: 'Session files found but not connected yet'
        };
      } catch (error) {
        console.error(`Error restoring WhatsApp session for user ${userId}:`, error);
        activeClients.delete(userId);
        connectionStatus.delete(userId);
        throw error;
      } finally {
        initializingClients.delete(userId);
      }
    })();

    initializingClients.set(userId, initPromise);
    return await initPromise;
  } catch (error) {
    console.error(`Error restoring WhatsApp session for user ${userId}:`, error);
    initializingClients.delete(userId);
    throw error;
  }
}

/**
 * Initialize WhatsApp client for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Client instance and QR code
 */
async function initializeWhatsApp(userId) {
  try {
    // Check if client already exists and is ready
    if (activeClients.has(userId)) {
      const existingClient = activeClients.get(userId);
      if (existingClient.info) {
        return {
          success: true,
          connected: true,
          message: 'WhatsApp already connected'
        };
      }
      // If client exists but not ready, check status
      const status = connectionStatus.get(userId);
      if (status === 'initializing' || status === 'restoring' || status === 'qr_ready') {
        return {
          success: true,
          connected: false,
          message: 'WhatsApp client is already initializing'
        };
      }
    }

    // Check if already initializing
    if (initializingClients.has(userId)) {
      // Wait for existing initialization
      const initPromise = initializingClients.get(userId);
      return await initPromise;
    }

    // Mark as initializing
    const initPromise = (async () => {
      try {
        // Create user data directory
        const userDataDir = path.join(__dirname, 'data', userId);
        await fs.mkdir(userDataDir, { recursive: true });

        // Create client with LocalAuth pointing to user's directory
        const client = new Client({
          authStrategy: new LocalAuth({
            dataPath: userDataDir
          }),
          puppeteer: {
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--disable-gpu'
            ]
          }
        });

        // Store client
        activeClients.set(userId, client);
        connectionStatus.set(userId, 'initializing');

        // Set up event handlers
        client.on('qr', async (qr) => {
          try {
            // Generate QR code as data URL
            const qrDataUrl = await qrcode.toDataURL(qr);
            qrCodes.set(userId, qrDataUrl);
            connectionStatus.set(userId, 'qr_ready');
            console.log(`QR code generated for user ${userId}`);
          } catch (error) {
            console.error('Error generating QR code:', error);
          }
        });

        client.on('ready', () => {
          console.log(`WhatsApp client ready for user ${userId}`);
          connectionStatus.set(userId, 'connected');
          qrCodes.delete(userId);
        });

        client.on('authenticated', () => {
          console.log(`WhatsApp authenticated for user ${userId}`);
          connectionStatus.set(userId, 'authenticated');
        });

        client.on('auth_failure', (msg) => {
          console.error(`WhatsApp auth failure for user ${userId}:`, msg);
          connectionStatus.set(userId, 'auth_failure');
          activeClients.delete(userId);
          qrCodes.delete(userId);
        });

        client.on('disconnected', (reason) => {
          console.log(`WhatsApp disconnected for user ${userId}:`, reason);
          connectionStatus.set(userId, 'disconnected');
          activeClients.delete(userId);
          qrCodes.delete(userId);
        });

        // Initialize client
        await client.initialize();

        return {
          success: true,
          connected: false,
          message: 'WhatsApp client initialized. Waiting for QR code...'
        };
      } catch (error) {
        console.error(`Error initializing WhatsApp for user ${userId}:`, error);
        activeClients.delete(userId);
        qrCodes.delete(userId);
        connectionStatus.delete(userId);
        throw error;
      } finally {
        initializingClients.delete(userId);
      }
    })();

    initializingClients.set(userId, initPromise);
    return await initPromise;
  } catch (error) {
    console.error(`Error initializing WhatsApp for user ${userId}:`, error);
    initializingClients.delete(userId);
    throw error;
  }
}

/**
 * Get QR code for a user
 * @param {string} userId - User ID
 * @returns {string|null} - QR code data URL or null
 */
function getQRCode(userId) {
  return qrCodes.get(userId) || null;
}

/**
 * Get connection status for a user
 * @param {string} userId - User ID
 * @returns {string} - Connection status
 */
function getConnectionStatus(userId) {
  return connectionStatus.get(userId) || 'not_initialized';
}

/**
 * Get WhatsApp client for a user
 * @param {string} userId - User ID
 * @returns {Client|null} - Client instance or null
 */
function getClient(userId) {
  return activeClients.get(userId) || null;
}

/**
 * Disconnect WhatsApp client for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function disconnectWhatsApp(userId) {
  try {
    // Remove from initializing map
    initializingClients.delete(userId);
    
    const client = activeClients.get(userId);
    if (client) {
      try {
        await client.logout();
      } catch (err) {
        console.error(`Error during logout for user ${userId}:`, err);
      }
      try {
        await client.destroy();
      } catch (err) {
        console.error(`Error destroying client for user ${userId}:`, err);
      }
    }
    activeClients.delete(userId);
    qrCodes.delete(userId);
    connectionStatus.delete(userId);
    console.log(`WhatsApp disconnected for user ${userId}`);
  } catch (error) {
    console.error(`Error disconnecting WhatsApp for user ${userId}:`, error);
    // Clean up even if there's an error
    activeClients.delete(userId);
    qrCodes.delete(userId);
    connectionStatus.delete(userId);
    initializingClients.delete(userId);
    throw error;
  }
}

/**
 * Get client info if connected
 * @param {string} userId - User ID
 * @returns {Object|null} - Client info or null
 */
function getClientInfo(userId) {
  const client = activeClients.get(userId);
  if (client && client.info) {
    return {
      wid: client.info.wid,
      pushname: client.info.pushname,
      platform: client.info.platform
    };
  }
  return null;
}

/**
 * Get all chats for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of chats
 */
async function getChats(userId) {
  try {
    const client = getClient(userId);
    if (!client) {
      throw new Error('WhatsApp client not initialized');
    }

    // Wait for client to be ready (with timeout)
    if (!client.info) {
      // Wait up to 10 seconds for client to be ready
      let attempts = 0;
      while (!client.info && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (!client.info) {
        throw new Error('WhatsApp client not ready. Please wait a moment and try again.');
      }
    }

    console.log(`Fetching chats for user ${userId}...`);
    
    // Get all chats
    const chats = await client.getChats();
    console.log(`Found ${chats.length} chats for user ${userId}`);
    
    if (chats.length === 0) {
      console.log(`No chats found for user ${userId}`);
      return [];
    }
    
    // Transform to UI format (process in batches to avoid overwhelming)
    const formattedChats = await Promise.all(chats.map(async (chat) => {
      try {
        // Get contact info
        let contact = null;
        let contactName = chat.name || 'Unknown';
        let phoneNumber = chat.id.user || '';
        let avatar = null;

        try {
          // Add timeout for contact fetching (5 seconds)
          const contactPromise = chat.getContact();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Contact fetch timeout')), 5000)
          );
          contact = await Promise.race([contactPromise, timeoutPromise]);
          
          contactName = contact.pushname || contact.name || contact.number || chat.name || 'Unknown';
          phoneNumber = contact.number || chat.id.user || '';
          
          // Try to get profile picture (with timeout - 3 seconds)
          try {
            const picPromise = contact.getProfilePicUrl();
            const picTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Profile pic timeout')), 3000)
            );
            avatar = await Promise.race([picPromise, picTimeout]);
          } catch (err) {
            // Profile pic not available, use null
            avatar = null;
          }
        } catch (err) {
          // Contact not available, use chat info
          contactName = chat.name || chat.id.user || 'Unknown';
          phoneNumber = chat.id.user || '';
        }

        const unreadCount = chat.unreadCount || 0;
        
        // Get last message (with timeout - 5 seconds)
        let lastMessage = null;
        try {
          const messagesPromise = chat.fetchMessages({ limit: 1 });
          const messagesTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Messages fetch timeout')), 5000)
          );
          const messages = await Promise.race([messagesPromise, messagesTimeout]);
          lastMessage = messages.length > 0 ? messages[0] : null;
        } catch (err) {
          console.error(`Error fetching last message for chat ${chat.id._serialized}:`, err.message || err);
        }
        
        // Format timestamp
        let timestamp = '';
        if (lastMessage) {
          const msgDate = new Date(lastMessage.timestamp * 1000);
          const now = new Date();
          const diffTime = Math.abs(now - msgDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) {
            timestamp = msgDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          } else if (diffDays === 1) {
            timestamp = 'Yesterday';
          } else if (diffDays < 7) {
            timestamp = msgDate.toLocaleDateString('en-US', { weekday: 'short' });
          } else {
            timestamp = msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
        }

        // Extract last message info
        let lastMessageText = '';
        let lastMessageType = null;
        let lastMessageImage = null;
        
        if (lastMessage) {
          lastMessageType = lastMessage.type;
          
          if (lastMessage.type === 'image') {
            // Try to get image URL (with timeout to prevent slow loading)
            try {
              if (lastMessage.hasMedia) {
                const downloadPromise = lastMessage.downloadMedia();
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Image download timeout')), 3000)
                );
                const media = await Promise.race([downloadPromise, timeoutPromise]);
                
                if (media && media.data) {
                  // Only include if it's not too large (limit to 100KB for preview)
                  const sizeInKB = media.data.length / 1024;
                  if (sizeInKB < 100) {
                    // Convert to data URL for preview
                    const base64 = media.data.toString('base64');
                    lastMessageImage = `data:${media.mimetype};base64,${base64}`;
                  }
                }
              }
            } catch (err) {
              // Silently fail - just show text instead of image
              console.debug(`Could not load image preview for chat ${chat.id._serialized}:`, err.message || err);
            }
            lastMessageText = lastMessage.caption || '📷 Image';
          } else if (lastMessage.type === 'video') {
            lastMessageText = lastMessage.caption || '🎥 Video';
          } else if (lastMessage.type === 'audio') {
            lastMessageText = '🎵 Audio';
          } else if (lastMessage.type === 'document') {
            lastMessageText = `📄 ${lastMessage.body || 'Document'}`;
          } else if (lastMessage.type === 'sticker') {
            lastMessageText = '🎨 Sticker';
          } else {
            lastMessageText = lastMessage.body || `[${lastMessage.type}]`;
          }
        }

        return {
          id: chat.id._serialized,
          name: contactName,
          phoneNumber: phoneNumber,
          avatar: avatar,
          lastMessage: lastMessageText,
          lastMessageType: lastMessageType,
          lastMessageImage: lastMessageImage,
          timestamp: timestamp,
          unread: unreadCount,
          isGroup: chat.isGroup || false,
          isReadOnly: chat.isReadOnly || false
        };
      } catch (error) {
        console.error(`Error formatting chat ${chat.id._serialized}:`, error);
        // Return basic chat info even if there's an error
        return {
          id: chat.id._serialized,
          name: chat.name || chat.id.user || 'Unknown',
          phoneNumber: chat.id.user || '',
          avatar: null,
          lastMessage: '',
          lastMessageType: null,
          lastMessageImage: null,
          timestamp: '',
          unread: 0,
          isGroup: chat.isGroup || false,
          isReadOnly: chat.isReadOnly || false
        };
      }
    }));

    // Sort by timestamp (most recent first) - WhatsApp already sorts by most recent
    // Just ensure chats with timestamps come first
    formattedChats.sort((a, b) => {
      if (!a.timestamp && !b.timestamp) return 0;
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return 0; // WhatsApp already provides them in order
    });

    console.log(`Formatted ${formattedChats.length} chats for user ${userId}`);
    return formattedChats;
  } catch (error) {
    console.error(`Error getting chats for user ${userId}:`, error);
    console.error('Error details:', error.message, error.stack);
    throw error;
  }
}

/**
 * Get messages for a specific chat
 * @param {string} userId - User ID
 * @param {string} chatId - Chat ID
 * @returns {Promise<Array>} - Array of messages
 */
async function getChatMessages(userId, chatId) {
  try {
    const client = getClient(userId);
    if (!client) {
      throw new Error('WhatsApp client not initialized');
    }

    // Wait for client to be ready (with timeout)
    if (!client.info) {
      // Wait up to 10 seconds for client to be ready
      let attempts = 0;
      while (!client.info && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (!client.info) {
        throw new Error('WhatsApp client not ready. Please wait a moment and try again.');
      }
    }

    // Get chat by ID
    const chat = await client.getChatById(chatId);
    
    // Fetch messages (limit to last 100)
    const messages = await chat.fetchMessages({ limit: 100 });
    
    // Transform to UI format
    const formattedMessages = messages.map((msg) => {
      const msgDate = new Date(msg.timestamp * 1000);
      const isFromMe = msg.fromMe;
      
      return {
        id: msg.id._serialized,
        text: msg.body || `[${msg.type}]`,
        timestamp: msgDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        sender: isFromMe ? 'me' : 'them',
        status: isFromMe ? (msg.ack === 3 ? 'read' : msg.ack === 2 ? 'delivered' : 'sent') : undefined,
        type: msg.type
      };
    });

    return formattedMessages;
  } catch (error) {
    console.error(`Error getting messages for chat ${chatId}:`, error);
    throw error;
  }
}

/**
 * Send a message to a chat
 * @param {string} userId - User ID
 * @param {string} chatId - Chat ID
 * @param {string} message - Message text
 * @returns {Promise<string>} - Message ID
 */
async function sendMessage(userId, chatId, message) {
  try {
    const client = getClient(userId);
    if (!client || !client.info) {
      throw new Error('WhatsApp client not connected');
    }

    // Get chat by ID
    const chat = await client.getChatById(chatId);
    
    if (!chat) {
      throw new Error(`Chat ${chatId} not found`);
    }
    
    // Send message with error handling for WhatsApp Web.js internal errors
    try {
      const sentMessage = await chat.sendMessage(message);
      return sentMessage.id._serialized;
    } catch (sendError) {
      // Check if it's the markedUnread error (internal WhatsApp Web.js issue)
      if (sendError.message && (sendError.message.includes('markedUnread') || sendError.message.includes('Cannot read properties of undefined'))) {
        console.warn(`WhatsApp Web.js internal error for chat ${chatId}, verifying if message was sent...`);
        
        // Wait a moment for message to be processed (increased wait time)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to verify if message was actually sent by checking recent messages
        let messageVerified = false;
        let verifiedMessageId = null;
        
        try {
          const recentMessages = await chat.fetchMessages({ limit: 10 });
          
          // Check if any recent message matches (check body or contains the message text)
          for (const msg of recentMessages) {
            if (msg.fromMe) {
              const msgTime = new Date(msg.timestamp * 1000);
              const now = new Date();
              const timeDiff = (now - msgTime) / 1000; // seconds
              
              // Check if message is recent (within last 15 seconds)
              if (timeDiff < 15) {
                // Check if message body matches or contains the sent message
                if (msg.body) {
                  const msgBody = msg.body.trim();
                  const sentMessage = message.trim();
                  
                  // Exact match or contains check
                  if (msgBody === sentMessage || msgBody.includes(sentMessage) || sentMessage.includes(msgBody)) {
                    console.log(`Message verified as sent successfully (exact/partial match found)`);
                    messageVerified = true;
                    verifiedMessageId = msg.id._serialized;
                    break;
                  }
                }
                
                // If no exact match but message is very recent (within 5 seconds), assume it's the sent message
                if (timeDiff < 5 && !messageVerified) {
                  console.log(`Message likely sent successfully (found very recent message from me)`);
                  messageVerified = true;
                  verifiedMessageId = msg.id._serialized;
                  break;
                }
              }
            }
          }
          
          if (messageVerified && verifiedMessageId) {
            return verifiedMessageId;
          }
        } catch (verifyError) {
          console.error(`Error verifying message send:`, verifyError);
        }
        
        // If we can't verify but it's a markedUnread error, the message was likely sent
        // This is a known WhatsApp Web.js bug that occurs after successful message send
        console.log(`Message send completed (markedUnread error is non-critical - message was likely sent successfully)`);
        // Return a temporary ID - the message was likely sent
        return `temp_${Date.now()}`;
      }
      // Re-throw other errors
      throw sendError;
    }
  } catch (error) {
    console.error(`Error sending message to chat ${chatId}:`, error);
    throw error;
  }
}

/**
 * Get conversation count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Number of conversations
 */
async function getChatCount(userId) {
  try {
    const client = getClient(userId);
    if (!client) {
      throw new Error('WhatsApp client not initialized');
    }

    // Wait for client to be ready
    if (!client.info) {
      let attempts = 0;
      while (!client.info && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (!client.info) {
        throw new Error('WhatsApp client not ready');
      }
    }

    // Get all chats and return count
    const chats = await client.getChats();
    return chats.length;
  } catch (error) {
    console.error(`Error getting chat count for user ${userId}:`, error);
    throw error;
  }
}

module.exports = {
  initializeWhatsApp,
  getQRCode,
  getConnectionStatus,
  getClient,
  disconnectWhatsApp,
  getClientInfo,
  hasSessionFiles,
  restoreWhatsAppSession,
  getChats,
  getChatMessages,
  sendMessage,
  getChatCount
};
