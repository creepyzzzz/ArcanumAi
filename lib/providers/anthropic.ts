import { ProviderAdapter, ChatMessage, ChatOptions } from './base';

export class AnthropicAdapter implements ProviderAdapter {
  id = 'anthropic';
  displayName = 'Anthropic';
  needsKey = true;
  
  models = [
    { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ];

  async sendChat(opts: ChatOptions): Promise<{ text: string; reasoning?: string }> {
    const response = await fetch('/api/relay/anthropic', {
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
      throw new Error(`Anthropic API error: ${response.statusText}`);
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
                if (parsed.type === 'content_block_delta') {
                  const content = parsed.delta?.text;
                  if (content) {
                    fullText += content;
                    if (opts.stream) {
                      opts.stream(content, '');
                    }
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
      return { text: data.content?.[0]?.text || 'No response' };
    }
  }
}
