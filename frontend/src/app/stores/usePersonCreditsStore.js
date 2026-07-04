import { create } from 'zustand';

export const usePersonCreditsStore = create((set) => ({
  activeDiscoverTab: (() => {
    try {
      return localStorage.getItem('person_credits_discover_tab') || '';
    } catch (err) {
      console.error(err);
      return '';
    }
  })(),
  setActiveDiscoverTab: (tab) => {
    try {
      if (tab) {
        localStorage.setItem('person_credits_discover_tab', tab);
      } else {
        localStorage.removeItem('person_credits_discover_tab');
      }
    } catch (err) {
      console.error(err);
    }
    set({ activeDiscoverTab: tab });
  },
}));
