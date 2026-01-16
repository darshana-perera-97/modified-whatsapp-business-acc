import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { MoreVertical } from 'lucide-react';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { SnippetsPanel } from './SnippetsPanel';
import { mockSnippets } from '../data/mockData';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

const API_BASE_URL = 'http://localhost:5153';

export function Dashboard() {
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState({});
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [whatsappAccount, setWhatsappAccount] = useState(null);
  const [conversationCount, setConversationCount] = useState(null);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [chatError, setChatError] = useState(null);
  const navigate = useNavigate();
  const hasCheckedSession = useRef(false);
  const isCheckingSession = useRef(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    
    if (!userId || hasCheckedSession.current || isCheckingSession.current) {
      return;
    }

    // Check and restore WhatsApp session on mount (only once)
    const checkAndRestoreSession = async () => {
      if (isCheckingSession.current) return;
      
      isCheckingSession.current = true;
      hasCheckedSession.current = true;

      try {
        const sessionResponse = await fetch(`${API_BASE_URL}/api/whatsapp/check-session/${userId}`);
        const sessionData = await sessionResponse.json();
        
        console.log('Session check result:', sessionData);
        
        if (sessionData.success && sessionData.connected) {
          // Connected, load chats
          console.log('WhatsApp connected, loading chats...');
          // Wait a moment for client to be fully ready
          setTimeout(() => {
            loadChats(userId);
          }, 1000);
        } else if (sessionData.success && !sessionData.connected && sessionData.hasSession) {
          // Session files exist but not connected, try to restore
          console.log('Session files found, attempting to restore...');
          // Wait a bit and check again (retry up to 3 times)
          let retryCount = 0;
          const maxRetries = 3;
          
          const retryCheck = async () => {
            if (retryCount >= maxRetries) {
              console.log('Session restore failed after retries, redirecting to connect screen');
              isCheckingSession.current = false;
              navigate('/connect');
              return;
            }
            
            retryCount++;
            console.log(`Retry ${retryCount}/${maxRetries} - Checking session...`);
            
            setTimeout(async () => {
              try {
                const retryResponse = await fetch(`${API_BASE_URL}/api/whatsapp/check-session/${userId}`);
                const retryData = await retryResponse.json();
                
                if (retryData.success && retryData.connected) {
                  console.log('Session restored successfully!');
                  setTimeout(() => {
                    loadChats(userId);
                  }, 1000);
                  isCheckingSession.current = false;
                } else if (retryData.hasSession) {
                  // Still has session but not connected, retry
                  retryCheck();
                } else {
                  console.log('Session restore failed, redirecting to connect screen');
                  isCheckingSession.current = false;
                  navigate('/connect');
                }
              } catch (err) {
                console.error('Error during retry:', err);
                if (retryCount >= maxRetries) {
                  isCheckingSession.current = false;
                  navigate('/connect');
                } else {
                  retryCheck();
                }
              }
            }, 3000);
          };
          
          retryCheck();
          return; // Don't set isCheckingSession to false yet
        } else {
          // Not connected, redirect to connect
          console.log('Not connected, redirecting to connect screen');
          navigate('/connect');
        }
      } catch (error) {
        console.error('Error checking session on dashboard:', error);
        setChatError('Failed to check WhatsApp session. Please try again.');
      } finally {
        isCheckingSession.current = false;
      }
    };

    checkAndRestoreSession();
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    // Fetch WhatsApp account status and conversation count when dialog opens
    const userId = localStorage.getItem('userId');
    if (isAccountDialogOpen && userId) {
      fetchWhatsAppStatus(userId);
      fetchConversationCount(userId);
    } else {
      // Reset when dialog closes
      setConversationCount(null);
    }
  }, [isAccountDialogOpen]);

  const fetchConversationCount = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/chats/${userId}/count`);
      const data = await response.json();

      if (data.success) {
        setConversationCount(data.count);
      }
    } catch (error) {
      console.error('Error fetching conversation count:', error);
      setConversationCount(null);
    }
  };

  const loadChats = async (userId) => {
    try {
      setIsLoadingChats(true);
      setChatError(null);
      console.log('Loading chats for user:', userId);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/whatsapp/chats/${userId}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        console.log('Chats response:', data);

        if (data.success) {
          const loadedChats = data.chats || [];
          console.log('Chats loaded:', loadedChats.length);
          setChats(loadedChats);
          
          // Select first chat if available and no chat is currently selected
          if (loadedChats.length > 0 && !selectedChatId) {
            setSelectedChatId(loadedChats[0].id);
            loadMessages(userId, loadedChats[0].id);
          }
        } else {
          const errorMsg = data.message || data.error || 'Failed to load conversations';
          setChatError(errorMsg);
          console.error('Failed to load chats:', errorMsg);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      const errorMsg = error.message || 'Failed to load conversations. Please check your connection.';
      setChatError(errorMsg);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const loadMessages = async (userId, chatId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/chats/${userId}/${chatId}/messages`);
      const data = await response.json();

      if (data.success) {
        setMessages(prev => ({
          ...prev,
          [chatId]: data.messages
        }));
      } else {
        console.error('Failed to load messages:', data.message || data.error);
        // If client not connected, try to restore session
        if (data.error === 'Client not connected' || data.message?.includes('not connected')) {
          console.log('Client not connected, attempting to restore session...');
          // Check session and restore if needed
          const sessionResponse = await fetch(`${API_BASE_URL}/api/whatsapp/check-session/${userId}`);
          const sessionData = await sessionResponse.json();
          
          if (sessionData.success && sessionData.connected) {
            // Retry loading messages after a short delay
            setTimeout(() => {
              loadMessages(userId, chatId);
            }, 2000);
          }
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId && selectedChatId) {
      loadMessages(userId, selectedChatId);
    }
  }, [selectedChatId]);

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

  const selectedChat = chats.find((chat) => chat.id === selectedChatId) || null;
  const currentMessages = selectedChatId ? messages[selectedChatId] || [] : [];

  const handleSendMessage = async (text) => {
    if (!selectedChatId) return;

    const userId = localStorage.getItem('userId');
    if (!userId) return;

    // Optimistically add message to UI
    const tempMessage = {
      id: `temp_${Date.now()}`,
      text,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      sender: 'me',
      status: 'sending',
    };

    setMessages((prev) => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), tempMessage],
    }));

    try {
      // Send message via API
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/chats/${userId}/${selectedChatId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();

      if (data.success) {
        // Reload messages to get the actual sent message
        await loadMessages(userId, selectedChatId);
      } else {
        // Remove temp message and show error
        setMessages((prev) => ({
          ...prev,
          [selectedChatId]: (prev[selectedChatId] || []).filter(msg => msg.id !== tempMessage.id),
        }));
        console.error('Failed to send message:', data.message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message
      setMessages((prev) => ({
        ...prev,
        [selectedChatId]: (prev[selectedChatId] || []).filter(msg => msg.id !== tempMessage.id),
      }));
    }
  };

  const handleSnippetDoubleClick = (snippet) => {
    handleSendMessage(snippet.content);
  };

  const handleLogout = () => {
    // Clear authentication state
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
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
                onClick={() => {
                  const userId = localStorage.getItem('userId');
                  if (userId) {
                    loadChats(userId);
                  }
                }}
                className="text-gray-600 hover:text-emerald-600"
                title="Refresh chats"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
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
          {chatError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg m-4">
              <p className="text-sm text-red-800">{chatError}</p>
              <button
                onClick={() => {
                  const userId = localStorage.getItem('userId');
                  if (userId) {
                    loadChats(userId);
                  }
                }}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Retry
              </button>
            </div>
          )}
          <ChatList
            chats={chats}
            selectedChatId={selectedChatId}
            onSelectChat={(chatId) => {
              setSelectedChatId(chatId);
              const userId = localStorage.getItem('userId');
              if (userId) {
                loadMessages(userId, chatId);
              }
            }}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isLoading={isLoadingChats}
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
      
      {/* Loading Dialog - Show while conversations are loading */}
      <Dialog open={isLoadingChats} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Loading Conversations</DialogTitle>
            <DialogDescription>
              Please wait while we load your WhatsApp conversations...
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-sm text-gray-600 text-center">
              This may take a few moments depending on the number of conversations
            </p>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* WhatsApp Account Details Dialog */}
      <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>WhatsApp Account Details</DialogTitle>
          <DialogDescription>
            View your connected WhatsApp Business account information
          </DialogDescription>
        </DialogHeader>
        {whatsappAccount ? (
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="account" className="space-y-4 mt-4">
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
            </TabsContent>
            
            <TabsContent value="statistics" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-900">Total Conversations</p>
                      <p className="text-xs text-emerald-700 mt-1">Number of chats in your WhatsApp account</p>
                    </div>
                    <div className="text-3xl font-bold text-emerald-600">
                      {conversationCount !== null ? conversationCount : '...'}
                    </div>
                  </div>
                </div>
                
                {conversationCount !== null && (
                  <div className="text-center text-sm text-gray-600">
                    <p>You have {conversationCount} {conversationCount === 1 ? 'conversation' : 'conversations'} in your WhatsApp account</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600">Loading account information...</p>
          </div>
        )}
        
        <div className="pt-4 border-t mt-4">
          <Button
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleWhatsAppLogout}
          >
            Logout from WhatsApp
          </Button>
        </div>
        </DialogContent>
      </Dialog>
    </DndProvider>
  );
}
