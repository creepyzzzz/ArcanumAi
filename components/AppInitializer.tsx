'use client';

import { useEffect } from 'react';
import { useUiStore } from '@/lib/state/uiStore';

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const { fontSizes, loadInitialPreferences } = useUiStore();

  useEffect(() => {
    // Load preferences from storage when the app starts
    loadInitialPreferences();
  }, [loadInitialPreferences]);

  useEffect(() => {
    // Apply font sizes to the root element whenever they change
    document.documentElement.style.setProperty('--font-size-general', `${fontSizes.general}px`);
    document.documentElement.style.setProperty('--font-size-chat', `${fontSizes.chat}px`);
    document.documentElement.style.setProperty('--font-size-code', `${fontSizes.code}px`);
    document.documentElement.style.setProperty('--font-size-canvas', `${fontSizes.canvas}px`);
    document.documentElement.style.setProperty('--font-size-canvas-code-preview', `${fontSizes.canvasCodePreview}px`);
    document.documentElement.style.setProperty('--font-size-canvas-code-editor', `${fontSizes.canvasCodeEditor}px`);
  }, [fontSizes]);

  return <>{children}</>;
}
