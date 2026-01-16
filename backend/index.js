const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const whatsappService = require('./whatsappService');
const app = express();
const PORT = process.env.PORT || 5153;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware (to allow frontend to make requests)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Path to users.json file
const usersFilePath = path.join(__dirname, 'data', 'users.json');

// Lock to prevent concurrent file writes
let isWritingUsers = false;
const writeQueue = [];

// Helper function to read users from file
async function readUsers() {
  try {
    const data = await fs.readFile(usersFilePath, 'utf8');
    // Handle empty file or whitespace-only content
    const trimmedData = data.trim();
    if (!trimmedData || trimmedData === '') {
      return [];
    }
    return JSON.parse(trimmedData);
  } catch (error) {
    // If file doesn't exist, return empty array
    if (error.code === 'ENOENT') {
      return [];
    }
    // If JSON parsing fails (empty file, corrupted data, etc.), return empty array
    if (error instanceof SyntaxError) {
      console.warn('Error parsing users.json, returning empty array:', error.message);
      // Try to write an empty array to fix the file (use writeUsers to avoid race conditions)
      try {
        await writeUsers([]);
      } catch (writeError) {
        console.error('Error writing empty users.json:', writeError);
      }
      return [];
    }
    throw error;
  }
}

// Helper function to write users to file (with locking to prevent race conditions)
async function writeUsers(users) {
  return new Promise((resolve, reject) => {
    const writeOperation = async () => {
      try {
        // Ensure data directory exists
        const dataDir = path.dirname(usersFilePath);
        await fs.mkdir(dataDir, { recursive: true });
        
        // Ensure users is an array
        if (!Array.isArray(users)) {
          console.error('writeUsers: users is not an array, converting to empty array');
          users = [];
        }
        
        // Write to file with proper formatting
        await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
        resolve();
      } catch (error) {
        console.error('Error writing users to file:', error);
        reject(error);
      } finally {
        // Process next item in queue
        isWritingUsers = false;
        if (writeQueue.length > 0) {
          const next = writeQueue.shift();
          isWritingUsers = true;
          next();
        }
      }
    };

    if (isWritingUsers) {
      // Add to queue
      writeQueue.push(writeOperation);
    } else {
      // Execute immediately
      isWritingUsers = true;
      writeOperation();
    }
  });
}

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the WhatsApp Business API Backend',
    status: 'Server is running'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// User registration endpoint
app.post('/api/users/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Read existing users
    const users = await readUsers();

    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user object
    const newUser = {
      id: Date.now().toString(), // Simple ID generation
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password, // Note: In production, hash the password before storing
      createdAt: new Date().toISOString()
    };

    // Add user to array
    users.push(newUser);

    // Write back to file
    await writeUsers(users);

    // Return success (don't send password back)
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// User login endpoint
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Read users
    const users = await readUsers();

    // Find user
    const user = users.find(u => u.email === email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password (in production, use bcrypt to compare hashed passwords)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      success: true,
      message: 'Login successful',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Check and restore WhatsApp session
app.get('/api/whatsapp/check-session/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // First, check if there's an active connected client
    const client = whatsappService.getClient(userId);
    const status = whatsappService.getConnectionStatus(userId);
    
    if (client && client.info && status === 'connected') {
      console.log(`Active connected client found for user ${userId}`);
      return res.json({
        success: true,
        hasSession: true,
        connected: true,
        message: 'WhatsApp is already connected'
      });
    }
    
    // Check if session files exist
    const hasSession = await whatsappService.hasSessionFiles(userId);
    
    if (!hasSession) {
      console.log(`No session files found for user ${userId}`);
      return res.json({
        success: true,
        hasSession: false,
        connected: false,
        message: 'No existing session found'
      });
    }

    console.log(`Session files found for user ${userId}, attempting to restore...`);
    
    // Try to restore session
    const result = await whatsappService.restoreWhatsAppSession(userId);
    
    // Update user data if connected
    if (result.success && result.connected) {
      await updateUserWhatsAppStatus(userId, true);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error checking/restoring WhatsApp session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check WhatsApp session',
      error: error.message
    });
  }
});

