'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
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
import { useUiStore } from '@/lib/state/uiStore';
import { motion, AnimatePresence } from 'framer-motion';


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
  isMobile?: boolean;
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
  onToggleCollapse,
  isMobile = false,
}: LeftSidebarProps) {
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { fontSizes } = useUiStore();

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

  const groupedThreads = useMemo(() => {
    const groups: { [key: string]: Thread[] } = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const sortedThreads = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);

    sortedThreads.forEach(thread => {
      const threadDate = new Date(thread.updatedAt);
      const threadDay = new Date(threadDate.getFullYear(), threadDate.getMonth(), threadDate.getDate());
      const diffDays = (today.getTime() - threadDay.getTime()) / (1000 * 60 * 60 * 24);

      let groupKey: string;

      if (diffDays === 0) {
        groupKey = 'Today';
      } else if (diffDays === 1) {
        groupKey = 'Yesterday';
      } else if (diffDays < 7) {
        groupKey = 'Last 7 days';
      } else if (diffDays < 30) {
        groupKey = 'Last month';
      } else {
        groupKey = threadDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(thread);
    });

    return groups;
  }, [threads]);

  const groupOrder = ['Today', 'Yesterday', 'Last 7 days', 'Last month'];
  
  const monthGroupKeys = Object.keys(groupedThreads)
    .filter(key => !groupOrder.includes(key))
    .sort((a, b) => {
      const dateA = groupedThreads[a][0].updatedAt;
      const dateB = groupedThreads[b][0].updatedAt;
      return dateB - dateA;
    });

  const orderedGroupKeys = [...groupOrder.filter(key => groupedThreads[key]), ...monthGroupKeys];

  if (isCollapsed) {
    return (
      <div 
        className="flex flex-col h-full items-center justify-between py-4 relative bg-sidebar"
        style={{ fontSize: fontSizes.general }}
      >
        <TooltipProvider delayDuration={0}>
          <div className="flex flex-col items-center space-y-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onToggleCollapse}
                  >
                    <PanelLeftOpen className="h-5 w-5" />
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Open sidebar</p>
              </TooltipContent>
            </Tooltip>
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

          <div className="flex flex-col items-center space-y-2">
            <SettingsDialog providers={providers} asIcon />
          </div>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col h-full bg-sidebar"
      style={{ fontSize: fontSizes.general }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
        className="p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
           <h1 className="text-lg font-semibold">Chats</h1>
           <TooltipProvider delayDuration={0}>
             <Tooltip>
               <TooltipTrigger asChild>
                 <motion.div
                   whileHover={{ scale: 1.1 }}
                   whileTap={{ scale: 0.95 }}
                   transition={{ duration: 0.2 }}
                 >
                   <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
                     <PanelLeftClose className="h-5 w-5" />
                   </Button>
                 </motion.div>
               </TooltipTrigger>
               <TooltipContent side="bottom">
                 <p>Close sidebar</p>
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
        </div>
        <NewChatButton onClick={onNewChat} />
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}
          className="relative"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="absolute left-3 top-1/2 -translate-y-1/2"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
          </motion.div>
          <motion.div
            whileFocus={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </motion.div>
        </motion.div>
      </motion.div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {threads.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="p-4 text-center text-muted-foreground"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.5, 0.7, 0.5]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              <MessageSquare className="h-8 w-8 mx-auto mb-2" />
            </motion.div>
            <p className="text-sm">No conversations yet</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="p-2"
          >
            {orderedGroupKeys.map((groupTitle, groupIndex) => (
              <motion.div
                key={groupTitle}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.25 + groupIndex * 0.05 }}
                className="mb-2"
              >
                <h4 className="text-xs font-bold uppercase text-muted-foreground px-3 py-2">
                  {groupTitle}
                </h4>
                <div className="space-y-1">
                  {groupedThreads[groupTitle].map((thread, threadIndex) => (
                    <motion.div
                      key={thread.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ 
                        duration: 0.2, 
                        delay: 0.3 + (groupIndex * 0.05) + (threadIndex * 0.02),
                        ease: 'easeOut'
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`group relative rounded-xl p-3 cursor-pointer transition-all duration-200 ${
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
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm truncate flex-1">
                              {thread.title}
                            </h3>
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
                                <DropdownMenuItem 
                                  onClick={(e) => { e.stopPropagation(); startEditing(thread); }}
                                  className="relative overflow-hidden"
                                >
                                  <motion.div
                                    whileHover={{ x: 4 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center"
                                  >
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Rename
                                  </motion.div>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => onDuplicateThread(thread.id)}
                                  className="relative overflow-hidden"
                                >
                                  <motion.div
                                    whileHover={{ x: 4 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center"
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate
                                  </motion.div>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => onExportThread(thread.id, 'json')}
                                  className="relative overflow-hidden"
                                >
                                  <motion.div
                                    whileHover={{ x: 4 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Export JSON
                                  </motion.div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onDeleteThread(thread.id)}
                                  className="text-destructive focus:text-destructive relative overflow-hidden"
                                >
                                  <motion.div
                                    whileHover={{ x: 4 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </motion.div>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3, ease: 'easeOut' }}
        className="p-4 border-t"
      >
        <SettingsDialog providers={providers} />
      </motion.div>
    </motion.div>
  );
}