import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import BetCard from './BetCard'

export default function BetList({ onRefreshReady }) {
  const { userProfile } = useAuthStore()
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [userPredictions, setUserPredictions] = useState({})

  const fetchBets = async () => {
    setLoading(true)
    try {
      // Fetch all bets
      const { data: betsData, error: betsError } = await supabase
        .from('bets')
        .select(`
          *,
          created_by_user:users!bets_created_by_fkey(email),
          resolved_by_user:users!bets_resolved_by_fkey(email)
        `)
        .order('created_at', { ascending: false })

      if (betsError) throw betsError

      // Fetch user predictions
      const { data: predictionsData, error: predictionsError } = await supabase
        .from('user_predictions')
        .select('*')
        .eq('user_id', userProfile.id)

      if (predictionsError) throw predictionsError

      // Create a map of bet_id -> prediction
      const predictionsMap = {}
      predictionsData.forEach(pred => {
        predictionsMap[pred.bet_id] = pred
      })

      // Fetch prediction counts for each bet
      const betsWithCounts = await Promise.all(
        betsData.map(async (bet) => {
          const { data: predictions } = await supabase
            .from('user_predictions')
            .select('prediction')
            .eq('bet_id', bet.id)

          const yesPredictions = predictions?.filter(p => p.prediction === 'yes').length || 0
          const noPredictions = predictions?.filter(p => p.prediction === 'no').length || 0

          return {
            ...bet,
            yes_count: yesPredictions,
            no_count: noPredictions,
          }
        })
      )

      setBets(betsWithCounts)
      setUserPredictions(predictionsMap)
    } catch (error) {
      console.error('Error fetching bets:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBets()

    // Set up real-time subscription
    const channel = supabase
      .channel('bets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bets',
        },
        () => {
          fetchBets()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_predictions',
        },
        () => {
          fetchBets()
        }
      )
      .subscribe()

    // Expose refresh function to parent component
    if (onRefreshReady) {
      onRefreshReady(() => fetchBets())
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userProfile.id, onRefreshReady])

  const filteredBets = bets.filter(bet => {
    const now = new Date()
    const closesAt = new Date(bet.closes_at)

    switch (filter) {
      case 'open':
        return bet.status === 'open' && closesAt > now
      case 'my_predictions':
        return userPredictions[bet.id]
      case 'resolved':
        return bet.status === 'resolved'
      default:
        return true
    }
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-xl text-gray-600">Loading bets...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="mb-6 flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium ${
            filter === 'all'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          All Bets ({bets.length})
        </button>
        <button
          onClick={() => setFilter('open')}
          className={`px-4 py-2 font-medium ${
            filter === 'open'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Open Bets
        </button>
        <button
          onClick={() => setFilter('my_predictions')}
          className={`px-4 py-2 font-medium ${
            filter === 'my_predictions'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          My Predictions ({Object.keys(userPredictions).length})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`px-4 py-2 font-medium ${
            filter === 'resolved'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Resolved
        </button>
      </div>

      {/* Bet Cards */}
      {filteredBets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No bets found for this filter.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBets.map((bet) => (
            <BetCard
              key={bet.id}
              bet={bet}
              userPrediction={userPredictions[bet.id]}
              onPredictionChange={fetchBets}
            />
          ))}
        </div>
      )}
    </div>
  )
}
