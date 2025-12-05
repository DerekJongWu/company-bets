import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Simple mock user store - no Supabase auth for now
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      userProfile: null,
      loading: false,

      signUp: async (name) => {
        // Create a mock user with a random ID
        const mockUser = {
          id: crypto.randomUUID(),
          name: name,
          email: `${name.toLowerCase().replace(/\s/g, '')}@example.com`,
        }

        const mockProfile = {
          id: mockUser.id,
          email: mockUser.email,
          balance: 100.00,
          is_admin: false,
        }

        set({ user: mockUser, userProfile: mockProfile })
        return { user: mockUser }
      },

      signIn: async (name) => {
        // For simplicity, just create a new session
        return get().signUp(name)
      },

      signOut: () => {
        set({ user: null, userProfile: null })
      },

      refreshUserProfile: () => {
        // Mock refresh - just return current profile
        return get().userProfile
      },

      initialize: () => {
        // Check if user exists in localStorage (handled by persist middleware)
        set({ loading: false })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
