'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import { SettingsDialog } from './SettingsDialog';
import { Storage } from '@/lib/storage';
import { ProviderAdapter } from '@/lib/providers/base';
import { ChevronDown, Settings, AlertCircle, Loader2 } from 'lucide-react';

interface ModelSelectorProps {
  providers: ProviderAdapter[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
  // --- NEW: Prop for summarization loading state ---
  isSummarizing?: boolean;
}

export function ModelSelector({
  providers,
  selectedModel,
  onModelChange,
  disabled = false,
  // --- NEW: Destructure summarization prop ---
  isSummarizing = false,
}: ModelSelectorProps) {
  const [showMissingKeyWarning, setShowMissingKeyWarning] = useState(false);
  const [keyUpdate, setKeyUpdate] = useState(0);

  useEffect(() => {
    const handleKeysUpdate = () => {
      setKeyUpdate(prev => prev + 1);
    };
    window.addEventListener('api-keys-updated', handleKeysUpdate);
    
    return () => {
      window.removeEventListener('api-keys-updated', handleKeysUpdate);
    };
  }, []);

  const [providerId, modelId] = selectedModel.split(':');
  const selectedProvider = providers.find(p => p.id === providerId);
  const selectedModelName = selectedProvider?.models.find(m => m.id === modelId)?.label || 'Unknown Model';

  const handleModelSelect = (newModelId: string) => {
    const [newProviderId] = newModelId.split(':');
    const provider = providers.find(p => p.id === newProviderId);
    
    if (provider?.needsKey) {
      const apiKeys = Storage.getApiKeys();
      if (!apiKeys[newProviderId]) {
        setShowMissingKeyWarning(true);
        return;
      }
    }

    onModelChange(newModelId);
    setShowMissingKeyWarning(false);
  };

  const groupedModels = providers.reduce((acc, provider) => {
    acc[provider.displayName] = provider.models.map(model => ({
      ...model,
      fullId: `${provider.id}:${model.id}`,
      needsKey: provider.needsKey
    }));
    return acc;
  }, {} as Record<string, Array<{ id: string; label: string; fullId: string; needsKey: boolean }>>);
  
  const apiKeys = Storage.getApiKeys();

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* --- UPDATE: Show loading spinner when summarizing --- */}
          <Button variant="outline" size="sm" className="gap-2 min-w-48" disabled={disabled || isSummarizing}>
            <span className="truncate">{selectedModelName}</span>
            {isSummarizing ? (
              <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
          {Object.entries(groupedModels).map(([providerName, models]) => (
            <div key={providerName}>
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                {providerName}
              </DropdownMenuLabel>
              {models.map((model) => {
                const hasKey = !model.needsKey || !!apiKeys[model.fullId.split(':')[0]];
                
                return (
                  <DropdownMenuItem
                    key={model.fullId}
                    onClick={() => handleModelSelect(model.fullId)}
                    className={`flex items-center justify-between ${
                      !hasKey ? 'text-muted-foreground' : ''
                    }`}
                    disabled={!hasKey}
                  >
                    <span className="truncate">{model.label}</span>
                    {!hasKey && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {showMissingKeyWarning && (
        <div className="flex items-center gap-2 text-sm text-yellow-600">
          <AlertCircle className="h-4 w-4" />
          <span>API key required</span>
          <SettingsDialog providers={providers} asIcon />
        </div>
      )}
    </div>
  );
}
