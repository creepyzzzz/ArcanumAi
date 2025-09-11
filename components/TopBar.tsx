'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { FileText, Sparkles, Menu } from 'lucide-react';
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler";

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
  const isMobile = useIsMobile();

  return (
    <div className="relative z-20 flex-shrink-0 flex items-center justify-between py-1 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        {/* This button now correctly toggles the mobile sidebar state */}
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
          <span className="hidden sm:inline">Files</span>
        </Button>
        
        <AnimatedThemeToggler size={isMobile ? 16 : 20} />
      </div>
    </div>
  );
}
