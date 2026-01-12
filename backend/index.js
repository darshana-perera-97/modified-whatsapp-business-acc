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

// Helper function to read users from file
async function readUsers() {
  try {
    const data = await fs.readFile(usersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is empty, return empty array
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Helper function to write users to file
async function writeUsers(users) {
  await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
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

// Initialize WhatsApp connection
app.post('/api/whatsapp/initialize/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await whatsappService.initializeWhatsApp(userId);
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

// Disconnect WhatsApp
app.post('/api/whatsapp/disconnect/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await whatsappService.disconnectWhatsApp(userId);
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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
