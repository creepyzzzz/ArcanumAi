'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  PanelGroup as ResizablePanelGroup,
  Panel as ResizablePanel,
  PanelResizeHandle as ResizableHandle,
  ImperativePanelHandle,
} from 'react-resizable-panels';
import dynamic from 'next/dynamic';
import { TopBar } from '@/components/TopBar';
import { LeftSidebar } from '@/components/LeftSidebar';
import { ChatTranscript } from '@/components/ChatTranscript';
import { ChatInput } from '@/components/ChatInput';
import { RightPanel } from '@/components/RightPanel';
import { Database } from '@/lib/db';
import { Storage } from '@/lib/storage';
import { Thread, Message, FileRef, DocMeta, Attachment } from '@/types';
import { getFileCategory } from '@/lib/file-utils';
import { OpenRouterAdapter } from '@/lib/providers/openrouter';
import { OpenAIAdapter } from '@/lib/providers/openai';
import { AnthropicAdapter } from '@/lib/providers/anthropic';
import { GeminiAdapter } from '@/lib/providers/gemini';
import { MistralAdapter } from '@/lib/providers/mistral';
import { GroqAdapter } from '@/lib/providers/groq';
import { BuiltInAdapter } from '@/lib/providers/builtin';
import { ProviderAdapter, ChatOptions } from '@/lib/providers/base';
import { useThreadStore } from '@/lib/state/threadStore';
import { checkHeuristics } from '@/lib/canvas/heuristics';
import { Button } from '@/components/ui/button';

const CanvasDialog = dynamic(() => import('@/components/canvas/CanvasDialog').then(mod => mod.CanvasDialog), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-background"><p>Loading Canvas...</p></div>,
});

const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, [breakpoint]);

  return isMobile;
};

type ModelDefinition = {
  id: string;
  label: string;
};

