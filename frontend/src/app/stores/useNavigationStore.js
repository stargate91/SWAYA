import { create } from 'zustand';

export const useNavigationStore = create((set, get) => ({
  historyStack: [],
  currentIndex: -1,

  syncPath: (path, navType) => {
    const { historyStack, currentIndex } = get();
    
    if (navType === 'POP') {
      const idx = historyStack.lastIndexOf(path);
      if (idx !== -1) {
        set({ currentIndex: idx });
        return;
      }
    }
    
    if (historyStack[currentIndex] === path) return;
    
    const cleanStack = historyStack.slice(0, currentIndex + 1);
    const newStack = [...cleanStack, path];
    
    set({
      historyStack: newStack,
      currentIndex: newStack.length - 1
    });
  },

  goBack: (navigate) => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
      navigate(-1);
    }
  },

  goForward: (navigate) => {
    const { historyStack, currentIndex } = get();
    if (currentIndex < historyStack.length - 1) {
      set({ currentIndex: currentIndex + 1 });
      navigate(1);
    }
  },

  resetHistory: (initialPath) => {
    set({
      historyStack: initialPath ? [initialPath] : [],
      currentIndex: initialPath ? 0 : -1
    });
  }
}));
