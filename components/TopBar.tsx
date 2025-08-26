// components/TopBar.tsx

'use client';

import { Button } from './ui/button';
import { FileText, Sparkles, Menu } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface TopBarProps {
  showFilesPanel: boolean;
  onToggleFilesPanel: () => void;
  onToggleSidebar: () => void;
}

export function TopBar({
  showFilesPanel,
  onToggleFilesPanel,
  onToggleSidebar,
}: TopBarProps) {
  return (
    <div className="relative z-20 flex items-center justify-between py-1 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        {/* --- UPDATE: Added hamburger menu for mobile --- */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="font-semibold text-lg">Arcanum</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={showFilesPanel ? "secondary" : "ghost"}
          size="sm"
          onClick={onToggleFilesPanel}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          {/* --- UPDATE: Hide text on smaller screens --- */}
          <span className="hidden sm:inline">Files</span>
        </Button>
        
        <ThemeToggle />
      </div>
    </div>
  );
}