// Helper function to update user WhatsApp status
async function updateUserWhatsAppStatus(userId, isConnected) {
  try {
    if (!userId) {
      console.warn('updateUserWhatsAppStatus: userId is required');
      return;
    }
    
    const users = await readUsers();
    
    // Ensure users is an array
    if (!Array.isArray(users)) {
      console.error('updateUserWhatsAppStatus: users is not an array, resetting to empty array');
      await writeUsers([]);
      return;
    }
    
    const userIndex = users.findIndex(u => u && u.id === userId);
    
    if (userIndex !== -1) {
      if (isConnected) {
        users[userIndex].whatsappConnected = true;
        users[userIndex].whatsappConnectedAt = new Date().toISOString();
        // Clear disconnected timestamp if reconnecting
        if (users[userIndex].whatsappDisconnectedAt) {
          delete users[userIndex].whatsappDisconnectedAt;
        }
      } else {
        users[userIndex].whatsappConnected = false;
        users[userIndex].whatsappDisconnectedAt = new Date().toISOString();
      }
      await writeUsers(users);
      console.log(`User ${userId} WhatsApp status updated: connected=${isConnected}`);
    } else {
      console.warn(`updateUserWhatsAppStatus: User ${userId} not found in users array`);
    }
  } catch (error) {
    console.error('Error updating user WhatsApp status:', error);
    // Don't throw - this is a non-critical operation
  }
}

// Initialize WhatsApp connection (for new connections)
app.post('/api/whatsapp/initialize/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await whatsappService.initializeWhatsApp(userId);
    
    // Update user data if connected
    if (result.success && result.connected) {
      await updateUserWhatsAppStatus(userId, true);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error initializing WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize WhatsApp connection',
      error: error.message
    });
  }
});

// Get QR code
app.get('/api/whatsapp/qr/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const qrCode = whatsappService.getQRCode(userId);
    const status = whatsappService.getConnectionStatus(userId);

    if (qrCode) {
      res.json({
        success: true,
        qrCode: qrCode,
        status: status
      });
    } else {
      res.json({
        success: false,
        qrCode: null,
        status: status,
        message: status === 'connected' ? 'WhatsApp already connected' : 'QR code not available yet'
      });
    }
  } catch (error) {
    console.error('Error getting QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get QR code'
    });
  }
});

// Get connection status
app.get('/api/whatsapp/status/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const status = whatsappService.getConnectionStatus(userId);
    const clientInfo = whatsappService.getClientInfo(userId);

    res.json({
      success: true,
      status: status,
      connected: status === 'connected',
      clientInfo: clientInfo
    });
  } catch (error) {
    console.error('Error getting connection status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get connection status'
    });
  }
});

// Update WhatsApp connection status in user data
app.post('/api/whatsapp/update-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { connected } = req.body;
    
    await updateUserWhatsAppStatus(userId, connected === true);
    
    res.json({
      success: true,
      message: 'User WhatsApp status updated'
    });
  } catch (error) {
    console.error('Error updating WhatsApp status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update WhatsApp status'
    });
  }
});

// Disconnect WhatsApp
app.post('/api/whatsapp/disconnect/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await whatsappService.disconnectWhatsApp(userId);
    
    // Update user data
    await updateUserWhatsAppStatus(userId, false);
    
    res.json({
      success: true,
      message: 'WhatsApp disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect WhatsApp'
    });
  }
});

// Get all chats/conversations
app.get('/api/whatsapp/chats/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log(`[${new Date().toISOString()}] Starting to fetch chats for user ${userId}`);
    
    const chats = await whatsappService.getChats(userId);
    
    console.log(`[${new Date().toISOString()}] Successfully fetched ${chats.length} chats for user ${userId}`);
    
    res.json({
      success: true,
      chats: chats
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error getting chats for user ${userId}:`, error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to get chats',
      error: error.message
    });
  }
});

// Get conversation count
app.get('/api/whatsapp/chats/:userId/count', async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await whatsappService.getChatCount(userId);
    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Error getting chat count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat count',
      error: error.message
    });
  }
});

// Get messages for a specific chat
app.get('/api/whatsapp/chats/:userId/:chatId/messages', async (req, res) => {
  try {
    const { userId, chatId } = req.params;
    
    // Check if client is connected first
    const client = whatsappService.getClient(userId);
    const status = whatsappService.getConnectionStatus(userId);
    
    if (!client || status !== 'connected') {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp client not connected. Please ensure WhatsApp is connected first.',
        error: 'Client not connected'
      });
    }
    
    const messages = await whatsappService.getChatMessages(userId, chatId);
    res.json({
      success: true,
      messages: messages
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: error.message
    });
  }
});

// Send a message
app.post('/api/whatsapp/chats/:userId/:chatId/send', async (req, res) => {
  try {
    const { userId, chatId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const result = await whatsappService.sendMessage(userId, chatId, message);
    res.json({
      success: true,
      message: 'Message sent successfully',
      messageId: result
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
