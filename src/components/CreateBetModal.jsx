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

    // Parse datetime-local value correctly (it's in local time, no timezone)
    // datetime-local format: "YYYY-MM-DDTHH:mm"
    const closingTime = new Date(closesAt)
    
    // Check if date is valid
    if (isNaN(closingTime.getTime())) {
      setError('Invalid date. Please select a valid date and time.')
      return
    }
    
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
      
      // Ensure the date is valid and properly formatted
      const closesAtISO = closingTime.toISOString()
      
      console.log('Creating bet with user ID:', userId)
      console.log('Input datetime-local value:', closesAt)
      console.log('Parsed Date object:', closingTime)
      console.log('ISO string for database:', closesAtISO)
      console.log('Bet data:', {
        created_by: userId,
        question: question.trim(),
        closes_at: closesAtISO,
        status: 'open',
      })
      
      // Add timeout to prevent hanging
      const insertPromise = supabase
        .from('bets')
        .insert([{
          created_by: userId,
          question: question.trim(),
          closes_at: closesAtISO,
          status: 'open',
        }])
        .select()

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timed out. Please check your connection and try again.'))
        }, 30000) // 30 second timeout
      })

      const { data, error: insertError } = await Promise.race([
        insertPromise,
        timeoutPromise
      ])

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
      
      // Close modal - ensure it's called even if there are errors
      console.log('Closing modal...')
      if (typeof onClose === 'function') {
        onClose()
      } else {
        console.warn('onClose is not a function:', onClose)
      }
      console.log('Modal close called')
    } catch (err) {
      console.error('Error creating bet:', err)
      const errorMessage = err.message || err.toString() || 'Failed to create bet. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Get current datetime in local timezone for min attribute
  // datetime-local inputs expect local time, so we need to format the current time in local timezone
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`

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
