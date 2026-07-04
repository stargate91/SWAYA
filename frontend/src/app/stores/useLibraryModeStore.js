import { create } from 'zustand';

export const useLibraryModeStore = create((set) => ({
  sessionMode: (() => {
    try {
      return localStorage.getItem('library_session_mode') || 'sfw';
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
    }
    set({ sessionMode: mode || 'sfw' });
  },
  toggleSessionMode: () => {
    set((state) => {
      const nextMode = state.sessionMode === 'nsfw' ? 'sfw' : 'nsfw';
      try {
        localStorage.setItem('library_session_mode', nextMode);
      } catch (err) {
        console.error(err);
      }
      return { sessionMode: nextMode };
    });
  },
}));
