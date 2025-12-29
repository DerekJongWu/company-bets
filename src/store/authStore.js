import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      userProfile: null,
      loading: true,

      signUp: async (email, password) => {
        set({ loading: true })
        
        try {
          // Sign up with Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
          })

          if (authError) throw authError
          if (!authData.user) throw new Error('Failed to create user')

          // Check if user profile already exists (handles duplicate signups gracefully)
          const { data: existingProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single()

          let profileData = existingProfile

          // Only create profile if it doesn't exist
          if (!existingProfile) {
            const { data: newProfileData, error: profileError } = await supabase
              .from('users')
              .insert([
                {
                  id: authData.user.id,
                  email: authData.user.email,
                  balance: 100.00,
                  is_admin: false,
                },
              ])
              .select()
              .single()

            if (profileError) {
              // If insert fails due to duplicate key (race condition), fetch existing profile
              if (profileError.code === '23505' || profileError.message?.includes('duplicate')) {
                const { data: fetchedProfile } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', authData.user.id)
                  .single()

                if (fetchedProfile) {
                  profileData = fetchedProfile
                } else {
                  // Profile doesn't exist and insert failed for another reason
                  await supabase.auth.signOut()
                  throw profileError
                }
              } else {
                // Other error occurred
                await supabase.auth.signOut()
                throw profileError
              }
            } else {
              profileData = newProfileData
            }
          }

          set({
            user: authData.user,
            userProfile: profileData,
            loading: false,
          })

          return { user: authData.user }
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      signIn: async (email, password) => {
        set({ loading: true })

        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (authError) throw authError
          if (!authData.user) throw new Error('Failed to sign in')

          // Fetch user profile from database
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single()

          // If profile doesn't exist, create it (handles edge case of old users)
          if (profileError && profileError.code === 'PGRST116') {
            // Profile doesn't exist, create it
            const { data: newProfileData, error: createError } = await supabase
              .from('users')
              .insert([
                {
                  id: authData.user.id,
                  email: authData.user.email,
                  balance: 100.00,
                  is_admin: false,
                },
              ])
              .select()
              .single()

            if (createError) {
              // If insert fails (maybe duplicate from race condition), try fetching again
              if (createError.code === '23505' || createError.message?.includes('duplicate')) {
                const { data: fetchedProfile } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', authData.user.id)
                  .single()

                if (fetchedProfile) {
                  set({
                    user: authData.user,
                    userProfile: fetchedProfile,
                    loading: false,
                  })
                  return { user: authData.user }
                }
              }
              throw createError
            }

            set({
              user: authData.user,
              userProfile: newProfileData,
              loading: false,
            })
            return { user: authData.user }
          }

          if (profileError) throw profileError

          set({
            user: authData.user,
            userProfile: profileData,
            loading: false,
          })

          return { user: authData.user }
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      signOut: async () => {
        try {
          await supabase.auth.signOut()
          set({ user: null, userProfile: null, loading: false })
        } catch (error) {
          console.error('Error signing out:', error)
          // Still clear local state even if signout fails
          set({ user: null, userProfile: null, loading: false })
        }
      },

      refreshUserProfile: async () => {
        const { user } = get()
        if (!user) return null

        try {
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profileError) throw profileError

          set({ userProfile: profileData })
          return profileData
        } catch (error) {
          console.error('Error refreshing user profile:', error)
          return get().userProfile
        }
      },

      initialize: async () => {
        set({ loading: true })

        try {
          // Check for existing session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()

          if (sessionError) {
            console.error('Error getting session:', sessionError)
            set({ user: null, userProfile: null, loading: false })
            return
          }

          if (session?.user) {
            // Fetch user profile from database
            const { data: profileData, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (profileError) {
              console.error('Error fetching user profile:', profileError)
              set({ user: session.user, userProfile: null, loading: false })
            } else {
              set({ user: session.user, userProfile: profileData, loading: false })
            }
          } else {
            set({ user: null, userProfile: null, loading: false })
          }

          // Listen for auth state changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              const { data: profileData } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()

              set({ user: session.user, userProfile: profileData || null })
            } else if (event === 'SIGNED_OUT') {
              set({ user: null, userProfile: null })
            }
          })
        } catch (error) {
          console.error('Error initializing auth:', error)
          set({ user: null, userProfile: null, loading: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      // Only persist user and userProfile, not loading state
      partialize: (state) => ({ user: state.user, userProfile: state.userProfile }),
    }
  )
)
