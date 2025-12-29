'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Storage, KeyVault, ApiKey } from '@/lib/storage';
import { ProviderAdapter } from '@/lib/providers/base';
import {
  Key,
  Upload,
  Download,
  Eye,
  EyeOff,
  Shield,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Settings,
  MoreHorizontal,
  Trash2,
  FileEdit,
  Copy,
  Type,
  MessageSquare,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useUiStore } from '@/lib/state/uiStore';


interface SettingsDialogProps {
  providers: ProviderAdapter[];
  asIcon?: boolean;
}

// Helper component for the "Pill" UI
function ApiKeyPill({
  providerId,
  onRemove,
  onEdit,
  onExport,
}: {
  providerId: string;
  onRemove: () => void;
  onEdit: () => void;
  onExport: () => void;
}) {
  const providerName = providerId.charAt(0).toUpperCase() + providerId.slice(1);

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-full text-sm font-medium">
      <span>{providerName} API Key</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-2">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <FileEdit className="mr-2 h-4 w-4" />
            <span>Edit</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExport}>
            <Copy className="mr-2 h-4 w-4" />
            <span>Export</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRemove} className="text-red-500">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Remove</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function SettingsDialog({ providers, asIcon = false }: SettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('providers');
  const [apiKeys, setApiKeys] = useState<KeyVault>({});
  const [passphrase, setPassphrase] = useState('');
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [hasPassphrase, setHasPassphrase] = useState(false);
  const [importFormat, setImportFormat] = useState<'auto' | 'json' | 'curl' | 'python' | 'nodejs'>('auto');
  const [importContent, setImportContent] = useState('');
  
  const [expandedProviders, setExpandedProviders] = useState<{ [key: string]: boolean }>({});
  
  const { fontSizes, setFontSize, providerModels, setProviderModels } = useUiStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // This function will notify other components that the keys have changed.
  const notifyUpdates = () => {
    window.dispatchEvent(new CustomEvent('api-keys-updated'));
  };

  const loadApiKeys = useCallback(() => {
    const passphraseExists = Storage.hasPassphrase();
    setHasPassphrase(passphraseExists);

    if (passphraseExists && passphrase) {
      try {
        setApiKeys(Storage.getApiKeys(passphrase));
      } catch {
        setApiKeys({});
      }
    } else if (!passphraseExists) {
      setApiKeys(Storage.getApiKeys());
    }
  }, [passphrase]);

  useEffect(() => {
    if (isOpen) {
      loadApiKeys();
    }
  }, [isOpen, loadApiKeys]);

  const saveApiKey = (provider: string, key: string) => {
    setApiKeys(prevKeys => {
      const newKeys = { ...prevKeys, [provider]: key };
      Storage.setApiKeys(newKeys, passphrase || undefined);
      notifyUpdates();
      return newKeys;
    });
  };

  const removeApiKey = (provider: string) => {
    const newKeys = { ...apiKeys };
    delete newKeys[provider];
    setApiKeys(newKeys);
    Storage.setApiKeys(newKeys, passphrase || undefined);
    notifyUpdates();
  };
  
  const displayValue = (key: ApiKey | undefined): string => {
    if (typeof key === 'object' && key !== null && typeof key.apiKey === 'string') {
      return key.apiKey;
    }
    if (typeof key === 'string') {
      return key;
    }
    return '';
  };

  const handleModelSelection = (providerId: string, modelId: string, checked: boolean) => {
    const currentModels = providerModels[providerId] || [];
    const newModels = checked
      ? [...currentModels, modelId]
      : currentModels.filter(id => id !== modelId);
      
    const newProviderModels = { ...providerModels, [providerId]: newModels };
    setProviderModels(newProviderModels);
  };

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };
  
  const toggleProviderExpansion = (providerId: string) => {
    setExpandedProviders(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportContent(content);
      handleTextImport(content); // Directly process content
    };
    reader.readAsText(file);
  };

  const handleTextImport = (content?: string) => {
    const textToImport = content || importContent;
    if (!textToImport.trim()) return;

    try {
      const imported = Storage.importKeys(textToImport, importFormat);
      const merged = { ...apiKeys, ...imported };
      setApiKeys(merged);
      Storage.setApiKeys(merged, passphrase || undefined);
      setImportContent('');
      loadApiKeys();
      notifyUpdates(); // Notify the app of the change
    } catch (error) {
      console.error('Import failed:', error);
      // You could add user-facing error feedback here
    }
  };

  const handleEditImportedKey = (providerId: string) => {
    const keyData = apiKeys[providerId];
    if (typeof keyData === 'object' && keyData !== null) {
      const prettyJson = JSON.stringify(keyData, null, 2);
      setImportContent(prettyJson);
      setActiveTab('import-export');
    }
  };

  const exportKeys = (format: 'json' | 'yaml', providerId?: string) => {
    const keysToExport = providerId ? { [providerId]: apiKeys[providerId] } : apiKeys;
    const content = Storage.exportKeys(format, keysToExport);
    const blob = new Blob([content], { 
      type: format === 'json' ? 'application/json' : 'application/yaml' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${providerId || 'api-keys'}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setEncryption = (enabled: boolean) => {
    if (enabled && passphrase) {
      Storage.setApiKeys(apiKeys, passphrase);
      setHasPassphrase(true);
    } else if (!enabled) {
      Storage.setApiKeys(apiKeys);
      setHasPassphrase(false);
      setPassphrase('');
    }
  };

  const triggerButton = asIcon ? (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </DialogTrigger>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Settings</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    <DialogTrigger asChild>
      <Button variant="ghost" className="w-full justify-start">
        <div className="flex items-center">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </div>
      </Button>
    </DialogTrigger>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {triggerButton}
      
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col sm:max-h-[85vh] 
        max-sm:h-screen max-sm:w-screen max-sm:max-w-full max-sm:rounded-none max-sm:border-none">
        <DialogHeader className="p-4 flex-shrink-0 border-b flex flex-row items-center justify-between sm:p-6 sm:pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Tabs defaultValue="api-keys" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="api-keys">
                <Key className="mr-2 h-4 w-4" />
                API Keys
              </TabsTrigger>
              <TabsTrigger value="appearance">
                <Type className="mr-2 h-4 w-4" />
                Appearance
              </TabsTrigger>
            </TabsList>
            <TabsContent value="api-keys" className="mt-4">
                <Tabs defaultValue="providers" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 gap-1 sm:gap-2 mb-4">
                      <TabsTrigger value="providers" className="max-sm:text-xs max-sm:px-2">Providers</TabsTrigger>
                      <TabsTrigger value="import-export" className="max-sm:text-xs max-sm:px-2">Import/Export</TabsTrigger>
                      <TabsTrigger value="security" className="max-sm:text-xs max-sm:px-2">Security</TabsTrigger>
                    </TabsList>

                    {/* Providers Tab */}
                    <TabsContent value="providers" className="space-y-4">
                      <div className="space-y-4">
                        {providers.filter(p => p.needsKey).map((provider) => (
                          <div key={provider.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="font-medium">{provider.displayName}</Label>
                              {apiKeys[provider.id] && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeApiKey(provider.id)}
                                >
                                  Remove Key
                                </Button>
                              )}
                            </div>
                            
                            <div className="flex-1 relative">
                              <Input
                                type={showKeys[provider.id] ? 'text' : 'password'}
                                placeholder={`Enter ${provider.displayName} API key`}
                                value={displayValue(apiKeys[provider.id])}
                                onChange={(e) => saveApiKey(provider.id, e.target.value)}
                              />
                              {apiKeys[provider.id] && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                  onClick={() => toggleKeyVisibility(provider.id)}
                                >
                                  {showKeys[provider.id] ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>

                            {/* Model Selection Section */}
                            <div className="mt-4">
                              <Button
                                variant="ghost"
                                className="w-full px-2 justify-between"
                                onClick={() => toggleProviderExpansion(provider.id)}
                              >
                                <span>Select Models</span>
                                {expandedProviders[provider.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                              {expandedProviders[provider.id] && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 p-4 border rounded-lg mt-2">
                                  {provider.models.map(model => (
                                    <div key={model.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`${provider.id}-${model.id}`}
                                        checked={(providerModels[provider.id] || []).includes(model.id)}
                                        onCheckedChange={(checked) => handleModelSelection(provider.id, model.id, !!checked)}
                                      />
                                      <label
                                        htmlFor={`${provider.id}-${model.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        {model.label}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    {/* Import/Export Tab */}
                    <TabsContent value="import-export" className="space-y-6">
                      <div>
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          Import API Keys
                        </h3>
                        
                        <div className="space-y-3">
                          <div className="flex gap-2">
                             <Select value={importFormat} onValueChange={(value: any) => setImportFormat(value)}>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="auto">Auto-Detect</SelectItem>
                                <SelectItem value="json">JSON</SelectItem>
                                <SelectItem value="curl">cURL / HTTP</SelectItem>
                                <SelectItem value="python">Python</SelectItem>
                                <SelectItem value="nodejs">Node.js</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              Choose File
                            </Button>
                          </div>

                          <Textarea
                            placeholder="Or paste your configuration here..."
                            value={importContent}
                            onChange={(e) => setImportContent(e.target.value)}
                            rows={6}
                          />
                          
                          <Button onClick={() => handleTextImport()} disabled={!importContent.trim()}>
                            Import From Text
                          </Button>
                        </div>
                      </div>
                      
                      {Object.values(apiKeys).some(v => typeof v === 'object') && (
                        <div>
                          <h3 className="font-medium mb-3 flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            Stored API Keys
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(apiKeys)
                              .filter(([_, keyData]) => typeof keyData === 'object' && keyData !== null && !Array.isArray(keyData))
                              .map(([providerId, _]) => (
                                <ApiKeyPill
                                  key={providerId}
                                  providerId={providerId}
                                  onRemove={() => removeApiKey(providerId)}
                                  onEdit={() => handleEditImportedKey(providerId)}
                                  onExport={() => exportKeys('json', providerId)}
                                />
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          Export All API Keys
                        </h3>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => exportKeys('json')}>
                            Export JSON
                          </Button>
                          <Button variant="outline" onClick={() => exportKeys('yaml')}>
                            Export YAML
                          </Button>
                        </div>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,.yaml,.yml,.html,.htm,.txt,.py,.js"
                        className="hidden"
                        onChange={handleFileImport}
                      />
                    </TabsContent>

                    {/* Security Tab */}
                    <TabsContent value="security" className="space-y-6">
                      <div>
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Encryption
                        </h3>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Encrypt API keys</Label>
                              <p className="text-sm text-muted-foreground">
                                Protect your API keys with a passphrase
                              </p>
                            </div>
                            <Switch
                              checked={hasPassphrase}
                              onCheckedChange={(checked) => {
                                if (checked && passphrase) {
                                  setEncryption(true);
                                } else if (!checked) {
                                  setEncryption(false);
                                }
                              }}
                            />
                          </div>

                          {(hasPassphrase || passphrase) && (
                            <div>
                              <Label htmlFor="passphrase">Passphrase</Label>
                              <Input
                                id="passphrase"
                                type="password"
                                placeholder="Enter passphrase"
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {!hasPassphrase && (
                        <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                          <ShieldAlert className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-yellow-800 dark:text-yellow-200">
                              Security Warning
                            </p>
                            <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                              Your API keys are stored unencrypted in localStorage. Consider enabling encryption for better security.
                            </p>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                </Tabs>
            </TabsContent>
            <TabsContent value="appearance" className="mt-4 space-y-6">
                <div>
                    <h3 className="font-medium mb-3">General Font Size</h3>
                    <div className="flex items-center gap-4">
                        <Slider 
                          value={[fontSizes.general]} 
                          max={24} 
                          min={12} 
                          step={1}
                          onValueChange={([value]: number[]) => setFontSize('general', value)}
                        />
                        <span className="text-sm text-muted-foreground w-12 text-right">{fontSizes.general}px</span>
                    </div>
                </div>
                <div>
                    <h3 className="font-medium mb-3">Chat Font Size</h3>
                    <div className="flex items-center gap-4">
                        <Slider 
                          value={[fontSizes.chat]} 
                          max={22} 
                          min={10} 
                          step={1}
                          onValueChange={([value]: number[]) => setFontSize('chat', value)}
                        />
                        <span className="text-sm text-muted-foreground w-12 text-right">{fontSizes.chat}px</span>
                    </div>
                </div>
                <div>
                    <h3 className="font-medium mb-3">Code Block Font Size</h3>
                    <div className="flex items-center gap-4">
                        <Slider 
                          value={[fontSizes.code]} 
                          max={20} 
                          min={10} 
                          step={1}
                          onValueChange={([value]: number[]) => setFontSize('code', value)}
                        />
                        <span className="text-sm text-muted-foreground w-12 text-right">{fontSizes.code}px</span>
                    </div>
                </div>
                 <div>
                    <h3 className="font-medium mb-3">Canvas Document Font Size</h3>
                    <div className="flex items-center gap-4">
                        <Slider 
                          value={[fontSizes.canvas]} 
                          max={24} 
                          min={12} 
                          step={1}
                          onValueChange={([value]: number[]) => setFontSize('canvas', value)}
                        />
                        <span className="text-sm text-muted-foreground w-12 text-right">{fontSizes.canvas}px</span>
                    </div>
                </div>
                <div>
                    <h3 className="font-medium mb-3">Canvas Code Preview Font Size</h3>
                    <div className="flex items-center gap-4">
                        <Slider 
                          value={[fontSizes.canvasCodePreview]} 
                          max={24} 
                          min={12} 
                          step={1}
                          onValueChange={([value]: number[]) => setFontSize('canvasCodePreview', value)}
                        />
                        <span className="text-sm text-muted-foreground w-12 text-right">{fontSizes.canvasCodePreview}px</span>
                    </div>
                </div>
                <div>
                    <h3 className="font-medium mb-3">Canvas Code Editor Font Size</h3>
                    <div className="flex items-center gap-4">
                        <Slider 
                          value={[fontSizes.canvasCodeEditor]} 
                          max={24} 
                          min={12} 
                          step={1}
                          onValueChange={([value]: number[]) => setFontSize('canvasCodeEditor', value)}
                        />
                        <span className="text-sm text-muted-foreground w-12 text-right">{fontSizes.canvasCodeEditor}px</span>
                    </div>
                </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
