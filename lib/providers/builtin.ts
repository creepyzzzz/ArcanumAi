import { ProviderAdapter, ChatMessage, ChatOptions } from './base';

export class BuiltInAdapter implements ProviderAdapter {
  id = 'builtin';
  displayName = 'Built-in Models';
  // This is the most important part: it tells the UI not to ask for a key.
  needsKey = false; 
  
  models = [
    { id: 'mistral-7b-instruct', label: 'Mistral 7B Instruct' },
  ];

  // This function will not be called directly from the frontend.
  // Instead, requests will go to our new secure relay route.
  async sendChat(opts: ChatOptions): Promise<{ text: string }> {
    throw new Error('BuiltInAdapter.sendChat should not be called directly.');
  }
}
