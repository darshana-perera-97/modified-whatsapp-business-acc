import { Chat, Message, Snippet } from '../types/types';

export const mockChats: Chat[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    lastMessage: 'Thanks for the quick response!',
    timestamp: '2:45 PM',
    unread: 2,
    status: 'online'
  },
  {
    id: '2',
    name: 'Michael Chen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    lastMessage: 'Can we schedule a meeting for tomorrow?',
    timestamp: '1:30 PM',
    status: 'online'
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
    lastMessage: 'Perfect! I\'ll send the documents over.',
    timestamp: '11:20 AM',
    unread: 1,
    status: 'away'
  },
  {
    id: '4',
    name: 'David Kim',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
    lastMessage: 'The project looks great 👍',
    timestamp: 'Yesterday',
    status: 'offline'
  },
  {
    id: '5',
    name: 'Jessica Taylor',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop',
    lastMessage: 'Let me know if you need anything else',
    timestamp: 'Yesterday',
    status: 'offline'
  },
  {
    id: '6',
    name: 'Alex Martinez',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
    lastMessage: 'Sounds good to me!',
    timestamp: 'Monday',
    status: 'offline'
  },
  {
    id: '7',
    name: 'Rachel Green',
    avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop',
    lastMessage: 'I\'ll check and get back to you',
    timestamp: 'Monday',
    status: 'offline'
  },
  {
    id: '8',
    name: 'James Wilson',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop',
    lastMessage: 'Thanks for your help!',
    timestamp: 'Sunday',
    status: 'offline'
  }
];

export const mockMessages: { [key: string]: Message[] } = {
  '1': [
    {
      id: 'm1',
      text: 'Hi! I had a question about the new feature.',
      timestamp: '2:30 PM',
      sender: 'them'
    },
    {
      id: 'm2',
      text: 'Of course! What would you like to know?',
      timestamp: '2:32 PM',
      sender: 'me',
      status: 'read'
    },
    {
      id: 'm3',
      text: 'How do I access the customer dashboard?',
      timestamp: '2:33 PM',
      sender: 'them'
    },
    {
      id: 'm4',
      text: 'You can access it from the main menu. I\'ll send you a quick guide.',
      timestamp: '2:35 PM',
      sender: 'me',
      status: 'read'
    },
    {
      id: 'm5',
      text: 'Thanks for the quick response!',
      timestamp: '2:45 PM',
      sender: 'them'
    }
  ],
  '2': [
    {
      id: 'm1',
      text: 'Hey, do you have time for a quick call?',
      timestamp: '1:15 PM',
      sender: 'them'
    },
    {
      id: 'm2',
      text: 'Sure! Let me finish this task first.',
      timestamp: '1:20 PM',
      sender: 'me',
      status: 'read'
    },
    {
      id: 'm3',
      text: 'Can we schedule a meeting for tomorrow?',
      timestamp: '1:30 PM',
      sender: 'them'
    }
  ]
};

export const mockSnippets: Snippet[] = [
  {
    id: 's1',
    title: 'Welcome Message',
    content: 'Welcome to our customer support! How can I assist you today?',
    category: 'Greetings',
    icon: 'MessageCircle'
  },
  {
    id: 's2',
    title: 'Business Hours',
    content: 'Our business hours are Monday-Friday, 9 AM - 6 PM EST. We\'ll respond to your message as soon as possible.',
    category: 'Info',
    icon: 'Clock'
  },
  {
    id: 's3',
    title: 'Product Documentation',
    content: 'You can find our complete product documentation here: https://docs.example.com',
    category: 'Customer Resources',
    icon: 'FileText'
  },
  {
    id: 's4',
    title: 'Schedule Meeting',
    content: 'I\'d be happy to schedule a meeting with you. Please use this link to book a time that works best: https://calendar.example.com',
    category: 'Customer Resources',
    icon: 'Calendar'
  },
  {
    id: 's5',
    title: 'Technical Support',
    content: 'For technical issues, please visit our support portal at https://support.example.com or email tech@example.com',
    category: 'Customer Resources',
    icon: 'Wrench'
  },
  {
    id: 's6',
    title: 'Pricing Information',
    content: 'You can view our pricing plans and features at https://example.com/pricing. Let me know if you have specific questions!',
    category: 'Customer Resources',
    icon: 'DollarSign'
  },
  {
    id: 's7',
    title: 'Thank You',
    content: 'Thank you for contacting us! Please don\'t hesitate to reach out if you need anything else.',
    category: 'Greetings',
    icon: 'Heart'
  },
  {
    id: 's8',
    title: 'Escalation Notice',
    content: 'I\'m escalating your request to our senior team. They\'ll be in touch within 24 hours.',
    category: 'Info',
    icon: 'AlertCircle'
  }
];
