import { create } from 'zustand';
import { Storage, FontSizes } from '@/lib/storage';

interface ProviderModels {
  [key: string]: string[];
}

interface UiState {
  fontSizes: FontSizes;
  providerModels: ProviderModels;
  setFontSize: (key: keyof FontSizes, value: number) => void;
  setProviderModels: (providerModels: ProviderModels) => void;
  loadInitialPreferences: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  fontSizes: {
    general: 16,
    chat: 14,
    code: 14,
    canvas: 16,
    canvasCodePreview: 14,
    canvasCodeEditor: 14,
  },
  providerModels: {},
  setFontSize: (key, value) => {
    set((state) => {
      const newFontSizes = { ...state.fontSizes, [key]: value };
      const currentPrefs = Storage.getPreferences();
      Storage.setPreferences({ ...currentPrefs, fontSizes: newFontSizes });
      return { fontSizes: newFontSizes };
    });
  },
  setProviderModels: (providerModels) => {
    set(() => {
      const currentPrefs = Storage.getPreferences();
      Storage.setPreferences({ ...currentPrefs, providerModels });
      return { providerModels };
    });
  },
  loadInitialPreferences: () => {
    const prefs = Storage.getPreferences();
    set({ fontSizes: prefs.fontSizes, providerModels: prefs.providerModels || {} });
  },
}));