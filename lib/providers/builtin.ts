import { ProviderAdapter, ChatMessage, ChatOptions } from './base';

export class BuiltInAdapter implements ProviderAdapter {
  id = 'builtin';
  displayName = 'Built-in Models';
  // This is the most important part: it tells the UI not to ask for a key.
  needsKey = false; 
  
  // --- MODIFICATION START ---
  // Added the 6 new models to the built-in list.
  // These will now appear under the "Built-in Models" dropdown section.
  models = [
    { id: 'mistral-7b-instruct', label: 'Mistral 7B Instruct' },
    
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
  // --- MODIFICATION END ---

  // This function will not be called directly from the frontend.
  // Instead, requests will go to our secure relay route.
  async sendChat(opts: ChatOptions): Promise<{ text: string }> {
    throw new Error('BuiltInAdapter.sendChat should not be called directly.');
  }
}
