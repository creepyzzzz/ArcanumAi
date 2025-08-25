'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { NewChatButton } from './NewChatButton';
import { SettingsDialog } from './SettingsDialog';
import { Thread } from '@/types';
import { ProviderAdapter } from '@/lib/providers/base';
import {
  Search,
  MoreHorizontal,
  Edit2,
  Copy,
  FileJson as Download,
  Trash2,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { useUiStore } from '@/lib/state/uiStore'; // Import the UI store


interface LeftSidebarProps {
  threads: Thread[];
  selectedThreadId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onThreadSelect: (threadId: string) => void;
  onNewChat: () => void;
  onRenameThread: (threadId: string, title: string) => void;
  onDuplicateThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onExportThread: (threadId: string, format: 'json') => void;
  providers: ProviderAdapter[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function LeftSidebar({
  threads,
  selectedThreadId,
  searchQuery,
  onSearchChange,
  onThreadSelect,
  onNewChat,
  onRenameThread,
  onDuplicateThread,
  onDeleteThread,
  onExportThread,
  providers,
  isCollapsed,
  onToggleCollapse
}: LeftSidebarProps) {
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { fontSizes } = useUiStore(); // Get font sizes from the store

  useEffect(() => {
    if (editingThreadId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingThreadId]);

  const startEditing = (thread: Thread) => {
    setEditingThreadId(thread.id);
    setEditTitle(thread.title);
  };

  const finishEditing = () => {
    if (editingThreadId && editTitle.trim()) {
      onRenameThread(editingThreadId, editTitle.trim());
    }
    setEditingThreadId(null);
    setEditTitle('');
  };

  const cancelEditing = () => {
    setEditingThreadId(null);
    setEditTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (isCollapsed) {
    // --- UPDATED COLLAPSED VIEW ---
    // This structure uses justify-between to correctly position the top and bottom elements.
    return (
      <div 
        className="flex flex-col h-full items-center justify-between py-4 relative bg-muted/10 border-r"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ fontSize: fontSizes.general }}
      >
        <TooltipProvider delayDuration={0}>
          {/* Top section with expand and new chat buttons */}
          <div className="flex flex-col items-center space-y-2">
            <div 
              className={`transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onToggleCollapse}
                  >
                    <PanelLeftOpen className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Open sidebar</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onNewChat}>
                  <Edit2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>New Chat</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Bottom section with the settings button */}
          <div className="flex flex-col items-center space-y-2">
            <SettingsDialog providers={providers} asIcon />
          </div>
        </TooltipProvider>
      </div>
    );
  }

  // --- EXPANDED VIEW ---
  return (
    <div className="flex flex-col h-full bg-muted/10 border-r" style={{ fontSize: fontSizes.general }}>
      <div className="p-4 space-y-3 border-b">
        <div className="flex items-center justify-between">
           <h1 className="text-lg font-semibold">Chats</h1>
           <TooltipProvider delayDuration={0}>
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
                   <PanelLeftClose className="h-5 w-5" />
                 </Button>
               </TooltipTrigger>
               <TooltipContent side="bottom">
                 <p>Close sidebar</p>
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
        </div>
        <NewChatButton onClick={onNewChat} />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {/* --- UPDATE: Decreased corner roundness --- */}
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {threads.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {threads.map((thread) => (
              // --- UPDATE: Decreased corner roundness ---
              <div
                key={thread.id}
                className={`group relative rounded-xl p-3 cursor-pointer transition-colors ${
                  selectedThreadId === thread.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => onThreadSelect(thread.id)}
              >
                {editingThreadId === thread.id ? (
                  <Input
                    ref={editInputRef}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={handleKeyDown}
                    className="h-6 text-sm rounded-xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {thread.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(thread.updatedAt)}
                        </p>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => startEditing(thread)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDuplicateThread(thread.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onExportThread(thread.id, 'json')}>
                            <Download className="h-4 w-4 mr-2" />
                            Export JSON
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDeleteThread(thread.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        <SettingsDialog providers={providers} />
      </div>
    </div>
  );
}
