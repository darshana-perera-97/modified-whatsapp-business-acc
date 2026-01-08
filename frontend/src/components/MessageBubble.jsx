import { Check, CheckCheck } from 'lucide-react';

export function MessageBubble({ message }) {
  const isMe = message.sender === 'me';

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`px-4 py-2 rounded-lg ${
            isMe
              ? 'bg-emerald-500 text-white rounded-br-none'
              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
        </div>
        <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs text-gray-500">{message.timestamp}</span>
          {isMe && message.status && (
            <div className="text-gray-500">
              {message.status === 'sent' && <Check className="w-3 h-3" />}
              {message.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
              {message.status === 'read' && <CheckCheck className="w-3 h-3 text-emerald-500" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

