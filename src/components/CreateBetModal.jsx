import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export default function CreateBetModal({ onClose }) {
  const { user, userProfile } = useAuthStore()
  const [question, setQuestion] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!user || !userProfile) {
      setError('You must be logged in to create a bet')
      return
    }

    if (!question.trim()) {
      setError('Question is required')
      return
    }

    if (!closesAt) {
      setError('Closing time is required')
      return
    }

    const closingTime = new Date(closesAt)
    if (closingTime <= new Date()) {
      setError('Closing time must be in the future')
      return
    }

    setLoading(true)

    try {
      // Use auth.uid() directly to ensure it matches RLS policy check
      const userId = user?.id || userProfile?.id
      
      if (!userId) {
        throw new Error('User ID not found. Please sign in again.')
      }
      
      console.log('Creating bet with user ID:', userId)
      console.log('Bet data:', {
        created_by: userId,
        question: question.trim(),
        closes_at: closingTime.toISOString(),
        status: 'open',
      })
      
      const { data, error: insertError } = await supabase
        .from('bets')
        .insert([{
          created_by: userId,
          question: question.trim(),
          closes_at: closingTime.toISOString(),
          status: 'open',
        }])
        .select()

      if (insertError) {
        console.error('Insert error details:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        })
        
        // Provide more helpful error messages
        if (insertError.code === '42501') {
          throw new Error('Permission denied. You may not have permission to create bets.')
        } else if (insertError.code === '23503') {
          throw new Error('Invalid user. Please sign in again.')
        } else if (insertError.code === '23505') {
          throw new Error('This bet already exists.')
        }
        
        throw insertError
      }

      if (!data || data.length === 0) {
        throw new Error('Bet was created but no data was returned.')
      }

      console.log('Bet created successfully:', data)
      
      // Small delay to ensure real-time subscription picks up the change
      await new Promise(resolve => setTimeout(resolve, 100))
      
      onClose()
    } catch (err) {
      console.error('Error creating bet:', err)
      const errorMessage = err.message || err.toString() || 'Failed to create bet. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Get current datetime in local timezone for min attribute
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  const minDateTime = now.toISOString().slice(0, 16)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Create New Bet</h2>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 rounded">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
              Question
            </label>
            <textarea
              id="question"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Will X happen by Y date?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="closesAt" className="block text-sm font-medium text-gray-700 mb-2">
              Closes At
            </label>
            <input
              type="datetime-local"
              id="closesAt"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              min={minDateTime}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Users can place predictions until this time
            </p>
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
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:bg-indigo-400"
            >
              {loading ? 'Creating...' : 'Create Bet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
