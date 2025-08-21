'use client';

import { Button } from './ui/button';
import { Plus } from 'lucide-react';

interface NewChatButtonProps {
  onClick: () => void;
}

export function NewChatButton({ onClick }: NewChatButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="w-full justify-start gap-2 font-medium rounded-xl"
      size="sm"
    >
      <Plus className="h-4 w-4" />
      New Chat
    </Button>
  );
}
