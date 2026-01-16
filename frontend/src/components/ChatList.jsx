import { Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

export function ChatList({ chats = [], selectedChatId, onSelectChat, searchQuery, onSearchChange, isLoading = false }) {
  const filteredChats = (chats || []).filter(chat =>
    (chat.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200 focus-visible:ring-emerald-500"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <p>Loading conversations...</p>
            </div>
          ) : filteredChats.length === 0 && chats.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No conversations found</p>
              <p className="text-xs mt-2">Start a conversation on WhatsApp to see it here</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No conversations match your search</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                selectedChatId === chat.id ? 'bg-emerald-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={chat.avatar} alt={chat.name} />
                    <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {chat.status === 'online' && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-gray-900 truncate">{chat.name}</h3>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{chat.timestamp}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {chat.lastMessageImage ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="relative w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                          <img 
                            src={chat.lastMessageImage} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                        <p className="text-sm text-gray-600 truncate flex-1">{chat.lastMessage}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 truncate flex-1">{chat.lastMessage}</p>
                    )}
                    {chat.unread && chat.unread > 0 && (
                      <span className="ml-2 flex-shrink-0 w-5 h-5 flex items-center justify-center bg-emerald-500 text-white text-xs rounded-full">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

