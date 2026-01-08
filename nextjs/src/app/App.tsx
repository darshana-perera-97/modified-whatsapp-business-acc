import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';
import { SnippetsPanel } from './components/SnippetsPanel';
import { mockChats, mockMessages, mockSnippets } from './data/mockData';
import { Message, Snippet } from './types/types';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>(mockMessages);

  const selectedChat = mockChats.find((chat) => chat.id === selectedChatId) || null;
  const currentMessages = selectedChatId ? messages[selectedChatId] || [] : [];

  const handleSendMessage = (text: string) => {
    if (!selectedChatId) return;

    const newMessage: Message = {
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

  const handleSnippetDoubleClick = (snippet: Snippet) => {
    handleSendMessage(snippet.content);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        {/* Left Panel - Chat List (30%) */}
        <div className="w-[30%] flex-shrink-0">
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
    </DndProvider>
  );
}
