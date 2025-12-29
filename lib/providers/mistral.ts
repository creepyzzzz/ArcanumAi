import { ProviderAdapter, ChatMessage, ChatOptions } from './base';

export class MistralAdapter implements ProviderAdapter {
  id = 'mistral';
  displayName = 'Mistral';
  needsKey = true;
  
  models = [
    // --- UPDATE: Added the missing Mistral 7B Instruct model ---
    { id: 'mistral-7b-instruct', label: 'Mistral 7B Instruct' },
    { id: 'mistral-large-latest', label: 'Mistral Large' },
    { id: 'mistral-medium-latest', label: 'Mistral Medium' },
    { id: 'mistral-small-latest', label: 'Mistral Small' },
  ];

  async sendChat(opts: ChatOptions): Promise<{ text: string; reasoning?: string }> {
    const response = await fetch('/api/relay/mistral', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: opts.apiKey,
        model: opts.model,
        messages: opts.messages,
        stream: !!opts.stream
      }),
      signal: opts.signal
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }

    if (opts.stream && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
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
                // Ignore parsing errors
              }
            }
          }
        }
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