import { ProviderAdapter, ChatMessage, ChatOptions } from './base';

export class GroqAdapter implements ProviderAdapter {
  id = 'groq';
  displayName = 'Groq';
  needsKey = true;
  
  models = [
    { id: 'qwen/qwen3-32b', label: 'qwen/qwen3-32b', supportsReasoning: true },
    { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'meta-llama/llama-4-scout-17b-16e-instruct' },
    { id: 'deepseek-r1-distill-llama-70b', label: 'deepseek-r1-distill-llama-70b' },
    { id: 'moonshotai/kimi-k2-instruct', label: 'moonshotai/kimi-k2-instruct' },
    { id: 'allam-2-7b', label: 'allam-2-7b' },
    { id: 'meta-llama/llama-guard-4-12b', label: 'meta-llama/llama-guard-4-12b' },
    { id: 'gemma2-9b-it', label: 'gemma2-9b-it' },
    { id: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile' },
    { id: 'openai/gpt-oss-20b', label: 'openai/gpt-oss-20b', supportsReasoning: true },
    { id: 'whisper-large-v3-turbo', label: 'whisper-large-v3-turbo' },
    { id: 'groq/compound-mini', label: 'groq/compound-mini' },
    { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', label: 'meta-llama/llama-4-maverick-17b-128e-instruct' },
    { id: 'playai-tts', label: 'playai-tts' },
    { id: 'meta-llama/llama-prompt-guard-2-86m', label: 'meta-llama/llama-prompt-guard-2-86m' },
    { id: 'meta-llama/llama-prompt-guard-2-22m', label: 'meta-llama/llama-prompt-guard-2-22m' },
    { id: 'openai/gpt-oss-120b', label: 'openai/gpt-oss-120b', supportsReasoning: true },
    { id: 'groq/compound', label: 'groq/compound' },
    { id: 'playai-tts-arabic', label: 'playai-tts-arabic' },
    { id: 'whisper-large-v3', label: 'whisper-large-v3' },
    { id: 'moonshotai/kimi-k2-instruct-0905', label: 'moonshotai/kimi-k2-instruct-0905' },
    { id: 'llama-3.1-8b-instant', label: 'llama-3.1-8b-instant' },
  ];

  async sendChat(opts: ChatOptions): Promise<{ text: string; reasoning?: string }> {
    const response = await fetch('/api/relay/groq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: opts.apiKey,
        model: opts.model,
        messages: opts.messages,
        attachments: opts.attachments,
        stream: !!opts.stream
      }),
      signal: opts.signal
    });

    if (!response.ok) {
      if (opts.signal?.aborted) {
        throw new Error('Request aborted by user');
      }
      const errorBody = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Groq API error: ${errorBody.error || response.statusText}`);
    }

    if (opts.stream && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let reasoningText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.type === 'reasoning' && opts.stream) {
                  reasoningText += parsed.data;
                  opts.stream('', parsed.data);
                } else if (parsed.type === 'content' && opts.stream) {
                  fullText += parsed.data;
                  opts.stream(parsed.data, '');
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

      return { text: fullText, reasoning: reasoningText };
    } else {
      const data = await response.json();
      return { text: data.choices?.[0]?.message?.content || 'No response', reasoning: data.choices?.[0]?.message?.reasoning };
    }
  }
}