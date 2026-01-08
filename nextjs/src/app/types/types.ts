export interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread?: number;
  status?: 'online' | 'offline' | 'away';
}

export interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: 'me' | 'them';
  status?: 'sent' | 'delivered' | 'read';
}

export interface Snippet {
  id: string;
  title: string;
  content: string;
  category: string;
  icon?: string;
}
