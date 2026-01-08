import { useState } from 'react';
import { Paperclip, Phone, Send, Smile, Video, MoreVertical } from 'lucide-react';
import { useDrop } from 'react-dnd';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { toast } from 'sonner';

export function ChatWindow({ chat, messages, onSendMessage }) {
  const [inputValue, setInputValue] = useState('');

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'snippet',
    drop: (item) => {
      setInputValue(item.snippet.content);
      toast.success('Snippet added to input field');
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!chat) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="w-64 h-64 mx-auto mb-6 opacity-20">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle cx="100" cy="100" r="80" fill="none" stroke="#10b981" strokeWidth="2" />
              <path
                d="M60 90 L80 110 L140 70"
                fill="none"
                stroke="#10b981"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-2xl text-gray-400 mb-2">Select a conversation</h2>
          <p className="text-gray-400">Choose a chat from the list to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarImage src={chat.avatar} alt={chat.name} />
              <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {chat.status === 'online' && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            )}
          </div>
          <div>
            <h2 className="font-medium text-gray-900">{chat.name}</h2>
            <p className="text-xs text-gray-500">
              {chat.status === 'online' ? 'Online' : chat.status === 'away' ? 'Away' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-gray-600 hover:text-emerald-600">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-600 hover:text-emerald-600">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-600 hover:text-emerald-600">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-6">
          <div className="space-y-1">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div
        ref={drop}
        className={`p-4 bg-white border-t border-gray-200 transition-colors ${
          isOver ? 'bg-emerald-50' : ''
        }`}
      >
        <div className="flex items-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-600 hover:text-emerald-600 flex-shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder={isOver ? 'Drop snippet here...' : 'Type a message...'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-10 focus-visible:ring-emerald-500"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-600 hover:text-emerald-600"
            >
              <Smile className="w-5 h-5" />
            </Button>
          </div>
          <Button
            onClick={handleSend}
            size="icon"
            className="bg-emerald-500 hover:bg-emerald-600 text-white flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

