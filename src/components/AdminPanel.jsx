import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export default function AdminPanel() {
  const { userProfile } = useAuthStore()
  const [activeTab, setActiveTab] = useState('resolve')
  const [bets, setBets] = useState([])
  const [refillRequests, setRefillRequests] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchBets()
    fetchRefillRequests()
    if (activeTab === 'admins') {
      fetchUsers()
    }
  }, [activeTab])

  const fetchBets = async () => {
    const { data, error } = await supabase
      .from('bets')
      .select('*, created_by_user:users!bets_created_by_fkey(email)')
      .in('status', ['open', 'closed'])
      .order('created_at', { ascending: false })

    if (!error) setBets(data || [])
  }

  const fetchRefillRequests = async () => {
    const { data, error } = await supabase
      .from('refill_requests')
      .select('*, user:users!refill_requests_user_id_fkey(email, balance)')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })

    if (!error) setRefillRequests(data || [])
  }

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, balance, is_admin, created_at')
      .order('created_at', { ascending: false })

    if (!error) setUsers(data || [])
  }

  const handleResolveBet = async (betId, resolution) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Get all predictions for this bet
      const { data: predictions, error: predError } = await supabase
        .from('user_predictions')
        .select('*')
        .eq('bet_id', betId)

      if (predError) throw predError

      // Find winners
      const winners = predictions.filter(p => p.prediction === resolution)

      // Update bet status
      const { error: betError } = await supabase
        .from('bets')
        .update({
          status: 'resolved',
          resolution: resolution,
          resolved_at: new Date().toISOString(),
          resolved_by: userProfile.id,
        })
        .eq('id', betId)

      if (betError) throw betError

      // Process winners
      for (const winner of winners) {
        // Get current balance
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('balance')
          .eq('id', winner.user_id)
          .single()

        if (userError) throw userError

        const newBalance = parseFloat(userData.balance) + 1.00

        // Update balance
        const { error: balanceError } = await supabase
          .from('users')
          .update({ balance: newBalance })
          .eq('id', winner.user_id)

        if (balanceError) throw balanceError

        // Create transaction
        const { error: transError } = await supabase
          .from('transactions')
          .insert([{
            user_id: winner.user_id,
            bet_id: betId,
            amount: 1.00,
            type: 'bet_won',
          }])

        if (transError) throw transError
      }

      setSuccess(`Bet resolved as ${resolution.toUpperCase()}. ${winners.length} winners paid out.`)
      fetchBets()
    } catch (err) {
      console.error('Error resolving bet:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBet = async (betId) => {
    if (!confirm('Are you sure you want to cancel this bet? All predictions will be refunded.')) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Get all predictions for this bet
      const { data: predictions, error: predError } = await supabase
        .from('user_predictions')
        .select('*')
        .eq('bet_id', betId)

      if (predError) throw predError

      // Update bet status
      const { error: betError } = await supabase
        .from('bets')
        .update({
          status: 'cancelled',
          resolved_at: new Date().toISOString(),
          resolved_by: userProfile.id,
        })
        .eq('id', betId)

      if (betError) throw betError

      // Refund all predictions
      for (const prediction of predictions) {
        // Get current balance
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('balance')
          .eq('id', prediction.user_id)
          .single()

        if (userError) throw userError

        const newBalance = parseFloat(userData.balance) + 1.00

        // Update balance
        const { error: balanceError } = await supabase
          .from('users')
          .update({ balance: newBalance })
          .eq('id', prediction.user_id)

        if (balanceError) throw balanceError

        // Create transaction
        const { error: transError } = await supabase
          .from('transactions')
          .insert([{
            user_id: prediction.user_id,
            bet_id: betId,
            amount: 1.00,
            type: 'bet_refunded',
          }])

        if (transError) throw transError
      }

      setSuccess(`Bet cancelled. ${predictions.length} predictions refunded.`)
      fetchBets()
    } catch (err) {
      console.error('Error cancelling bet:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRefillRequest = async (requestId, userId, amount, approve) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (approve) {
        // Get current balance
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('balance')
          .eq('id', userId)
          .single()

        if (userError) throw userError

        const newBalance = parseFloat(userData.balance) + parseFloat(amount)

        // Update balance
        const { error: balanceError } = await supabase
          .from('users')
          .update({ balance: newBalance })
          .eq('id', userId)

        if (balanceError) throw balanceError

        // Create transaction
        const { error: transError } = await supabase
          .from('transactions')
          .insert([{
            user_id: userId,
            amount: parseFloat(amount),
            type: 'refill',
          }])

        if (transError) throw transError
      }

      // Update refill request
      const { error: updateError } = await supabase
        .from('refill_requests')
        .update({
          status: approve ? 'approved' : 'denied',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userProfile.id,
        })
        .eq('id', requestId)

      if (updateError) throw updateError

      setSuccess(`Refill request ${approve ? 'approved' : 'denied'}.`)
      fetchRefillRequests()
    } catch (err) {
      console.error('Error handling refill request:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAdmin = async (userId, currentAdminStatus, userEmail) => {
    const action = currentAdminStatus ? 'remove admin privileges from' : 'make an admin'
    if (!confirm(`Are you sure you want to ${action} ${userEmail}?`)) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_admin: !currentAdminStatus })
        .eq('id', userId)

      if (updateError) throw updateError

      setSuccess(`${userEmail} ${currentAdminStatus ? 'removed from' : 'promoted to'} admin.`)
      fetchUsers()
    } catch (err) {
      console.error('Error toggling admin status:', err)
      setError(err.message || 'Failed to update admin status.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-yellow-600">Admin Panel</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 rounded">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 rounded">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('resolve')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'resolve'
              ? 'border-b-2 border-yellow-600 text-yellow-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Resolve/Cancel Bets
        </button>
        <button
          onClick={() => setActiveTab('refills')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'refills'
              ? 'border-b-2 border-yellow-600 text-yellow-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Refill Requests ({refillRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'admins'
              ? 'border-b-2 border-yellow-600 text-yellow-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Manage Admins
        </button>
      </div>

      {/* Resolve/Cancel Bets Tab */}
      {activeTab === 'resolve' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Bets to Resolve</h3>
          {bets.length === 0 ? (
            <p className="text-gray-500">No bets to resolve.</p>
          ) : (
            <div className="space-y-4">
              {bets.map(bet => (
                <div key={bet.id} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">{bet.question}</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Created by {bet.created_by_user?.email || 'Unknown'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleResolveBet(bet.id, 'yes')}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-400 transition"
                    >
                      Resolve as YES
                    </button>
                    <button
                      onClick={() => handleResolveBet(bet.id, 'no')}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-400 transition"
                    >
                      Resolve as NO
                    </button>
                    <button
                      onClick={() => handleCancelBet(bet.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 transition"
                    >
                      Cancel & Refund
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Refill Requests Tab */}
      {activeTab === 'refills' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Pending Refill Requests</h3>
          {refillRequests.length === 0 ? (
            <p className="text-gray-500">No pending refill requests.</p>
          ) : (
            <div className="space-y-4">
              {refillRequests.map(request => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="mb-3">
                    <p className="font-semibold">{request.user?.email}</p>
                    <p className="text-sm text-gray-600">
                      Current balance: ${request.user?.balance?.toFixed(2)}
                    </p>
                    <p className="text-lg font-bold text-indigo-600">
                      Requesting: ${parseFloat(request.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Requested: {new Date(request.requested_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRefillRequest(request.id, request.user_id, request.amount, true)}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-400 transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRefillRequest(request.id, request.user_id, request.amount, false)}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-400 transition"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manage Admins Tab */}
      {activeTab === 'admins' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">User Management</h3>
          <p className="text-sm text-gray-600 mb-4">
            Promote or demote users to/from admin status. Admins can resolve bets, approve refills, and manage other admins.
          </p>
          {users.length === 0 ? (
            <p className="text-gray-500">No users found.</p>
          ) : (
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold">{user.email}</p>
                      {user.is_admin && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Balance: ${user.balance?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleAdmin(user.id, user.is_admin, user.email)}
                    disabled={loading || user.id === userProfile.id}
                    className={`px-4 py-2 rounded font-medium transition ${
                      user.is_admin
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={user.id === userProfile.id ? 'You cannot change your own admin status' : ''}
                  >
                    {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
