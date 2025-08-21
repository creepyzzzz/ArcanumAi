import { ProviderAdapter, ChatOptions } from './base';

export class GeminiAdapter implements ProviderAdapter {
  id = 'gemini';
  displayName = 'Google Gemini';
  needsKey = true;
  
  models = [
    { id: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash' },
    { id: 'gemini-pro-vision', label: 'Gemini Pro Vision' },
  ];

  async sendChat(opts: ChatOptions): Promise<{ text: string }> {
    const response = await fetch('/api/relay/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: opts.apiKey,
        model: opts.model,
        messages: opts.messages,
        attachments: opts.attachments, // NEW: Pass attachments to the backend
        stream: !!opts.stream
      }),
      signal: opts.signal
    });

    if (!response.ok) {
      if (opts.signal?.aborted) {
        throw new Error('Request aborted by user');
      }
      const errorBody = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Gemini API error: ${errorBody.error || response.statusText}`);
    }

    if (opts.stream && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        opts.stream(chunk);
      }
      
      return { text: fullText };
    } else {
      const data = await response.json();
      return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response' };
    }
  }
}
