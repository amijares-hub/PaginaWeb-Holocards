import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark', // Default theme
      toggleTheme: () => {
        const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: nextTheme });
        updateDocumentTheme(nextTheme);
      },
      setTheme: (theme) => {
        set({ theme });
        updateDocumentTheme(theme);
      },
    }),
    {
      name: 'holocard-theme-storage',
    }
  )
);

// Helper to update the DOM class
export const updateDocumentTheme = (theme: 'light' | 'dark') => {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
};
