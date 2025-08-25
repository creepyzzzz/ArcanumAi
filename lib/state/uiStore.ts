import { create } from 'zustand';
import { Storage, FontSizes } from '@/lib/storage';

interface UiState {
  fontSizes: FontSizes;
  setFontSize: (key: keyof FontSizes, value: number) => void;
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
  setFontSize: (key, value) => {
    set((state) => {
      const newFontSizes = { ...state.fontSizes, [key]: value };
      const currentPrefs = Storage.getPreferences();
      Storage.setPreferences({ ...currentPrefs, fontSizes: newFontSizes });
      return { fontSizes: newFontSizes };
    });
  },
  loadInitialPreferences: () => {
    const prefs = Storage.getPreferences();
    set({ fontSizes: prefs.fontSizes });
  },
}));
