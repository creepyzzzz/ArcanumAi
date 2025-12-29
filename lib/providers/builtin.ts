import { ProviderAdapter, ChatMessage, ChatOptions } from './base';

export class BuiltInAdapter implements ProviderAdapter {
  id = 'builtin';
  displayName = 'Built-in Models';
  needsKey = false; 
  
  models = [
    { id: 'xiaomi/mimo-v2-flash:free', label: 'MiMo-V2-Flash (Top Open Source)' },
    { id: 'mistralai/devstral-2512:free', label: 'Devstral 2 2512 (Coding)' },
    { id: 'allenai/olmo-3.1-32b-think:free', label: 'Olmo 3.1 32B Think (Reasoning)' },
    { id: 'kwaipilot/kat-coder-pro:free', label: 'KAT-Coder-Pro V1 (Agentic Coding)' },
    { id: 'tngtech/deepseek-r1t2-chimera:free', label: 'DeepSeek R1T2 Chimera (Reasoning)' },
    { id: 'z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air (Agent)' },
    { id: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron 3 Nano 30B (Efficient)' },
  ];

  async sendChat(opts: ChatOptions): Promise<{ text: string; reasoning?: string }> {
    throw new Error('BuiltInAdapter.sendChat should not be called directly.');
  }
}