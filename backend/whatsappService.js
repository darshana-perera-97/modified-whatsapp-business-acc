const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

// Store active clients and QR codes
const activeClients = new Map();
const qrCodes = new Map();
const connectionStatus = new Map();

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
    }

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
    const client = activeClients.get(userId);
    if (client) {
      await client.logout();
      await client.destroy();
    }
    activeClients.delete(userId);
    qrCodes.delete(userId);
    connectionStatus.delete(userId);
    console.log(`WhatsApp disconnected for user ${userId}`);
  } catch (error) {
    console.error(`Error disconnecting WhatsApp for user ${userId}:`, error);
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

module.exports = {
  initializeWhatsApp,
  getQRCode,
  getConnectionStatus,
  getClient,
  disconnectWhatsApp,
  getClientInfo
};
