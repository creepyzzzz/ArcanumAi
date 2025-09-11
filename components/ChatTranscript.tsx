'use client';

import { useEffect, useRef, useLayoutEffect } from 'react';
import ChatMessage from './ChatMessage';
import { Message, FileRef } from '@/types';

interface ChatTranscriptProps {
  messages: Message[];
  files: FileRef[];
  isStreaming: boolean;
  onOpenFileInCanvas: (fileId: string) => void;
  isMobile?: boolean;
}

export function ChatTranscript({ messages, files, isStreaming, onOpenFileInCanvas, isMobile }: ChatTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      const threshold = 100;
      const isAtBottom = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < threshold;
      isAtBottomRef.current = isAtBottom;
    }
  }, [messages]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl && isAtBottomRef.current) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
  }, [messages]);


  if (messages.length === 0) {
    return (
      // --- MODIFICATION START ---
      // Removed the animated glow div and changed the gradient to a medium red.
      <div className={`relative flex flex-col items-center justify-center text-center overflow-hidden mb-8 ${isMobile ? 'h-full' : ''}`}>
        <h1 className="text-2xl md:text-5xl font-bold font-poppins text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-white bg-[200%_auto] animate-gradient-animation">
          Hello user!
        </h1>
      </div>
      // --- MODIFICATION END ---
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto custom-scrollbar p-4"
    >
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            files={files}
            isLastMessage={index === messages.length - 1}
            isStreaming={isStreaming && index === messages.length - 1}
            onOpenFileInCanvas={onOpenFileInCanvas}
          />
        ))}
      </div>
    </div>
  );
}
