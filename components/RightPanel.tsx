'use client';

import { FilesPanel } from '@/components/FilesPanel';
import { FileRef, Message } from '@/types';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUiStore } from '@/lib/state/uiStore'; // Import the UI store

interface RightPanelProps {
  files: FileRef[];
  messages: Message[];
  onFileRemove: (fileId: string) => void;
  onFileSelect: (fileId: string) => void;
  showFilesPanel: boolean;
  onClose: () => void;
}

export function RightPanel({
  files,
  messages,
  onFileRemove,
  onFileSelect,
  showFilesPanel,
  onClose,
}: RightPanelProps) {
  const { fontSizes } = useUiStore(); // Get font sizes from the store

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="absolute top-0 right-0 h-full w-4/5 max-w-sm z-30 bg-sidebar md:relative md:h-full md:w-auto md:max-w-none md:border-l flex flex-col"
      style={{ fontSize: fontSizes.general }}
    >
      {/* --- FIX: Unified header with close button for all screen sizes --- */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-medium text-lg">Files</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <FilesPanel
          files={files}
          onFileRemove={onFileRemove}
          onFileSelect={onFileSelect}
        />
      </div>
    </motion.div>
  );
}
