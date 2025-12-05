import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export default function RefillRequestModal({ onClose }) {
  const { userProfile } = useAuthStore()
  const [amount, setAmount] = useState('50')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setLoading(true)

    try {
      const { error: insertError } = await supabase
        .from('refill_requests')
        .insert([{
          user_id: userProfile.id,
          amount: amountNum,
          status: 'pending',
        }])

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      console.error('Error creating refill request:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Request Refill</h2>

        {success ? (
          <div className="p-4 bg-green-50 rounded mb-4">
            <p className="text-green-800 font-medium">
              Refill request submitted successfully! An admin will review it shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 rounded">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Current balance: <span className="font-bold">${userProfile?.balance?.toFixed(2)}</span>
              </p>

              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Refill Amount
              </label>
              <input
                type="number"
                id="amount"
                step="0.01"
                min="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAmount('50')}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
                >
                  $50
                </button>
                <button
                  type="button"
                  onClick={() => setAmount('100')}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
                >
                  $100
                </button>
                <button
                  type="button"
                  onClick={() => setAmount('200')}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
                >
                  $200
                </button>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:bg-green-400"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
