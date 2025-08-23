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

const openRouterModelGroups = [
  {
    label: 'Genius Brains',
    models: ['meta-llama/llama-3.1-405b-instruct', 'qwen/qwen-2.5-72b-instruct']
  },
  {
    label: 'Multimodal Specialists',
    models: ['qwen/qwen-2.5-vl-72b-instruct', 'google/gemini-flash-2.0-experimental']
  },
  {
    label: 'Everyday Workhorses',
    models: ['mistralai/mistral-nemo', 'meta-llama/llama-3.2-3b-instruct']
  }
];

interface ModelSelectorProps {
  providers: ProviderAdapter[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
  isSummarizing?: boolean;
}

export function ModelSelector({
  providers,
  selectedModel,
  onModelChange,
  disabled = false,
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
  
  const apiKeys = Storage.getApiKeys();

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* --- MODIFICATION START --- */}
          {/* Further compacted the button for mobile screens */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1 h-8 px-2 rounded-full shadow-none border-0 bg-muted hover:bg-muted/80 text-muted-foreground"
            disabled={disabled || isSummarizing}
          >
            <span className="truncate text-xs max-w-[70px] sm:max-w-28">{selectedModelName}</span>
            {isSummarizing ? (
              <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin" />
            ) : (
              <ChevronDown className="h-3 w-3 flex-shrink-0" />
            )}
          </Button>
          {/* --- MODIFICATION END --- */}
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto">
          {providers.map((provider, providerIndex) => {
            const hasKeyForProvider = !provider.needsKey || !!apiKeys[provider.id];

            if (provider.id === 'openrouter') {
              const allGroupedModels = new Set(openRouterModelGroups.flatMap(g => g.models));
              const ungroupedModels = provider.models.filter(m => !allGroupedModels.has(m.id));

              return (
                <div key={provider.id}>
                  {openRouterModelGroups.map((group) => {
                    const modelsInGroup = group.models
                      .map(modelId => provider.models.find(m => m.id === modelId))
                      .filter((m): m is NonNullable<typeof m> => !!m);

                    if (modelsInGroup.length === 0) return null;

                    return (
                      <div key={group.label}>
                        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 pt-1.5">
                          {group.label}
                        </DropdownMenuLabel>
                        {modelsInGroup.map((model) => (
                          <DropdownMenuItem
                            key={`${provider.id}:${model.id}`}
                            onClick={() => handleModelSelect(`${provider.id}:${model.id}`)}
                            className="flex items-center justify-between"
                            disabled={!hasKeyForProvider}
                          >
                            <span className="truncate">{model.label}</span>
                             {!hasKeyForProvider && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    );
                  })}
                  {ungroupedModels.length > 0 && (
                     <>
                      <DropdownMenuSeparator />
                       {ungroupedModels.map(model => (
                         <DropdownMenuItem
                           key={`${provider.id}:${model.id}`}
                           onClick={() => handleModelSelect(`${provider.id}:${model.id}`)}
                           className="flex items-center justify-between"
                           disabled={!hasKeyForProvider}
                         >
                           <span className="truncate">{model.label}</span>
                           {!hasKeyForProvider && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                         </DropdownMenuItem>
                       ))}
                     </>
                  )}
                  {providerIndex < providers.length - 1 && <DropdownMenuSeparator className="my-1" />}
                </div>
              );
            }

            return (
              <div key={provider.id}>
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                  {provider.displayName}
                </DropdownMenuLabel>
                {provider.models.map((model) => (
                  <DropdownMenuItem
                    key={`${provider.id}:${model.id}`}
                    onClick={() => handleModelSelect(`${provider.id}:${model.id}`)}
                    className="flex items-center justify-between"
                    disabled={!hasKeyForProvider}
                  >
                    <span className="truncate">{model.label}</span>
                    {!hasKeyForProvider && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                  </DropdownMenuItem>
                ))}
                {providerIndex < providers.length - 1 && <DropdownMenuSeparator className="my-1" />}
              </div>
            );
          })}
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
