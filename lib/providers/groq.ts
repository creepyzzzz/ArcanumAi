import { ProviderAdapter, ChatMessage } from './base';

export class GroqAdapter implements ProviderAdapter {
  id = 'groq';
  displayName = 'Groq';
  needsKey = true;
  
  models = [
    { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    { id: 'llama2-70b-4096', label: 'Llama2 70B' },
    { id: 'gemma-7b-it', label: 'Gemma 7B' },
  ];

  async sendChat(opts: {
    apiKey?: string;
    model: string;
    messages: ChatMessage[];
    stream?: (chunk: string) => void;
    abortSignal?: AbortSignal;
  }): Promise<{ text: string }> {
    const response = await fetch('/api/relay/groq', {
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
      signal: opts.abortSignal
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
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
                  opts.stream(content);
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