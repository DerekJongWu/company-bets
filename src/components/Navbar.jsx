import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const { userProfile, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="bg-indigo-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">Company Bets</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm">Balance:</span>
              <span className="font-bold text-lg">
                ${userProfile?.balance?.toFixed(2) || '0.00'}
              </span>
            </div>

            <div className="border-l border-indigo-400 h-6"></div>

            <span className="text-sm">{userProfile?.email}</span>

            {userProfile?.is_admin && (
              <span className="bg-yellow-500 text-xs px-2 py-1 rounded font-semibold">
                ADMIN
              </span>
            )}

            <button
              onClick={handleSignOut}
              className="bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded text-sm font-medium transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
