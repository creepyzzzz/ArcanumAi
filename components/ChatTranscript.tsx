'use client';

import { useEffect, useRef, useLayoutEffect } from 'react';
import ChatMessage from './ChatMessage';
import { Message, FileRef } from '@/types';

interface ChatTranscriptProps {
  messages: Message[];
  files: FileRef[];
  isStreaming: boolean;
  onOpenFileInCanvas: (fileId: string) => void;
}

export function ChatTranscript({ messages, files, isStreaming, onOpenFileInCanvas }: ChatTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // --- UPDATE: This logic now intelligently handles auto-scrolling ---

  // Before the component updates with new messages, we check the scroll position.
  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      // We consider the user "at the bottom" if they are within 100 pixels of it.
      const threshold = 100;
      const isAtBottom = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < threshold;
      isAtBottomRef.current = isAtBottom;
    }
  }, [messages]);

  // After new messages are rendered, we scroll down only if the user was already at the bottom.
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl && isAtBottomRef.current) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
  }, [messages]);


  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
          <p className="text-sm">
            Ask me anything or upload files to get started. I can help you with coding, writing, analysis, and more.
          </p>
        </div>
      </div>
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
