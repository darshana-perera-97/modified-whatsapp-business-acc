import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { MoreVertical } from 'lucide-react';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { SnippetsPanel } from './SnippetsPanel';
import { mockChats, mockMessages, mockSnippets } from '../data/mockData';
import { Toaster } from './ui/toaster';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const API_BASE_URL = 'http://localhost:5153';

export function Dashboard() {
  const [selectedChatId, setSelectedChatId] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState(mockMessages);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [whatsappAccount, setWhatsappAccount] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/login');
      return;
    }

    // Fetch WhatsApp account status when dialog opens
    if (isAccountDialogOpen) {
      fetchWhatsAppStatus(userId);
    }
  }, [isAccountDialogOpen, navigate]);

  const fetchWhatsAppStatus = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/status/${userId}`);
      const data = await response.json();

      if (data.success) {
        const clientInfo = data.clientInfo;
        setWhatsappAccount({
          phoneNumber: clientInfo?.wid?.user || 'Not available',
          name: clientInfo?.pushname || 'WhatsApp Business',
          status: data.connected ? 'Connected' : 'Disconnected',
          connectedAt: new Date().toISOString(), // You might want to store this in backend
          businessName: clientInfo?.pushname || 'WhatsApp Business',
          verified: false, // WhatsApp Web doesn't provide verification status
        });
      }
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
      setWhatsappAccount({
        phoneNumber: 'Not available',
        name: 'WhatsApp Business',
        status: 'Disconnected',
        connectedAt: null,
        businessName: 'WhatsApp Business',
        verified: false,
      });
    }
  };

  const selectedChat = mockChats.find((chat) => chat.id === selectedChatId) || null;
  const currentMessages = selectedChatId ? messages[selectedChatId] || [] : [];

  const handleSendMessage = (text) => {
    if (!selectedChatId) return;

    const newMessage = {
      id: `m${Date.now()}`,
      text,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      sender: 'me',
      status: 'sent',
    };

    setMessages((prev) => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), newMessage],
    }));
  };

  const handleSnippetDoubleClick = (snippet) => {
    handleSendMessage(snippet.content);
  };

  const handleLogout = () => {
    // TODO: Clear authentication state
    navigate('/login');
  };

  const handleWhatsAppLogout = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const response = await fetch(`${API_BASE_URL}/api/whatsapp/disconnect/${userId}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setIsAccountDialogOpen(false);
        // Refresh account status
        fetchWhatsAppStatus(userId);
        console.log('WhatsApp account disconnected');
      } else {
        alert('Failed to disconnect WhatsApp account');
      }
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      alert('Failed to disconnect WhatsApp account');
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        {/* Left Panel - Chat List (30%) */}
        <div className="w-[30%] flex-shrink-0 flex flex-col">
          <div className="p-4 border-b bg-white flex items-center justify-between">
            <h1 className="text-lg font-semibold">WhatsApp Business</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAccountDialogOpen(true)}
                className="text-gray-600 hover:text-emerald-600"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-sm"
              >
                Logout
              </Button>
            </div>
          </div>
          <ChatList
            chats={mockChats}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Center Panel - Chat Window (45%) */}
        <div className="w-[45%] flex-shrink-0">
          <ChatWindow
            chat={selectedChat}
            messages={currentMessages}
            onSendMessage={handleSendMessage}
          />
        </div>

        {/* Right Panel - Snippets Panel (25%) */}
        <div className="w-[25%] flex-shrink-0">
          <SnippetsPanel snippets={mockSnippets} onSnippetDoubleClick={handleSnippetDoubleClick} />
        </div>
      </div>
      <Toaster position="bottom-center" />
      
      {/* WhatsApp Account Details Dialog */}
      <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>WhatsApp Account Details</DialogTitle>
          <DialogDescription>
            View your connected WhatsApp Business account information
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {whatsappAccount ? (
            <>
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="w-16 h-16">
                  <AvatarImage src="" alt={whatsappAccount.businessName} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg">
                    {whatsappAccount.businessName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{whatsappAccount.businessName}</h3>
                  <p className="text-sm text-gray-600">{whatsappAccount.phoneNumber}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      whatsappAccount.status === 'Connected' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {whatsappAccount.status}
                    </span>
                    {whatsappAccount.verified && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Phone Number</span>
                  <span className="text-sm font-medium text-gray-900">{whatsappAccount.phoneNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Business Name</span>
                  <span className="text-sm font-medium text-gray-900">{whatsappAccount.businessName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`text-sm font-medium ${
                    whatsappAccount.status === 'Connected' ? 'text-emerald-600' : 'text-gray-600'
                  }`}>
                    {whatsappAccount.status}
                  </span>
                </div>
                {whatsappAccount.connectedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Connected At</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(whatsappAccount.connectedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600">Loading account information...</p>
            </div>
          )}
            
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={handleWhatsAppLogout}
              >
                Logout from WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DndProvider>
  );
}
