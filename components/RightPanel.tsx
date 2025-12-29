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
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="absolute top-0 right-0 h-full w-4/5 max-w-sm z-30 bg-sidebar md:relative md:h-full md:w-auto md:max-w-none md:border-l flex flex-col backdrop-blur-sm"
      style={{ fontSize: fontSizes.general }}
    >
      {/* --- FIX: Unified header with close button for all screen sizes --- */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center justify-between p-4 border-b"
      >
        <h3 className="font-medium text-lg">Files</h3>
        <motion.div
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="flex-1 overflow-y-auto"
      >
        <FilesPanel
          files={files}
          onFileRemove={onFileRemove}
          onFileSelect={onFileSelect}
        />
      </motion.div>
    </motion.div>
  );
}
