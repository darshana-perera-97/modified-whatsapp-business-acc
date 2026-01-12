import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Smartphone, QrCode, CheckCircle2 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5153';

export function WhatsAppConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [qrCode, setQrCode] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const statusPollInterval = useRef(null);
  const qrPollInterval = useRef(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      // Redirect to login if no user ID
      navigate('/login');
      return;
    }

    // Initialize WhatsApp connection
    const initializeConnection = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize WhatsApp
        const initResponse = await fetch(`${API_BASE_URL}/api/whatsapp/initialize/${userId}`, {
          method: 'POST',
        });

        const initData = await initResponse.json();

        if (!initResponse.ok) {
          throw new Error(initData.message || 'Failed to initialize WhatsApp');
        }

        // If already connected, navigate to dashboard
        if (initData.connected) {
          setIsConnected(true);
          setIsLoading(false);
          return;
        }

        // Start polling for QR code
        startQRPolling(userId);
        
        // Start polling for connection status
        startStatusPolling(userId);
      } catch (err) {
        console.error('Error initializing WhatsApp:', err);
        setError(err.message || 'Failed to initialize WhatsApp connection');
        setIsLoading(false);
      }
    };

    initializeConnection();

    // Cleanup intervals on unmount
    return () => {
      if (qrPollInterval.current) {
        clearInterval(qrPollInterval.current);
      }
      if (statusPollInterval.current) {
        clearInterval(statusPollInterval.current);
      }
    };
  }, [navigate]);

  const startQRPolling = (userId) => {
    qrPollInterval.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/whatsapp/qr/${userId}`);
        const data = await response.json();

        if (data.success && data.qrCode) {
          setQrCode(data.qrCode);
          setIsLoading(false);
          if (qrPollInterval.current) {
            clearInterval(qrPollInterval.current);
          }
        } else if (data.status === 'connected') {
          setIsConnected(true);
          setIsLoading(false);
          if (qrPollInterval.current) {
            clearInterval(qrPollInterval.current);
          }
        }
      } catch (err) {
        console.error('Error fetching QR code:', err);
      }
    }, 2000); // Poll every 2 seconds
  };

  const startStatusPolling = (userId) => {
    statusPollInterval.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/whatsapp/status/${userId}`);
        const data = await response.json();

        if (data.success && data.connected) {
          setIsConnected(true);
          setIsLoading(false);
          if (statusPollInterval.current) {
            clearInterval(statusPollInterval.current);
          }
          if (qrPollInterval.current) {
            clearInterval(qrPollInterval.current);
          }
        }
      } catch (err) {
        console.error('Error checking status:', err);
      }
    }, 3000); // Poll every 3 seconds
  };

  const handleContinue = () => {
    // After connection is established, navigate to dashboard
    navigate('/dashboard');
  };

  if (isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">WhatsApp Connected!</h2>
            <p className="mt-2 text-sm text-gray-600">
              Your WhatsApp Business account has been successfully connected.
            </p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-900">Account Connected</p>
                <p className="text-xs text-emerald-700">WhatsApp Business</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleContinue}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            Continue to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Connect WhatsApp</h2>
          <p className="mt-2 text-sm text-gray-600">
            Connect your WhatsApp Business account to get started
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center">
              <div className="animate-pulse">
                <QrCode className="w-24 h-24 text-gray-300 mb-4" />
              </div>
              <p className="text-sm text-gray-600 text-center">
                Generating QR code...
              </p>
            </div>
          </div>
        ) : qrCode ? (
          <div className="space-y-4">
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center">
              <img 
                src={qrCode} 
                alt="WhatsApp QR Code" 
                className="w-64 h-64 mb-4"
              />
              <p className="text-sm text-gray-600 text-center">
                Scan this QR code with your WhatsApp mobile app
              </p>
              <p className="text-xs text-gray-500 text-center mt-2">
                Open WhatsApp → Settings → Linked Devices → Link a Device
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Tip:</strong> Make sure your phone has an active internet connection and WhatsApp is open.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center">
              <div className="animate-pulse">
                <QrCode className="w-24 h-24 text-gray-300 mb-4" />
              </div>
              <p className="text-sm text-gray-600 text-center">
                Waiting for QR code...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
