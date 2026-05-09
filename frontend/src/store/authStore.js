import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      role: null,
      shipId: null,
      operatorName: 'Cmdr. Sarah Johnson',
      operatorTitle: 'Fleet Administrator',
      setRole: (role, shipId = null) => set({ role, shipId }),
      logout: () => set({ role: null, shipId: null })
    }),
    { name: 'fleet-auth' }
  )
);
