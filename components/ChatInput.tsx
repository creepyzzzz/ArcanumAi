'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModelSelector } from '@/components/ModelSelector';
import { SpeechService, WaveformVisualizer } from '../lib/speech';
import { MAX_FILE_COUNT, formatFileSize } from '../lib/file-utils';
import { ProviderAdapter } from '../lib/providers/base';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  Lock,
  Unlock,
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

interface ChatInputProps {
  onSendMessage: (text: string, isCanvasMode: boolean, attachmentIds?: string[]) => void;
  onFileUpload: (files: File[]) => Promise<string[]>;
  onStopGenerating: () => void;
  isStreaming: boolean;
  currentModel: string;
  onModelChange: (modelId: string) => void;
  providers: ProviderAdapter[];
  isModelLockEnabled: boolean;
  isModelLockedInThread: boolean;
  onModelLockChange: (enabled: boolean) => void;
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
  isModelLockEnabled,
  isModelLockedInThread,
  onModelLockChange,
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
  const [isCanvasMode, setIsCanvasMode] = useState(false);
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
        // Reset height to auto to allow the textarea to shrink if text is deleted
        textarea.style.height = 'auto';
        // Set the height to the scrollHeight to fit the content
        textarea.style.height = `${textarea.scrollHeight}px`;
        // Ensure the cursor is visible when typing
        textarea.scrollTop = textarea.scrollHeight;
    }
  }, [displayText]);

  // Robust scroll-into-view logic for mobile keyboard
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

    onSendMessage(text.trim(), isCanvasMode, attachmentIds);
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
  
  const toggleCanvasMode = () => {
    setIsCanvasMode(prev => !prev);
    setShowOptions(false);
  };

  const handleFocus = () => {
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
    if (file.type.startsWith('text/')) {
      return <FileText className="h-4 w-4" />;
    }
    return <FileIcon className="h-4 w-4" />;
  };

  return (
    <div ref={chatInputRef} className="mx-auto w-full max-w-4xl px-4">
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

      <form onSubmit={handleSubmit}>
        <div
          className={`relative border-2 bg-background rounded-3xl shadow-xl shadow-black/10 dark:shadow-2xl dark:shadow-white/15 transition-all duration-300 flex flex-col focus-within:border-primary ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* This grid structure is the key to the reliable boundary */}
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
                <div className="relative pointer-events-auto">
                    <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowOptions(prev => !prev)}
                    disabled={isStreaming}
                    className="h-9 w-9"
                    >
                    <Plus className={`h-5 w-5 transition-transform duration-200 ${showOptions ? 'rotate-45' : ''}`} />
                    </Button>
                    <AnimatePresence>
                    {showOptions && (
                        <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 flex flex-col gap-2"
                        >
                        <Button type="button" className="gap-2" onClick={toggleCanvasMode}>
                            <Code className="h-4 w-4" />
                            Canvas
                        </Button>
                        <Button type="button" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                            <Paperclip className="h-4 w-4" />
                            File
                        </Button>
                        </motion.div>
                    )}
                    </AnimatePresence>
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
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t mt-auto">
            <div className={`text-xs md:text-sm border bg-background rounded-xl shadow-sm hover:bg-muted/50 transition-colors border-border/50 ${isModelLockedInThread ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <ModelSelector
                providers={providers}
                selectedModel={currentModel}
                onModelChange={onModelChange}
                disabled={isModelLockedInThread}
                isSummarizing={isSummarizing}
              />
            </div>
            <div className="flex items-center space-x-1 md:space-x-2">
              <div className="transform scale-75 md:scale-100 origin-right">
                  <Switch
                    id="model-lock-switch"
                    checked={isModelLockEnabled}
                    onCheckedChange={onModelLockChange}
                  />
              </div>
              <Label htmlFor="model-lock-switch" className="flex items-center gap-1 text-xs text-muted-foreground -ml-2 md:ml-0">
                {isModelLockEnabled ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                <span className="hidden sm:inline">Lock Model</span>
              </Label>
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
