'use client';

import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface NewChatButtonProps {
  onClick: () => void;
}

export function NewChatButton({ onClick }: NewChatButtonProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Button
        onClick={onClick}
        className="w-full justify-start gap-2 font-medium rounded-xl"
        size="sm"
      >
        <motion.div
          animate={{ rotate: 0 }}
          whileHover={{ rotate: 90 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Plus className="h-4 w-4" />
        </motion.div>
        New Chat
      </Button>
    </motion.div>
  );
}
