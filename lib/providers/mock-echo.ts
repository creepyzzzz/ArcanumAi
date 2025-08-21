import { ProviderAdapter, ChatMessage } from './base';

export class MockEchoAdapter implements ProviderAdapter {
  id = 'mock';
  displayName = 'Mock Echo';
  needsKey = false;
  
  models = [
    { id: 'mock-echo', label: 'Mock Echo' },
    { id: 'mock-random', label: 'Mock Random' },
  ];

  async sendChat(opts: {
    apiKey?: string;
    model: string;
    messages: ChatMessage[];
    stream?: (chunk: string) => void;
    abortSignal?: AbortSignal;
  }): Promise<{ text: string }> {
    const userMessage = opts.messages[opts.messages.length - 1]?.content || '';
    let response = '';
    
    if (opts.model === 'mock-random') {
      const responses = [
        'That\'s an interesting question. Let me think about that...',
        'I understand what you\'re asking. Here\'s my perspective:',
        'That\'s a great point. I\'d say that...',
        'I see where you\'re coming from. In my experience...',
        'That reminds me of something similar...'
      ];
      response = responses[Math.floor(Math.random() * responses.length)];
    } else {
      response = `You said: "${userMessage}"\n\nThis is a mock echo response. I'm simulating an AI assistant that would normally connect to a real language model API. The message above is what you sent to me.`;
    }

    if (opts.stream) {
      const words = response.split(' ');
      let currentText = '';
      
      for (let i = 0; i < words.length; i++) {
        if (opts.abortSignal?.aborted) {
          throw new Error('Aborted');
        }
        
        currentText += (i > 0 ? ' ' : '') + words[i];
        opts.stream(words[i] + (i < words.length - 1 ? ' ' : ''));
        
        // Simulate typing delay
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      }
      
      return { text: currentText };
    }

    // Non-streaming response with delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { text: response };
  }
}