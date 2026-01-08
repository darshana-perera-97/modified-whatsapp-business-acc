import { useState } from 'react';
import { Search, GripVertical, FileText, MessageCircle, Clock, Calendar, Wrench, DollarSign, Heart, AlertCircle } from 'lucide-react';
import { useDrag } from 'react-dnd';
import { Snippet } from '../types/types';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { toast } from 'sonner';

interface SnippetsPanelProps {
  snippets: Snippet[];
  onSnippetDoubleClick: (snippet: Snippet) => void;
}

function SnippetItem({ snippet, onDoubleClick }: { snippet: Snippet; onDoubleClick: () => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'snippet',
    item: { snippet },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const getIcon = (iconName: string) => {
    const icons: { [key: string]: JSX.Element } = {
      MessageCircle: <MessageCircle className="w-4 h-4" />,
      Clock: <Clock className="w-4 h-4" />,
      FileText: <FileText className="w-4 h-4" />,
      Calendar: <Calendar className="w-4 h-4" />,
      Wrench: <Wrench className="w-4 h-4" />,
      DollarSign: <DollarSign className="w-4 h-4" />,
      Heart: <Heart className="w-4 h-4" />,
      AlertCircle: <AlertCircle className="w-4 h-4" />,
    };
    return icons[iconName] || <FileText className="w-4 h-4" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={drag}
            onDoubleClick={onDoubleClick}
            className={`group p-3 bg-white border border-gray-200 rounded-lg cursor-move hover:border-emerald-300 hover:shadow-sm transition-all ${
              isDragging ? 'opacity-50 scale-95' : ''
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="text-gray-400 group-hover:text-emerald-500 transition-colors mt-0.5">
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-emerald-600">{getIcon(snippet.icon || 'FileText')}</div>
                  <h4 className="font-medium text-sm text-gray-900 truncate">{snippet.title}</h4>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">{snippet.content}</p>
                <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                  {snippet.category}
                </Badge>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="text-sm mb-1 font-medium">Double-click to send</p>
          <p className="text-xs text-gray-500">Or drag to the message input</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function SnippetsPanel({ snippets, onSnippetDoubleClick }: SnippetsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSnippets = snippets.filter(
    (snippet) =>
      snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 border-l border-gray-200">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <h2 className="font-semibold text-gray-900 mb-3">Quick Replies</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search snippets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200 text-sm focus-visible:ring-emerald-500"
          />
        </div>
      </div>

      {/* Snippets List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {filteredSnippets.map((snippet) => (
            <SnippetItem
              key={snippet.id}
              snippet={snippet}
              onDoubleClick={() => {
                onSnippetDoubleClick(snippet);
                toast.success('Snippet sent!');
              }}
            />
          ))}
          {filteredSnippets.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No snippets found</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 bg-white border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          {snippets.length} saved snippet{snippets.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
