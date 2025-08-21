// path: components/canvas/Toolbar.tsx

'use client';

import { Button } from '@/components/ui/button';
import { useThreadStore } from '@/lib/state/threadStore';
import {
  FileText,
  Code,
  Save,
  Copy,
  History,
  X,
  CopyPlus,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function Toolbar() {
  const { getActiveDoc, updateDoc, closeCanvas } = useThreadStore();
  const activeDoc = getActiveDoc();

  if (!activeDoc) return null;

  const handleSwitchType = (newType: 'document' | 'code') => {
    updateDoc(activeDoc.id, { kind: newType });
  };

  const handleCopyAll = () => {
    if (activeDoc.content) {
      navigator.clipboard.writeText(activeDoc.content);
    }
  };

  return (
    // --- UPDATE: Added z-10 to ensure the toolbar is on top of the editor ---
    <div className="relative flex items-center justify-between p-2 border-b bg-background/80 backdrop-blur-sm z-10">
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-muted p-1 rounded-lg gap-1">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeDoc.kind === 'document' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => handleSwitchType('document')}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Document</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeDoc.kind === 'code' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => handleSwitchType('code')}
                >
                  <Code className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Code</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <input
          type="text"
          value={activeDoc.name}
          onChange={(e) => updateDoc(activeDoc.id, { name: e.target.value })}
          className="font-semibold text-base bg-transparent focus:outline-none focus:ring-1 focus:ring-primary rounded-md px-2 py-1"
        />
      </div>

      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Save (Cmd+S)</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <CopyPlus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Save As New</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <History className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>History</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopyAll}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Copy All</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeCanvas}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Close (Esc)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
