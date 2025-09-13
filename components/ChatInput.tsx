'use client';

import { useState, useRef, useEffect, CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModelSelector } from '@/components/ModelSelector';
import { SpeechService, WaveformVisualizer } from '../lib/speech';
import { MAX_FILE_COUNT, formatFileSize } from '../lib/file-utils';
import { ProviderAdapter } from '../lib/providers/base';
import {
  Plus,
  Send,
  Mic,
  X,
  FileText,
  Image as ImageIcon,
  FileIcon,
  Square,
  Code,
  Paperclip,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (text: string, isCanvasMode: boolean, attachmentIds?: string[]) => void;
  onFileUpload: (files: File[]) => Promise<string[]>;
  onStopGenerating: () => void;
  isStreaming: boolean;
  currentModel: string;
  onModelChange: (modelId: string) => void;
  providers: ProviderAdapter[];
  text: string;
  onTextChange: (text: string | ((prevText: string) => string)) => void;
  onEnhancePrompt: () => void;
  isEnhancing: boolean;
  isSummarizing: boolean;
}

export function ChatInput({
  onSendMessage,
  onFileUpload,
  onStopGenerating,
  isStreaming,
  currentModel,
  onModelChange,
  providers,
  text,
  onTextChange,
  onEnhancePrompt,
  isEnhancing,
  isSummarizing,
}: ChatInputProps) {
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  // --- MODIFICATION START ---
  // The isCanvasMode state is no longer needed and has been removed.
  // const [isCanvasMode, setIsCanvasMode] = useState(false);
  // --- MODIFICATION END ---
  const [animationKey, setAnimationKey] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speechServiceRef = useRef<SpeechService | null>(null);
  const waveformRef = useRef<WaveformVisualizer | null>(null);
  const chatInputRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);

  const prevIsEnhancing = useRef(isEnhancing);
  useEffect(() => {
    if (prevIsEnhancing.current === true && isEnhancing === false) {
      setAnimationKey(prev => prev + 1);
    }
    prevIsEnhancing.current = isEnhancing;
  }, [isEnhancing]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (SpeechService.isSupported()) {
      speechServiceRef.current = new SpeechService();
    }
  }, []);

  useEffect(() => {
    if (isListening && canvasRef.current) {
      if (!waveformRef.current) {
        waveformRef.current = new WaveformVisualizer(canvasRef.current);
      }
      waveformRef.current.start();
    }
  }, [isListening]);

  const displayText = text + (interimTranscript ? ` ${interimTranscript}` : '');
  const canSend = (displayText.trim().length > 0 || attachedFiles.length > 0) && !isStreaming;
  
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
        textarea.scrollTop = textarea.scrollHeight;
    }
  }, [displayText]);

  useEffect(() => {
    const handleResize = () => {
      if (isFocusedRef.current && window.innerWidth < 768) {
        setTimeout(() => {
          chatInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;

    let attachmentIds: string[] = [];
    if (attachedFiles.length > 0) {
      attachmentIds = await onFileUpload(attachedFiles);
      setAttachedFiles([]);
    }

    // --- MODIFICATION START ---
    // The 'isCanvasMode' argument is now hardcoded to false.
    onSendMessage(text.trim(), false, attachmentIds);
    // --- MODIFICATION END ---
    setInterimTranscript('');
    setShowOptions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    e.target.value = '';
  };

  const addFiles = (files: File[]) => {
    const newFiles = [...attachedFiles, ...files].slice(0, MAX_FILE_COUNT);
    setAttachedFiles(newFiles);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };
  
  // --- MODIFICATION START ---
  // The toggleCanvasMode function is no longer needed and has been removed.
  // const toggleCanvasMode = () => {
  //   setIsCanvasMode(prev => !prev);
  //   setShowOptions(false);
  // };
  // --- MODIFICATION END ---

  // --- FIX: Close file options pop-up when focusing on the input ---
  const handleFocus = () => {
    if (showOptions) setShowOptions(false);
    isFocusedRef.current = true;
    if (window.innerWidth < 768) {
      setTimeout(() => {
        chatInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 300);
    }
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
  };

  const toggleSpeech = () => {
    if (!speechServiceRef.current) return;

    if (isListening) {
      speechServiceRef.current.stopListening();
      waveformRef.current?.stop();
      waveformRef.current = null;
      setIsListening(false);
    } else {
      setIsListening(true);
      speechServiceRef.current.startListening(
        (transcript, isFinal) => {
          if (isFinal) {
            onTextChange((prevText: string) => (prevText + ' ' + transcript).trim());
            setInterimTranscript('');
          } else {
            setInterimTranscript(transcript);
          }
        },
        (error) => {
          console.error('Speech recognition error:', error);
          setIsListening(false);
          waveformRef.current?.stop();
          waveformRef.current = null;
        },
        null,
        () => {
          setIsListening(false);
          waveformRef.current?.stop();
          waveformRef.current = null;
        }
      );
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (file.type.startsWith('text/')) return <FileText className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  };

  return (
    <div ref={chatInputRef} className="mx-auto w-full max-w-4xl px-4 py-2">
      {attachedFiles.length > 0 && (
        <div className="mb-2">
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm"
              >
                {getFileIcon(file)}
                <span className="truncate max-w-32">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={
          {
            "--bg": isDragging
              ? "hsla(var(--primary-hsl), 0.05)"
              : "hsl(var(--background))",
          } as CSSProperties
        }
        className={cn(
          "group relative z-0",
          "[background:var(--bg)]", // Use CSS variable for background
          "rounded-3xl shadow-xl shadow-black/10 transition-all duration-300 flex flex-col",
          "dark:shadow-[0_10px_50px_-10px_rgba(255,255,255,0.2)] dark:focus-within:shadow-[0_10px_50px_-10px_hsla(210,40%,98%,0.4)]",
          "border-primary",
          "border-2",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="relative grid grid-cols-1 grid-rows-1">
          <Textarea
            ref={textareaRef}
            value={displayText}
            onChange={(e) => {
              onTextChange(e.target.value);
              setInterimTranscript('');
            }}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="What do you want to build?"
            disabled={isStreaming}
            style={{ maxHeight: '40vh' }}
            className={`col-start-1 row-start-1 w-full text-base overflow-y-auto resize-none border-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent rounded-t-3xl transition-all duration-300 pt-4 pb-10 pl-4 pr-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
              interimTranscript ? 'text-muted-foreground' : ''
            }`}
          />
          
          <div className="col-start-1 row-start-1 self-end h-12 flex items-center gap-1 px-3 pointer-events-none">
              <div className="relative pointer-events-auto flex items-center gap-1">
                  <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowOptions(prev => !prev)}
                  disabled={isStreaming}
                  className="h-9 w-9 rounded-full"
                  >
                  <Plus className={`h-5 w-5 transition-transform duration-200 ${showOptions ? 'rotate-45' : ''}`} />
                  </Button>
                  {/* --- MODIFICATION START --- */}
                  {/* The Canvas button has been removed, and the animation and styling */}
                  {/* for the remaining File button have been updated for a cleaner look. */}
                  <AnimatePresence>
                  {showOptions && (
                      <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full mb-2"
                      >
                      <Button 
                        type="button" 
                        className="gap-2 rounded-full shadow-lg" 
                        onClick={() => fileInputRef.current?.click()}
                      >
                          <Paperclip className="h-4 w-4" />
                          File
                      </Button>
                      </motion.div>
                  )}
                  </AnimatePresence>
                  {/* --- MODIFICATION END --- */}
                  
                  <ModelSelector
                    providers={providers}
                    selectedModel={currentModel}
                    onModelChange={onModelChange}
                    disabled={isStreaming || isSummarizing}
                    isSummarizing={isSummarizing}
                  />
              </div>

              <div className="ml-auto flex items-center gap-1 pointer-events-auto">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={onEnhancePrompt}
                          disabled={!text.trim() || isEnhancing || isStreaming}
                          className="h-9 w-9"
                        >
                          {isEnhancing ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Sparkles className="h-5 w-5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Enhance Prompt</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                  {isClient && SpeechService.isSupported() && (
                      <Tooltip>
                      <TooltipTrigger asChild>
                          <div
                          onClick={toggleSpeech}
                          className={`h-9 w-9 rounded-full flex items-center justify-center cursor-pointer transition-colors ${ isStreaming ? 'cursor-not-allowed' : isListening ? 'bg-red-500/10' : 'hover:bg-muted'}`}
                          >
                          {isListening ? (
                              <canvas
                                  ref={canvasRef}
                                  width="20"
                                  height="20"
                              />
                          ) : (
                              <Mic className="h-5 w-5" />
                          )}
                          </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {isListening ? 'Stop recording' : 'Start recording'}
                        </p>
                      </TooltipContent>
                      </Tooltip>
                  )}
                  </TooltipProvider>

                  {isStreaming ? (
                  <TooltipProvider>
                      <Tooltip>
                      <TooltipTrigger asChild>
                          <Button
                          type="button"
                          size="icon"
                          onClick={onStopGenerating}
                          className="h-9 w-9 bg-destructive text-destructive-foreground rounded-full"
                          >
                          <Square className="h-5 w-5" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Stop generating</p>
                      </TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
                  ) : (
                  <Button
                      type="submit"
                      size="icon"
                      disabled={!canSend}
                      className="h-9 w-9 bg-primary text-primary-foreground rounded-full"
                  >
                      <Send className="h-5 w-5" />
                  </Button>
                  )}
              </div>
          </div>
        </div>
      </form>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
          <p className="text-primary font-medium">Drop files here</p>
        </div>
      )}
    </div>
  );
}
