import { ProviderAdapter, ChatMessage, ChatOptions } from './base';

export class BuiltInAdapter implements ProviderAdapter {
  id = 'builtin';
  displayName = 'Built-in Models';
  needsKey = false; 
  
  models = [
    { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B Instruct' },
    { id: 'meta-llama/llama-3-8b-instruct:free', label: 'Llama 3 8B (Fast & Capable)' },
    { id: 'deepseek/deepseek-chat-v3.1:free', label: 'DeepSeek Chat V3.1' },
    { id: 'openrouter/sonoma-sky-alpha', label: 'Sonoma Sky Alpha' },
    { id: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B' },
  
  ];

  async sendChat(opts: ChatOptions): Promise<{ text: string }> {
    throw new Error('BuiltInAdapter.sendChat should not be called directly.');
  }
}
