'use client';

import { useEffect, useRef, useLayoutEffect, useState } from 'react';
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
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const handleScroll = () => {
      const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= 100;
      if (isAtBottom) {
        setUserScrolledUp(false);
      }
    };

    const handleInteraction = () => {
      const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= 100;
      if (!isAtBottom) {
        setUserScrolledUp(true);
      }
    };

    element.addEventListener('scroll', handleScroll);
    element.addEventListener('wheel', handleInteraction);
    element.addEventListener('touchmove', handleInteraction);

    return () => {
      element.removeEventListener('scroll', handleScroll);
      element.removeEventListener('wheel', handleInteraction);
      element.removeEventListener('touchmove', handleInteraction);
    };
  }, []);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element && !userScrolledUp) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, userScrolledUp]);


  if (messages.length === 0) {
    return (
      <div className={isMobile ? "flex-1 flex justify-center items-center text-center" : "text-center"}>
        <div>
          <h1 className="text-5xl md:text-5xl font-bold font-poppins text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-white bg-[200%_auto] animate-gradient-animation">
            Hello user!
          </h1>
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
