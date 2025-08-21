import { ProviderAdapter, ChatOptions, ChatMessage } from './base';

export class OpenRouterAdapter implements ProviderAdapter {
  id = 'openrouter';
  displayName = 'OpenRouter';
  needsKey = true;
  
  models = [
    { id: 'anthropic/claude-3-opus', label: 'Claude 3 Opus' },
    { id: 'anthropic/claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { id: 'openai/gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
    { id: 'openai/gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { id: 'google/gemini-pro', label: 'Gemini Pro' },
    { id: 'mistralai/mistral-7b-instruct', label: 'Mistral 7B' },
  ];

  async sendChat(opts: ChatOptions): Promise<{ text: string }> {
    if (!opts.apiKey) {
      throw new Error('API key required for OpenRouter');
    }

    // Create a deep copy to avoid mutating the original messages array
    const messagesForApi = JSON.parse(JSON.stringify(opts.messages));
    let hasIgnoredImages = false;

    if (opts.attachments && opts.attachments.length > 0) {
      // Find the index of the last user message in a compatible way
      let lastUserMessageIndex = -1;
      for (let i = messagesForApi.length - 1; i >= 0; i--) {
        if (messagesForApi[i].role === 'user') {
          lastUserMessageIndex = i;
          break;
        }
      }
      
      if (lastUserMessageIndex !== -1) {
        let combinedTextContent = messagesForApi[lastUserMessageIndex].content;

        for (const att of opts.attachments) {
          if ((att.type === 'text' || att.type === 'document') && att.text) {
            // Prepend file content and clarify the user's question
            combinedTextContent = `Attached File: "${att.name}"\n\n---\n${att.text}\n---\n\nUser Question: ${combinedTextContent}`;
          } else if (att.type === 'image') {
            hasIgnoredImages = true;
          }
        }
        // Securely update the content of the message object
        messagesForApi[lastUserMessageIndex].content = combinedTextContent;
      }
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
        'X-Title': 'AI Chat App'
      },
      body: JSON.stringify({
        model: opts.model,
        messages: messagesForApi.map((msg: ChatMessage) => ({
          role: msg.role,
          content: msg.content
        })),
        stream: !!opts.stream
      }),
      signal: opts.signal
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    if (opts.stream && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let warningSent = false;

      try {
        while (true) {
          if (hasIgnoredImages && !warningSent) {
            const warningText = "*Note: The current model does not support image attachments, and they have been ignored.*\n\n";
            opts.stream(warningText);
            fullText += warningText;
            warningSent = true;
          }

          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
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
                  opts.stream(content);
                }
              } catch (e) {
                // Ignore parsing errors for incomplete JSON chunks
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
      let responseText = data.choices?.[0]?.message?.content || 'No response';
      
      if (hasIgnoredImages) {
        responseText = `*Note: The current model does not support image attachments, and they have been ignored.*\n\n` + responseText;
      }
      
      return { text: responseText };
    }
  }
}