const extractCode = (text: string): { intro: string; code: string | null; lang: string | null } => {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)\n```/;
    const match = text.match(codeBlockRegex);
    if (match) {
        const intro = text.substring(0, match.index).trim();
        const lang = match[1] || null;
        const code = match[2].trim();
        return { intro, code, lang };
    }
    return { intro: text, code: null, lang: null };
};


class CustomAdapter implements ProviderAdapter {
  id = 'custom';
  displayName = 'Custom Models';
  needsKey = false;
  models: ModelDefinition[] = [];

  constructor(customModels: ModelDefinition[]) {
    this.models = customModels;
  }

  async sendChat(options: ChatOptions): Promise<{ text: string }> {
    throw new Error('CustomAdapter.sendChat should not be called directly.');
  }
}

const defaultProviders: ProviderAdapter[] = [
  new BuiltInAdapter(),
  new OpenRouterAdapter(),
  new OpenAIAdapter(),
  new AnthropicAdapter(),
  new GeminiAdapter(),
  new MistralAdapter(),
  new GroqAdapter(),
];

const defaultModel = 'builtin:mistral-7b-instruct';
type ApiKeys = { [key: string]: any };

export default function ChatPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<FileRef[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showFilesPanel, setShowFilesPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentModel, setCurrentModel] = useState(defaultModel);
  const [providerModels, setProviderModels] = useState<{ [key: string]: string[] }>({});
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [masterProviders, setMasterProviders] = useState<ProviderAdapter[]>(defaultProviders);

  const [chatInputText, setChatInputText] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);

  const [isSummarizing, setIsSummarizing] = useState(false);
  const contextSummaryRef = useRef<string | null>(null);

  const [showNewChatWarning, setShowNewChatWarning] = useState(false);
  
  // --- FIX FOR HYDRATION START ---
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  // --- FIX FOR HYDRATION END ---

  const isMobile = useIsMobile();

  const {
    setThreadState,
    createAndOpenDoc,
    getActiveDoc,
    updateDoc,
    openDocInCanvas,
  } = useThreadStore();

  const activeDoc = getActiveDoc();
  const isCanvasOpen = !!activeDoc;

  const generatedFileIdRef = useRef<string | null>(null);
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadCustomModels = () => {
      const apiKeys = Storage.getApiKeys();
      const customModels: ModelDefinition[] = [];

      for (const key in apiKeys) {
        if (key.startsWith('custom:')) {
          const modelId = key.substring('custom:'.length);
          customModels.push({ id: modelId, label: modelId });
        }
      }

      if (customModels.length > 0) {
        const customAdapter = new CustomAdapter(customModels);
        setMasterProviders(prev => [
          ...prev.filter(p => p.id !== 'custom'),
          customAdapter,
        ]);
      } else {
        setMasterProviders(prev => prev.filter(p => p.id !== 'custom'));
      }
    };

    loadCustomModels();
    window.addEventListener('api-keys-updated', loadCustomModels);
    return () => {
      window.removeEventListener('api-keys-updated', loadCustomModels);
    };
  }, []);

  const selectThread = useCallback(async (threadId: string) => {
    const thread = await Database.getThread(threadId);
    if (!thread) return;
    setSelectedThread(thread);
    setThreadState(threadId);
    const [threadMessages, threadFiles] = await Promise.all([
      Database.getThreadMessages(threadId),
      Database.getThreadFiles(threadId)
    ]);
    setMessages(threadMessages);
    setFiles(threadFiles);

    if (thread.modelLock) {
      setCurrentModel(thread.modelLock);
    }
    setChatInputText('');

    if (isMobile) {
      leftPanelRef.current?.collapse();
    }
  }, [isMobile, setThreadState]);

  const createNewThread = useCallback(async () => {
    if (selectedThread && messages.length === 0) {
      setShowNewChatWarning(true);
      return;
    }

    setMessages([]);
    setFiles([]);

    const newThread = await Database.createThread({
      title: 'New Chat', createdAt: Date.now(), updatedAt: Date.now(), modelLock: currentModel, messages: [], files: []
    });
    setThreads(prev => [newThread, ...prev]);
    await selectThread(newThread.id);
  }, [currentModel, messages.length, selectedThread, selectThread]);

  useEffect(() => {
    const loadData = async () => {
      const allThreads = await Database.getAllThreads();
      setThreads(allThreads);

      const prefs = Storage.getPreferences();
      setShowFilesPanel(prefs.showFilesPanel);
      setProviderModels(prefs.providerModels || {});

      const leftCollapsed = isMobile || prefs.isLeftSidebarCollapsed || false;
      setIsLeftSidebarCollapsed(leftCollapsed);

      if (leftPanelRef.current) {
        if (leftCollapsed) {
          leftPanelRef.current.collapse();
        } else {
          leftPanelRef.current.expand();
        }
      }

      const allModelIds = masterProviders.flatMap(p => p.models.map(m => `${p.id}:${m.id}`));
      if (prefs.selectedModel && allModelIds.includes(prefs.selectedModel)) {
        setCurrentModel(prefs.selectedModel);
      } else {
        setCurrentModel(defaultModel);
      }

      if (allThreads.length > 0 && !selectedThread) {
        await selectThread(allThreads[0].id);
      } else if (allThreads.length === 0) {
        await createNewThread();
      }
    };

    loadData();
  }, [masterProviders, isMobile, createNewThread, selectThread, selectedThread]);

  const availableProviders = useMemo(() => {
    const apiKeys = Storage.getApiKeys();
    const hasAnyPreferences = Object.values(providerModels).some(models => models.length > 0);

    const activeProviders = masterProviders.filter(provider => {
        if (provider.id === 'builtin' || provider.id === 'custom') {
            return true;
        }
        if (!provider.needsKey) {
            return true;
        }
        return !!apiKeys[provider.id];
    });

    return activeProviders.map(provider => {
        const userSelectedModels = providerModels[provider.id];

        if (userSelectedModels && userSelectedModels.length > 0) {
          const filteredModels = provider.models.filter(m => userSelectedModels.includes(m.id));
          return { ...provider, models: filteredModels };
        }

        if (apiKeys[provider.id] || !provider.needsKey) {
            return provider;
        }

        return { ...provider, models: [] };
    }).filter(p => p.models.length > 0);
  }, [providerModels, masterProviders]);

  useEffect(() => {
    const availableModelIds = availableProviders.flatMap(p => p.models.map(m => `${p.id}:${m.id}`));
    if (!availableModelIds.includes(currentModel)) {
      setCurrentModel(availableModelIds[0] || defaultModel);
    }
  }, [availableProviders, currentModel]);

  useEffect(() => {
    const panel = rightPanelRef.current;
    if (panel) {
      if (showFilesPanel) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  }, [showFilesPanel]);

  const updateThreadTitle = async (threadId: string, title: string) => {
    await Database.updateThread(threadId, { title, updatedAt: Date.now() });
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, title } : t));
    if (selectedThread?.id === threadId) {
      setSelectedThread(prev => prev ? { ...prev, title } : null);
    }
  };

  const duplicateThread = async (threadId: string) => {
    const data = await Database.exportThread(threadId);
    if (!data) return;
    
    const newThreadData = {
      ...data.thread,
      title: `${data.thread.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: [],
    };
    const newThread = await Database.createThread(newThreadData);

    for (const message of data.messages) {
      await Database.createMessage({ ...message, threadId: newThread.id });
    }

    const newFileIds: string[] = [];
    for (const file of data.files) {
      const originalBlob = await Database.getFileBlob(file.blobId);
      if (originalBlob) {
        const newFileRef = await Database.createFile({
          name: file.name,
          type: file.type,
          size: file.size,
          createdAt: file.createdAt,
        }, originalBlob as File);
        newFileIds.push(newFileRef.id);
      }
    }

    await Database.updateThread(newThread.id, { files: newFileIds });

    setThreads(prev => [newThread, ...prev]);
    await selectThread(newThread.id);
  };

  const deleteThread = async (threadId: string) => {
    const threadsBeforeDelete = [...threads];
    const currentIndex = threadsBeforeDelete.findIndex(t => t.id === threadId);
    await Database.deleteThread(threadId);
    const threadsAfterDelete = threadsBeforeDelete.filter(t => t.id !== threadId);
    setThreads(threadsAfterDelete);
    if (selectedThread?.id === threadId) {
      if (threadsAfterDelete.length > 0) {
        const newIndex = Math.max(0, currentIndex - 1);
        await selectThread(threadsAfterDelete[newIndex].id);
      } else {
        await createNewThread();
      }
    }
  };

  const exportThread = async (threadId: string, format: 'json') => {
    const data = await Database.exportThread(threadId);
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${data.thread.title.replace(/[^a-z0-9]/gi, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStopGenerating = () => {
    abortControllerRef.current?.abort();
  };

  const handleEnhancePrompt = async () => {
    if (!chatInputText.trim() || isEnhancing) return;

    setIsEnhancing(true);
    try {
      const response = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: chatInputText }),
      });

      if (!response.ok) {
        throw new Error('Failed to enhance prompt');
      }

      const data = await response.json();
      setChatInputText(data.enhancedPrompt);

    } catch (error) {
      console.error('Enhancement failed:', error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const generateTitleForNewChat = async (threadId: string, firstMessage: string) => {
    try {
      const response = await fetch('/api/summarize-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: firstMessage }),
      });
      if (response.ok) {
        const data = await response.json();
        await updateThreadTitle(threadId, data.title);
      } else {
        const fallbackTitle = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
        await updateThreadTitle(threadId, fallbackTitle);
      }
    } catch (error) {
      console.error('Failed to generate title:', error);
      const fallbackTitle = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
      await updateThreadTitle(threadId, fallbackTitle);
    }
  };

  const handleSendMessage = async (text: string, isCanvasMode: boolean, attachmentIds: string[] = []) => {
    let currentThread = selectedThread;
    let isNewChat = false;
    if (!currentThread) {
      const newThread = await Database.createThread({
        title: 'New Chat', createdAt: Date.now(), updatedAt: Date.now(), modelLock: currentModel, messages: [], files: []
      });
      setThreads(prev => [newThread, ...prev]);
      setSelectedThread(newThread);
      currentThread = newThread;
      isNewChat = true;
    }

    if (messages.length === 0) {
        isNewChat = true;
    }

    const userMessage = await Database.createMessage({
      threadId: currentThread.id, role: 'user', content: text, attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined, createdAt: Date.now()
    });
    setMessages(prev => [...prev, userMessage]);
    setChatInputText('');

    const placeholderMessage: Message = {
      id: `thinking-${Date.now()}`, threadId: currentThread.id, role: 'assistant', content: '', createdAt: Date.now()
    };
    setMessages(prev => [...prev, placeholderMessage]);

    setIsStreaming(true);
    generatedFileIdRef.current = null;

    if (isNewChat && text) {
      generateTitleForNewChat(currentThread.id, text);
    }

    const attachments: Attachment[] = [];
    if (attachmentIds.length > 0) {
        for (const id of attachmentIds) {
            const file = await Database.getFile(id);
            if (file) {
                attachments.push({
                    id: file.id,
                    name: file.name,
                    mime_type: file.type,
                    type: getFileCategory(file.type),
                    source: 'upload',
                    text: file.extractedText,
                    dataUrl: file.dataUrl,
                });
            }
        }
    }

    const [providerId, modelId] = currentModel.split(':');
    const apiKeys = Storage.getApiKeys() as ApiKeys;
    let streamedResponseText = '';
    let canvasTriggered = false;
    abortControllerRef.current = new AbortController();

    try {
      const apiMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [...messages, userMessage]
        .filter(m => !m.id.startsWith('thinking'))
        .map(msg => ({ role: msg.role, content: msg.content }));

      if (contextSummaryRef.current) {
        apiMessages.unshift({
          role: 'system',
          content: `PREVIOUS CONTEXT: The following is a summary of the conversation so far. Use it to inform your response.\n\nSUMMARY:\n${contextSummaryRef.current}`
        });
        contextSummaryRef.current = null;
      }

      if (providerId === 'builtin') {
        const response = await fetch('/api/relay/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages, model: modelId, attachments }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('No response body from API');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          streamedResponseText += decoder.decode(value);
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && (lastMessage.id.startsWith('thinking') || lastMessage.id.startsWith('streaming'))) {
              lastMessage.id = `streaming-${Date.now()}`;
              lastMessage.content = streamedResponseText;
            }
            return newMessages;
          });
        }

      } else if (providerId === 'custom') {
        const providerConfig = apiKeys[currentModel];
        if (typeof providerConfig !== 'object') {
          throw new Error('Custom provider configuration is invalid.');
        }

        const response = await fetch('/api/relay/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages, providerConfig, attachments }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }
        
        if (!response.body) {
          throw new Error('No response body from API');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          streamedResponseText += chunk;

          if (isCanvasMode && !canvasTriggered) {
             const { trigger } = checkHeuristics(streamedResponseText);
             if (trigger) {
               canvasTriggered = true;
               handleCanvasUpdate(streamedResponseText);
             }
           }

          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && (lastMessage.id.startsWith('thinking') || lastMessage.id.startsWith('streaming'))) {
              lastMessage.id = `streaming-${Date.now()}`;
              lastMessage.content = (isCanvasMode && canvasTriggered) ? extractCode(streamedResponseText).intro : streamedResponseText;
            }
            return newMessages;
          });
        }
      } else {
        const provider = masterProviders.find(p => p.id === providerId);
        if (!provider) throw new Error(`Provider not found: ${providerId}`);

        const result = await provider.sendChat({
          apiKey: apiKeys[providerId],
          model: modelId,
          messages: apiMessages,
          attachments,
          signal: abortControllerRef.current.signal,
          stream: (chunk) => {
            streamedResponseText += chunk;

            if (isCanvasMode && !canvasTriggered) {
              const { trigger } = checkHeuristics(streamedResponseText);
              if (trigger) {
                canvasTriggered = true;
                handleCanvasUpdate(streamedResponseText);
              }
            }

            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && (lastMessage.id.startsWith('thinking') || lastMessage.id.startsWith('streaming'))) {
                lastMessage.id = `streaming-${Date.now()}`;
                lastMessage.content = (isCanvasMode && canvasTriggered) ? extractCode(streamedResponseText).intro : streamedResponseText;
              }
              return newMessages;
            });
          }
        });
        streamedResponseText = streamedResponseText || result.text;
      }

      const finalText = (isCanvasMode && canvasTriggered) ? extractCode(streamedResponseText).intro : streamedResponseText;

      const assistantMessage = await Database.createMessage({
        threadId: currentThread.id,
        role: 'assistant',
        content: finalText,
        createdAt: Date.now(),
        generatedFileId: generatedFileIdRef.current ?? undefined
      });
      setMessages(prev => [...prev.filter(m => !m.id.startsWith('thinking') && !m.id.startsWith('streaming')), assistantMessage]);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setMessages(prev => prev.filter(m => !m.id.startsWith('thinking') && !m.id.startsWith('streaming')));
      } else {
        console.error('Failed to send message:', error);
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          threadId: currentThread.id,
          role: 'assistant',
          content: `Sorry, something went wrong: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`,
          createdAt: Date.now(),
        };
        setMessages(prev => [...prev.filter(m => !m.id.startsWith('thinking') && !m.id.startsWith('streaming')), errorMessage]);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleCanvasUpdate = async (fullText: string) => {
    if (!selectedThread) return;

    const { code, lang, intro } = extractCode(fullText);
    const activeDoc = getActiveDoc();

    if (activeDoc) {
      const content = code || intro;
      updateDoc(activeDoc.id, { content });
      openDocInCanvas(activeDoc.id);

      const fileRef = files.find(f => f.name === activeDoc.name);
      if (fileRef) {
        const blob = new Blob([content], { type: fileRef.type });
        await Database.updateFileBlob(fileRef.id, blob);
        const updatedFiles = await Database.getThreadFiles(selectedThread.id);
        setFiles(updatedFiles);
        generatedFileIdRef.current = fileRef.id;
      }
    } else {
      const content = code || intro;
      const kind = code ? 'code' : 'document';
      const fileName = code ? `code-snippet.${lang || 'txt'}` : 'New Document.md';
      const mimeType = kind === 'code' ? 'text/plain' : 'text/markdown';
      const blob = new Blob([content], { type: mimeType });

      const fileRef = await Database.createFile({
        name: fileName,
        size: blob.size,
        type: mimeType,
        createdAt: Date.now(),
      }, blob as File);

      await Database.updateThread(selectedThread.id, {
        files: [...selectedThread.files, fileRef.id]
      });

      setFiles(prev => [...prev, fileRef]);
      createAndOpenDoc(kind, fileName, content);
      generatedFileIdRef.current = fileRef.id;
    }
  };


  const handleFileUpload = async (uploadedFiles: File[]): Promise<string[]> => {
    if (!selectedThread) return [];

    const fileIds: string[] = [];
    for (const file of uploadedFiles) {
      const fileRef = await Database.createFile({
        name: file.name, size: file.size, type: file.type, createdAt: Date.now(),
      }, file);
      fileIds.push(fileRef.id);
    }

    const currentThread = await Database.getThread(selectedThread.id);
    if (currentThread) {
        const updatedFileIds = [...currentThread.files, ...fileIds];
        await Database.updateThread(selectedThread.id, { files: updatedFileIds });
    }

    const updatedFiles = await Database.getThreadFiles(selectedThread.id);
    const updatedThread = await Database.getThread(selectedThread.id);

    setFiles(updatedFiles);
    if (updatedThread) {
      setSelectedThread(updatedThread);
    }
    
    return fileIds;
  };

  const handleFileRemove = async (fileId: string) => {
    if (!selectedThread) return;
    await Database.deleteFile(fileId);
    
    const updatedFileIds = selectedThread.files.filter(id => id !== fileId);
    await Database.updateThread(selectedThread.id, { files: updatedFileIds });

    const updatedFiles = await Database.getThreadFiles(selectedThread.id);
    const updatedThread = await Database.getThread(selectedThread.id);
    
    setFiles(updatedFiles);
    if (updatedThread) {
      setSelectedThread(updatedThread);
    }
  };

  const handleOpenFileInCanvas = async (fileId: string) => {
    const fileRef = files.find(f => f.id === fileId);
    if (!fileRef) return;

    const blob = await Database.getFileBlob(fileRef.blobId);
    if (!blob) return;

    if (fileRef.type === 'application/pdf') {
      const fileUrl = URL.createObjectURL(blob);
      createAndOpenDoc('pdf', fileRef.name, fileUrl);
      return;
    }

    const codeMimeTypes = [
        'application/javascript', 'text/javascript',
        'application/json', 'text/css', 'text/html',
        'text/markdown', 'application/xml', 'text/xml',
        'application/x-python-code', 'text/x-python'
    ];

    const codeFileExtensions = ['.py', '.js', '.ts', '.tsx', '.jsx', '.json', '.html', '.css', '.scss', '.yaml', '.yml', '.md', '.java', '.c', '.cpp', '.h', '.cs', '.go', '.rs', '.sh'];

    const isCode = codeMimeTypes.includes(fileRef.type) ||
                   codeFileExtensions.some(ext => fileRef.name.toLowerCase().endsWith(ext));

    const content = await blob.text();

    createAndOpenDoc(
      isCode ? 'code' : 'document',
      fileRef.name,
      content
    );

  };

  const toggleFilesPanel = () => {
    const newValue = !showFilesPanel;
    setShowFilesPanel(newValue);
    Storage.setPreferences({ showFilesPanel: newValue });
  };

  const handleModelChange = async (modelId: string) => {
    setCurrentModel(modelId);
    Storage.setPreferences({ selectedModel: modelId });
    if (selectedThread) {
      Database.updateThread(selectedThread.id, { modelLock: modelId });
    }

    if (messages.length > 0) {
      setIsSummarizing(true);
      try {
        const response = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages }),
        });
        if (!response.ok) throw new Error('Summarization failed');
        const data = await response.json();
        contextSummaryRef.current = data.summary;
      } catch (error) {
        console.error('Failed to summarize conversation:', error);
        contextSummaryRef.current = null;
      } finally {
        setIsSummarizing(false);
      }
    }
  };

  const toggleLeftSidebar = () => {
    const panel = leftPanelRef.current;
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  };

  const handleOpenInCanvas = (content: string) => {
    handleCanvasUpdate(content);
  };

  const filteredThreads = searchQuery
    ? threads.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : threads;

  if (isMobile && isCanvasOpen) {
    return (
      <div className="h-dvh w-screen bg-background">
        <CanvasDialog />
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh bg-background text-foreground overflow-hidden text-sm lg:text-[17px]">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {isClient && (
          <ResizablePanel
            ref={leftPanelRef}
            defaultSize={20}
            minSize={15}
            maxSize={30}
            collapsible
            collapsedSize={isMobile ? 0 : 4.5}
            onCollapse={() => {
              setIsLeftSidebarCollapsed(true);
              if (!isMobile) Storage.setPreferences({ isLeftSidebarCollapsed: true });
            }}
            onExpand={() => {
              setIsLeftSidebarCollapsed(false);
              if (!isMobile) Storage.setPreferences({ isLeftSidebarCollapsed: false });
            }}
            className={`
              transition-all duration-300 ease-in-out
              ${isMobile ? 'absolute h-full z-20 w-4/5 max-w-xs bg-background' : 'relative'}
              ${isMobile && isLeftSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}
            `}
          >
            <LeftSidebar
              threads={filteredThreads}
              selectedThreadId={selectedThread?.id || null}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onThreadSelect={selectThread}
              onNewChat={createNewThread}
              onRenameThread={updateThreadTitle}
              onDuplicateThread={duplicateThread}
              onDeleteThread={deleteThread}
              onExportThread={exportThread}
              providers={masterProviders}
              isCollapsed={isLeftSidebarCollapsed && !isMobile}
              onToggleCollapse={toggleLeftSidebar}
            />
          </ResizablePanel>
        )}

        <ResizableHandle className={isMobile ? 'hidden' : ''} />

        <ResizablePanel defaultSize={80}>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={showFilesPanel ? 80 : 100} minSize={30}>
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={isCanvasOpen ? 50 : 100} minSize={30} style={{ overflow: 'visible' }}>
                  <div className="flex flex-col h-full">
                    <TopBar
                      showFilesPanel={showFilesPanel}
                      onToggleFilesPanel={toggleFilesPanel}
                      onToggleSidebar={toggleLeftSidebar}
                    />
                    <div className="flex-1 overflow-y-auto">
                      <ChatTranscript
                        messages={messages}
                        files={files}
                        isStreaming={isStreaming}
                        onOpenFileInCanvas={handleOpenFileInCanvas}
                      />
                    </div>
                    <ChatInput
                      onSendMessage={handleSendMessage}
                      onFileUpload={handleFileUpload}
                      onStopGenerating={handleStopGenerating}
                      isStreaming={isStreaming}
                      currentModel={currentModel}
                      onModelChange={handleModelChange}
                      providers={availableProviders}
                      text={chatInputText}
                      onTextChange={setChatInputText}
                      onEnhancePrompt={handleEnhancePrompt}
                      isEnhancing={isEnhancing}
                      isSummarizing={isSummarizing}
                    />
                  </div>
                </ResizablePanel>
                {isCanvasOpen && !isMobile && (
                  <>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={50} minSize={30}>
                      <CanvasDialog />
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </ResizablePanel>

            {!isMobile && showFilesPanel && (
              <>
                <ResizableHandle />
                <ResizablePanel
                  ref={rightPanelRef}
                  defaultSize={20}
                  minSize={15}
                  maxSize={30}
                  collapsible
                  collapsedSize={0}
                  onCollapse={() => {
                      setShowFilesPanel(false);
                      Storage.setPreferences({ showFilesPanel: false });
                  }}
                  onExpand={() => {
                      setShowFilesPanel(true);
                      Storage.setPreferences({ showFilesPanel: true });
                  }}
                >
                  <RightPanel
                      files={files}
                      onFileRemove={handleFileRemove}
                      showFilesPanel={showFilesPanel}
                      messages={messages}
                      onFileSelect={handleOpenFileInCanvas}
                      onClose={toggleFilesPanel}
                  />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>

      {isMobile && !isLeftSidebarCollapsed && (
        <div
          className="absolute inset-0 bg-black/50 z-10"
          onClick={toggleLeftSidebar}
        />
      )}

      {isMobile && showFilesPanel && (
        <>
          <div
            className="absolute inset-0 bg-black/50 z-20"
            onClick={toggleLeftSidebar}
          />
          <RightPanel
            files={files}
            messages={messages}
            onFileRemove={handleFileRemove}
            onFileSelect={handleOpenFileInCanvas}
            showFilesPanel={showFilesPanel}
            onClose={toggleFilesPanel}
          />
        </>
      )}

      {showNewChatWarning && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-background p-6 rounded-lg shadow-xl text-center max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">Cannot Create New Chat</h3>
            <p className="text-muted-foreground mb-6">
              You already have an empty chat. Please send a message before creating a new one.
            </p>
            <Button
              onClick={() => setShowNewChatWarning(false)}
              className="w-full"
            >
              OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
