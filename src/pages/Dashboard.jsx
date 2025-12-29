import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import BetList from '../components/BetList'
import CreateBetModal from '../components/CreateBetModal'
import RefillRequestModal from '../components/RefillRequestModal'
import AdminPanel from '../components/AdminPanel'

export default function Dashboard() {
  const { userProfile, refreshUserProfile } = useAuthStore()
  const [showCreateBet, setShowCreateBet] = useState(false)
  const [showRefillRequest, setShowRefillRequest] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [refreshBetList, setRefreshBetList] = useState(() => () => {})

  // Set up real-time subscription for user balance updates
  useEffect(() => {
    if (!userProfile?.id) return

    const channel = supabase
      .channel('user-balance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userProfile.id}`,
        },
        () => {
          refreshUserProfile()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userProfile?.id, refreshUserProfile])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setShowCreateBet(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            Create New Bet
          </button>

          <button
            onClick={() => setShowRefillRequest(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            Request Refill
          </button>

          {userProfile?.is_admin && (
            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-medium transition"
            >
              {showAdminPanel ? 'Hide Admin Panel' : 'Show Admin Panel'}
            </button>
          )}
        </div>

        {/* Admin Panel */}
        {showAdminPanel && userProfile?.is_admin && (
          <div className="mb-6">
            <AdminPanel />
          </div>
        )}

        {/* Bet List */}
        <BetList onRefreshReady={setRefreshBetList} />
      </div>

      {/* Modals */}
      {showCreateBet && (
        <CreateBetModal 
          onClose={() => {
            setShowCreateBet(false)
            // Refresh bet list after creating a bet
            setTimeout(() => {
              refreshBetList()
            }, 200) // Small delay to ensure database write is complete
          }} 
        />
      )}

      {showRefillRequest && (
        <RefillRequestModal onClose={() => setShowRefillRequest(false)} />
      )}
    </div>
  )
}
