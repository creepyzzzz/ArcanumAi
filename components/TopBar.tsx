'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { FileText, Sparkles, Menu } from 'lucide-react';
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler";
import { motion } from 'framer-motion';

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
        <motion.div
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="md:hidden"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </motion.div>
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            repeatDelay: 2
          }}
        >
          <Sparkles className="h-5 w-5 text-primary" />
        </motion.div>
        <h1 className="font-semibold text-lg">Arcanum</h1>
      </div>

      <div className="flex items-center gap-2">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            variant={showFilesPanel ? "secondary" : "ghost"}
            size="sm"
            onClick={onToggleFilesPanel}
            className="gap-2"
          >
            <motion.div
              animate={showFilesPanel ? { rotate: [0, -10, 10, 0] } : {}}
              transition={{ duration: 0.3 }}
            >
              <FileText className="h-4 w-4" />
            </motion.div>
            <span className="hidden sm:inline">Files</span>
          </Button>
        </motion.div>
        
        <AnimatedThemeToggler size={isMobile ? 16 : 20} />
      </div>
    </div>
  );
}
