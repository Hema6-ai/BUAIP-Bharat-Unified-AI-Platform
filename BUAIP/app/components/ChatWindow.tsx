"use client";

import React, { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
}

interface ChatWindowProps {
  messages: Message[];
  children: React.ReactNode;
}

export default function ChatWindow({ messages, children }: ChatWindowProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto chat-scroll px-4 md:px-8 py-6 md:py-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="popLayout">{children}</AnimatePresence>
        <div ref={endRef} />
      </div>
    </div>
  );
}
