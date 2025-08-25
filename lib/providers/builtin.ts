import { ProviderAdapter, ChatMessage, ChatOptions } from './base';

export class BuiltInAdapter implements ProviderAdapter {
  id = 'builtin';
  displayName = 'Built-in Models';
  needsKey = false; 
  
  models = [
    // --- MODIFICATION START ---
    // The ID for Mistral 7B Instruct has been updated to include its full
    // vendor prefix, making it consistent with all other models in this list.
    { id: 'mistralai/mistral-7b-instruct', label: 'Mistral 7B Instruct' },
    // --- MODIFICATION END ---
    
    // Genius Brains (Maximum Reasoning Power)
    { id: 'meta-llama/llama-3.1-405b-instruct', label: 'Llama 3.1 405B (Genius)' },
    { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B (Code & Logic)' },

    // Multimodal Specialists (Seeing & Analyzing)
    { id: 'qwen/qwen-2.5-vl-72b-instruct', label: 'Qwen 2.5 VL 72B (Vision)' },
    { id: 'google/gemini-flash-2.0-experimental', label: 'Gemini 2.0 Flash (Files)' },

    // Everyday Workhorses (Speed & Tools)
    { id: 'mistralai/mistral-nemo', label: 'Mistral Nemo (Tools)' },
    { id: 'meta-llama/llama-3.2-3b-instruct', label: 'Llama 3.2 3B (Fast)' },
  ];

  async sendChat(opts: ChatOptions): Promise<{ text: string }> {
    throw new Error('BuiltInAdapter.sendChat should not be called directly.');
  }
}
