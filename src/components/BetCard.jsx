import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export default function BetCard({ bet, userPrediction, onPredictionChange }) {
  const { userProfile, refreshUserProfile } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const now = new Date()
  const closesAt = new Date(bet.closes_at)
  const isOpen = bet.status === 'open' && closesAt > now
  const isClosed = closesAt <= now && bet.status === 'open'

  const handlePrediction = async (prediction) => {
    if (!isOpen) {
      setError('This bet is no longer open')
      return
    }

    if (!userPrediction && userProfile.balance < 1) {
      setError('Insufficient balance. Please request a refill.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Check if user already has a prediction
      const isNewPrediction = !userPrediction

      if (isNewPrediction) {
        // New prediction - need to deduct balance and create transaction
        const { error: balanceError } = await supabase.rpc('place_prediction', {
          p_user_id: userProfile.id,
          p_bet_id: bet.id,
          p_prediction: prediction,
        })

        if (balanceError) {
          // If stored procedure doesn't exist, do it manually
          // Start transaction manually
          const newBalance = userProfile.balance - 1

          // Update balance
          const { error: updateError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', userProfile.id)

          if (updateError) throw updateError

          // Insert prediction
          const { error: predError } = await supabase
            .from('user_predictions')
            .insert([{
              user_id: userProfile.id,
              bet_id: bet.id,
              prediction: prediction,
              amount: 1.00,
            }])

          if (predError) throw predError

          // Create transaction record
          const { error: transError } = await supabase
            .from('transactions')
            .insert([{
              user_id: userProfile.id,
              bet_id: bet.id,
              amount: -1.00,
              type: 'bet_placed',
            }])

          if (transError) throw transError
        }
      } else {
        // Changing prediction - just update
        const { error: updateError } = await supabase
          .from('user_predictions')
          .update({
            prediction: prediction,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userProfile.id)
          .eq('bet_id', bet.id)

        if (updateError) throw updateError
      }

      // Refresh user profile to get updated balance
      await refreshUserProfile()

      // Trigger parent refresh
      onPredictionChange()
    } catch (err) {
      console.error('Error placing prediction:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeRemaining = () => {
    if (isClosed) return 'Closed'
    if (bet.status === 'resolved') return 'Resolved'
    if (bet.status === 'cancelled') return 'Cancelled'

    const diff = closesAt - now
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h remaining`
    }
    return `${hours}h ${minutes}m remaining`
  }

  const getStatusBadge = () => {
    if (bet.status === 'resolved') {
      const didWin = userPrediction?.prediction === bet.resolution
      return (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          didWin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {didWin ? 'WON' : 'LOST'} - Resolved: {bet.resolution.toUpperCase()}
        </span>
      )
    }
    if (bet.status === 'cancelled') {
      return (
        <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800">
          CANCELLED (Refunded)
        </span>
      )
    }
    if (isClosed) {
      return (
        <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-800">
          CLOSED
        </span>
      )
    }
    return (
      <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
        OPEN
      </span>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      {/* Header */}
      <div className="mb-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 flex-1">
            {bet.question}
          </h3>
          {getStatusBadge()}
        </div>
        <p className="text-sm text-gray-500">
          {formatTimeRemaining()}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Created by {bet.created_by_user?.email || 'Unknown'}
        </p>
      </div>

      {/* Prediction Counts */}
      <div className="mb-4 flex space-x-4 text-sm">
        <div className="flex items-center">
          <span className="font-medium text-green-600">YES:</span>
          <span className="ml-1 text-gray-700">{bet.yes_count || 0}</span>
        </div>
        <div className="flex items-center">
          <span className="font-medium text-red-600">NO:</span>
          <span className="ml-1 text-gray-700">{bet.no_count || 0}</span>
        </div>
      </div>

      {/* User's Prediction */}
      {userPrediction && (
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <p className="text-sm font-medium text-blue-900">
            Your prediction: <span className="font-bold">{userPrediction.prediction.toUpperCase()}</span>
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 rounded">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      {isOpen && (
        <div className="flex space-x-3">
          <button
            onClick={() => handlePrediction('yes')}
            disabled={loading}
            className={`flex-1 py-2 rounded font-medium transition ${
              userPrediction?.prediction === 'yes'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            } disabled:opacity-50`}
          >
            {loading ? 'Processing...' : 'YES'}
          </button>
          <button
            onClick={() => handlePrediction('no')}
            disabled={loading}
            className={`flex-1 py-2 rounded font-medium transition ${
              userPrediction?.prediction === 'no'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            } disabled:opacity-50`}
          >
            {loading ? 'Processing...' : 'NO'}
          </button>
        </div>
      )}

      {!isOpen && bet.status === 'open' && (
        <div className="text-center text-sm text-gray-500">
          Betting closed
        </div>
      )}
    </div>
  )
}
