import { create } from 'zustand';

export const useLibraryModeStore = create((set) => ({
  sessionMode: (() => {
    try {
      return localStorage.getItem('library_session_mode') || 'sfw';
    } catch {
      return 'sfw';
    }
  })(),
  setSessionMode: (mode) => {
    try {
      if (mode) {
        localStorage.setItem('library_session_mode', mode);
      } else {
        localStorage.removeItem('library_session_mode');
      }
    } catch {
      // Ignore
    }
    set({ sessionMode: mode || 'sfw' });
  },
  toggleSessionMode: () => {
    set((state) => {
      const nextMode = state.sessionMode === 'nsfw' ? 'sfw' : 'nsfw';
      try {
        localStorage.setItem('library_session_mode', nextMode);
      } catch {
        // Ignore
      }
      return { sessionMode: nextMode };
    });
  },
}));
