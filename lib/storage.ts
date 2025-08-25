const STORAGE_PREFIX = 'ai-chat-';

export type ApiKey = string | { [key: string]: any };

export interface KeyVault {
  [provider: string]: ApiKey;
}

export interface FontSizes {
  general: number;
  chat: number;
  code: number;
  canvas: number;
  canvasCodePreview: number;
  canvasCodeEditor: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  selectedModel: string;
  showFilesPanel: boolean;
  showCanvas: boolean;
  providerModels: { [providerId: string]: string[] };
  isLeftSidebarCollapsed: boolean;
  isRightSidebarCollapsed: boolean;
  fontSizes: FontSizes;
}

export class Storage {
  private static encrypt(text: string, passphrase: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ passphrase.charCodeAt(i % passphrase.length)
      );
    }
    return btoa(result);
  }

  private static decrypt(encrypted: string, passphrase: string): string {
    try {
      const text = atob(encrypted);
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(
          text.charCodeAt(i) ^ passphrase.charCodeAt(i % passphrase.length)
        );
      }
      return result;
    } catch {
      throw new Error('Invalid passphrase or corrupted data');
    }
  }

  static getApiKeys(passphrase?: string): KeyVault {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}keys`);
      if (!stored) return {};
      const data = JSON.parse(stored);
      if (data.encrypted && passphrase) {
        const decrypted = this.decrypt(data.data, passphrase);
        return JSON.parse(decrypted);
      } else if (!data.encrypted) {
        return data;
      }
      return {};
    } catch {
      return {};
    }
  }

  static setApiKeys(keys: KeyVault, passphrase?: string): void {
    let dataToStore;
    if (passphrase) {
      const encrypted = this.encrypt(JSON.stringify(keys), passphrase);
      dataToStore = { encrypted: true, data: encrypted };
    } else {
      dataToStore = keys;
    }
    localStorage.setItem(`${STORAGE_PREFIX}keys`, JSON.stringify(dataToStore));
    window.dispatchEvent(new CustomEvent('api-keys-updated'));
  }

  static hasPassphrase(): boolean {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}keys`);
      if (!stored) return false;
      return JSON.parse(stored).encrypted === true;
    } catch {
      return false;
    }
  }

  static getPreferences(): UserPreferences {
    const defaults: UserPreferences = {
      theme: 'system',
      selectedModel: 'mock:mock-echo',
      showFilesPanel: false,
      showCanvas: false,
      providerModels: {},
      isLeftSidebarCollapsed: false,
      isRightSidebarCollapsed: false,
      fontSizes: {
        general: 16,
        chat: 14,
        code: 14,
        canvas: 16,
        canvasCodePreview: 14,
        canvasCodeEditor: 14,
      },
    };
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}prefs`);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...defaults,
          ...parsed,
          fontSizes: {
            ...defaults.fontSizes,
            ...(parsed.fontSizes || {}),
          },
        };
      }
      return defaults;
    } catch {
      return defaults;
    }
  }

  static setPreferences(prefs: Partial<UserPreferences>): void {
    const current = this.getPreferences();
    localStorage.setItem(`${STORAGE_PREFIX}prefs`, JSON.stringify({ ...current, ...prefs }));
  }

  static exportKeys(format: 'json' | 'yaml' = 'json', keys?: KeyVault): string {
    const keysToExport = keys || this.getApiKeys();
    if (format === 'yaml') {
      return Object.entries(keysToExport)
        .map(([key, value]) => `${key.toUpperCase()}_API_KEY: "${typeof value === 'string' ? value : JSON.stringify(value)}"`)
        .join('\n');
    }
    return JSON.stringify(keysToExport, null, 2);
  }

  static importKeys(content: string, format: 'auto' | 'json' | 'curl' | 'python' | 'nodejs' = 'auto'): KeyVault {
    if (format === 'auto') {
        const trimmed = content.trim();
        if (trimmed.toLowerCase().startsWith('curl')) format = 'curl';
        else if (trimmed.includes('new OpenAI') && trimmed.includes('apiKey')) format = 'nodejs';
        else if (trimmed.includes('from openai import OpenAI')) format = 'python';
        else if (trimmed.startsWith('{')) format = 'json';
    }

    const keys: KeyVault = {};
    let modelName: string | undefined;

    try {
        if (format === 'curl') {
            const urlMatch = content.match(/(https?:\/\/[^\s\\]+)/);
            const keyMatch = content.match(/Authorization:\s*Bearer\s+([^\s"']+)/);
            const dataMatch = content.match(/-d\s+'([\s\S]+?)'/);

            if (urlMatch && keyMatch && dataMatch) {
                const url = urlMatch[1];
                const apiKey = keyMatch[1];
                const body = JSON.parse(dataMatch[1].replace(/\\s*\n/g, ''));
                modelName = body.model;
                if (modelName) {
                    keys[`custom:${modelName}`] = {
                        url,
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                        body,
                    };
                }
            }
        } else if (format === 'python') {
            const keyMatch = content.match(/api_key="([^"]+)"/);
            const urlMatch = content.match(/base_url="([^"]+)"/);
            
            const modelMatch = content.match(/model="([^"]+)"/);
            const maxTokensMatch = content.match(/max_tokens=(\d+)/);
            const tempMatch = content.match(/temperature=([\d.]+)/);
            const topPMatch = content.match(/top_p=([\d.]+)/);

            if (keyMatch && urlMatch && modelMatch) {
                const apiKey = keyMatch[1];
                const baseUrl = urlMatch[1];
                modelName = modelMatch[1];

                const body: { [key: string]: any } = { model: modelName };
                if (maxTokensMatch) body.max_tokens = parseInt(maxTokensMatch[1], 10);
                if (tempMatch) body.temperature = parseFloat(tempMatch[1]);
                if (topPMatch) body.top_p = parseFloat(topPMatch[1]);

                keys[`custom:${modelName}`] = {
                    url: baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`,
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: body,
                };
            }
        } else if (format === 'nodejs') {
            const keyMatch = content.match(/apiKey:\s*'([^']+)'/);
            const urlMatch = content.match(/baseURL:\s*'([^']+)'/);
            const modelMatch = content.match(/"model":\s*"([^"]+)"/);
            
            if (keyMatch && urlMatch && modelMatch) {
                const apiKey = keyMatch[1];
                const baseUrl = urlMatch[1];
                modelName = modelMatch[1];
                 keys[`custom:${modelName}`] = {
                    url: baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`,
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: { model: modelName },
                };
            }
        } else if (format === 'json') {
            const parsed = JSON.parse(content);
            if (parsed.url && parsed.body && parsed.body.model) {
                modelName = parsed.body.model;
                keys[`custom:${modelName}`] = parsed;
            } else {
                for (const [key, value] of Object.entries(parsed)) {
                    if (typeof value === 'string' && value.trim()) {
                        keys[key.toLowerCase()] = value.trim();
                    }
                }
            }
        }
    } catch (error) {
      throw new Error(`Failed to parse ${format} content: ${error}`);
    }

    if (Object.keys(keys).length === 0) {
        throw new Error(`Could not extract valid API key information from the provided ${format} content.`);
    }

    return keys;
  }
}
