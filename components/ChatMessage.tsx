'use client';

import { useState, useRef, useMemo, memo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2canvas from 'html2canvas';
import { Button } from './ui/button';
import { MessageAttachments } from './MessageAttachments';
import { Message, FileRef } from '@/types';
import CodeBlock from './CodeBlock';
import {
  Copy,
  Check,
  Sparkles,
  Download,
  FileDown,
} from 'lucide-react';
import { PluggableList } from 'unified';
import { cn } from "@/lib/utils";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "./magicui/reasoning";
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessageProps {
  message: Message;
  files: FileRef[];
  isLastMessage: boolean;
  isStreaming: boolean;
  onOpenFileInCanvas: (fileId: string) => void;
  supportsReasoning?: boolean;
}

const ChatMessage = ({ message, files, isLastMessage, isStreaming, onOpenFileInCanvas, supportsReasoning }: ChatMessageProps) => {
  const [copied, setCopied] = useState(false);
  const messageContentRef = useRef<HTMLDivElement>(null);

  const attachedFiles = useMemo(() => message.attachmentIds
    ? files.filter(file => message.attachmentIds!.includes(file.id))
    : [], [files, message.attachmentIds]);

  const generatedFile = useMemo(() => message.generatedFileId
    ? files.find(file => file.id === message.generatedFileId)
    : null, [files, message.generatedFileId]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err)
      {
      console.error('Failed to copy text: ', err);
    }
  };

  const downloadAsMarkdown = () => {
    const blob = new Blob([message.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tafo-response.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsPng = () => {
    if (messageContentRef.current) {
      html2canvas(messageContentRef.current, {
        backgroundColor: null,
        useCORS: true,
      }).then(canvas => {
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `Tafo-response.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const showThinkingAnimation = isLastMessage && isStreaming && message.role === 'assistant';

  const customComponents: Components = {
    code(props) {
      const { children, className, ...rest } = props;
      const match = /language-(\w+)/.exec(className || '');
      const codeText = String(children).replace(/\n$/, '');

      return match ? (
        <CodeBlock language={match[1]} value={codeText} />
      ) : (
        <code {...rest} className="bg-muted px-1 py-0.5 rounded-sm">
          {children}
        </code>
      );
    },
  };

  const showReasoningComponent = supportsReasoning && message.role === 'assistant' && message.hasOwnProperty('reasoning');

  return (
    <div className={`group flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex-1 space-y-2 min-w-0 max-w-full md:max-w-[85%] ${message.role === 'user' ? 'text-right' : ''}`}>
        <div className={`inline-block max-w-full ${ 
          message.role === 'user'
            ? 'bg-muted text-foreground rounded-2xl rounded-tr-md px-4 py-3'
            : ''
        }`}>
          {attachedFiles.length > 0 && <MessageAttachments files={attachedFiles} />}

          {showThinkingAnimation && !showReasoningComponent && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span>Thinking...</span>
            </div>
          )}

          {showReasoningComponent && (
            <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Reasoning isStreaming={isStreaming && isLastMessage}>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
                  <ReasoningTrigger>
                    <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                      {isStreaming && isLastMessage ? (
                        <>
                          <Sparkles className="h-5 w-5" />
                          <span>Thinking...</span>
                        </>
                      ) : (
                        <span>Show Reasoning</span>
                      )}
                    </div>
                  </ReasoningTrigger>
                  <ReasoningContent markdown>
                    {message.reasoning}
                  </ReasoningContent>
                </div>
              </Reasoning>
            </div>
          )}

          <div ref={messageContentRef} className="text-left message-content">
            {message.role === 'user' ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm] as PluggableList}
                components={customComponents}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        </div>

        {!showThinkingAnimation && (
          <div className={`flex items-center gap-2 text-xs text-muted-foreground ${ 
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}>
            {message.role === 'user' && (
              <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  animate={{ scale: copied ? [1, 1.1, 1] : 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(message.content)}>
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Check className="h-3 w-3" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Copy className="h-3 w-3" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              </div>
            )}

            <span>{formatTime(message.createdAt)}</span>

            {message.role === 'assistant' && !isStreaming && (
              <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  animate={{ scale: copied ? [1, 1.1, 1] : 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(message.content)}>
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Check className="h-3 w-3" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Copy className="h-3 w-3" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={downloadAsMarkdown}>
                  <FileDown className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={downloadAsPng}>
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ChatMessage);
