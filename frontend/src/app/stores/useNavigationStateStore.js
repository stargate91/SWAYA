import { create } from 'zustand';

export const useNavigationStateStore = create((set, get) => ({
  pageStates: {},

  setPageState: (path, state) => set((prev) => ({
    pageStates: {
      ...prev.pageStates,
      [path]: {
        ...prev.pageStates[path],
        ...state
      }
    }
  })),

  getPageState: (path) => get().pageStates[path] || {},

  clearPageState: (path) => set((prev) => {
    const nextStates = { ...prev.pageStates };
    delete nextStates[path];
    return { pageStates: nextStates };
  })
}));
