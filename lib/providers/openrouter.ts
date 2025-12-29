import { ProviderAdapter, ChatOptions, ChatMessage } from './base';

let keyList: string[] = [];
let currentKeyIndex = 0;

export class OpenRouterAdapter implements ProviderAdapter {
  id = 'openrouter';
  displayName = 'OpenRouter';
  needsKey = true;
  
  models = [
    { id: 'meta-llama/llama-3.1-405b-instruct', label: 'Llama 3.1 405B (Genius)' },
    { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B (Code & Logic)' },
    { id: 'qwen/qwen-2.5-vl-72b-instruct', label: 'Qwen 2.5 VL 72B (Vision)' },
    { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Files)' },
    { id: 'mistralai/mistral-nemo', label: 'Mistral Nemo (Tools)' },
    { id: 'meta-llama/llama-3.2-3b-instruct', label: 'Llama 3.2 3B (Fast)' },
  ];

  private initKeys(apiKey: string) {
    if (apiKey) {
      keyList = apiKey.split(',').map(k => k.trim()).filter(k => k);
    }
  }

  private getNextKey(): string | undefined {
    if (keyList.length === 0) return undefined;
    const key = keyList[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % keyList.length;
    return key;
  }

  async sendChat(opts: ChatOptions): Promise<{ text: string; reasoning?: string }> {
    if (!opts.apiKey) {
      throw new Error('API key required for OpenRouter');
    }

    this.initKeys(opts.apiKey);
    
    const attemptRequest = async (retries: number): Promise<Response> => {
      const key = this.getNextKey();
      if (!key) {
        throw new Error('No valid API keys provided for OpenRouter.');
      }

      const messagesForApi = JSON.parse(JSON.stringify(opts.messages));
      const isMultimodal = opts.model.includes('gemini-flash') || opts.model.includes('qwen-2.5-vl');
      let hasIgnoredAttachments = false;
      let ignoredReason = '';

      let lastUserMessageIndex = -1;
      for (let i = messagesForApi.length - 1; i >= 0; i--) {
        if (messagesForApi[i].role === 'user') {
          lastUserMessageIndex = i;
          break;
        }
      }

      if (lastUserMessageIndex !== -1 && opts.attachments && opts.attachments.length > 0) {
        const lastUserMessage = messagesForApi[lastUserMessageIndex];
        let combinedTextContent = lastUserMessage.content || '';
        const imageAttachments = [];

        for (const att of opts.attachments) {
          if (isMultimodal && att.type === 'image' && att.dataUrl) {
            imageAttachments.push({
              type: 'image_url',
              image_url: {
                url: att.dataUrl,
              },
            });
          } else if ((att.type === 'text' || att.type === 'document') && att.text) {
            combinedTextContent = `Attached File: "${att.name}"\n\n---\n${att.text}\n---\n\nUser Question: ${combinedTextContent}`;
          } else {
            hasIgnoredAttachments = true;
            ignoredReason = isMultimodal 
              ? 'Unsupported attachment type.' 
              : 'The current model does not support image or file attachments.';
          }
        }

        if (imageAttachments.length > 0) {
          lastUserMessage.content = [
            { type: 'text', text: combinedTextContent },
            ...imageAttachments,
          ];
        } else {
          lastUserMessage.content = combinedTextContent;
        }
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
          'X-Title': 'Arcanum AI Chat',
        },
        body: JSON.stringify({
          model: opts.model,
          messages: messagesForApi,
          stream: !!opts.stream
        }),
        signal: opts.signal
      });

      if (response.status === 402 && retries > 0) {
        console.warn(`OpenRouter key ${key.substring(0, 8)}... failed (credit limit?). Retrying with next key.`);
        return attemptRequest(retries - 1);
      }
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('OpenRouter API Error:', errorBody);
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      return response;
    };

    const response = await attemptRequest(keyList.length);

    if (opts.stream && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data.trim() === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullText += content;
                  if (opts.stream) {
                    opts.stream(content, '');
                  }
                }
              } catch (e) {
                // Ignore parsing errors for incomplete JSON chunks
              }
            }
          }
        }
      } catch (e) {
        // Ignore parsing errors for incomplete JSON chunks
      } finally {
        reader.releaseLock();
      }

      return { text: fullText };
    } else {
      const data = await response.json();
      return { text: data.choices?.[0]?.message?.content || 'No response' };
    }
  }
}