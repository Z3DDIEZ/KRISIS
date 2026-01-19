import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { formatDateForDisplay } from '../lib/dateUtils'

interface Application {
  id: string
  company: string
  role: string
  status: string
  dateApplied: string
  notes?: string
  resumeUrl?: string
}

interface DashboardStats {
  totalApplications: number
  interviews: number
  aiAnalyses: number
  successRate: number
}

function Dashboard() {
  const [user, loading] = useAuthState(auth)
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    interviews: 0,
    aiAnalyses: 0,
    successRate: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    // Fetch recent applications (limit to 5 for dashboard)
    const q = query(
      collection(db, `users/${user.uid}/applications`),
      orderBy('dateApplied', 'desc'),
      limit(5)
    )

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const apps: Application[] = []
      let totalApps = 0
      let interviews = 0
      let offers = 0

      querySnapshot.forEach((doc) => {
        const app = { id: doc.id, ...doc.data() } as Application
        apps.push(app)
        totalApps++

        // Count interviews (Phone Screen, Technical Interview, Final Round)
        if (['Phone Screen', 'Technical Interview', 'Final Round'].includes(app.status)) {
          interviews++
        }

        // Count offers
        if (app.status === 'Offer') {
          offers++
        }
      })

      // Calculate success rate (offers / total applications)
      const successRate = totalApps > 0 ? Math.round((offers / totalApps) * 100) : 0

      setApplications(apps)
      setStats({
        totalApplications: totalApps,
        interviews,
        aiAnalyses: 0, // Will be updated when AI analysis is implemented
        successRate
      })
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please sign in to view your dashboard.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to KRISIS - Your job application intelligence platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Stats Cards */}
        <Link to="/applications" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">📋</span>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Applications</dt>
              <dd className="text-lg font-medium text-gray-900">{stats.totalApplications}</dd>
            </div>
          </div>
        </Link>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 truncate">Interviews</dt>
              <dd className="text-lg font-medium text-gray-900">{stats.interviews}</dd>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">🤖</span>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 truncate">AI Analyses</dt>
              <dd className="text-lg font-medium text-gray-900">{stats.aiAnalyses}</dd>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">📈</span>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
              <dd className="text-lg font-medium text-gray-900">{stats.successRate}%</dd>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Recent Applications</h3>
            <Link
              to="/applications/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Add Application
            </Link>
          </div>
        </div>
        <div className="p-6">
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <span className="text-4xl">📋</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-500 mb-6">Get started by adding your first job application.</p>
              <Link
                to="/applications/new"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-block"
              >
                Add Your First Application
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <div key={application.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {application.company.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {application.company} - {application.role}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Applied {formatDateForDisplay(application.dateApplied)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      application.status === 'Applied' ? 'bg-gray-100 text-gray-800' :
                      application.status === 'Phone Screen' ? 'bg-blue-100 text-blue-800' :
                      application.status === 'Technical Interview' ? 'bg-yellow-100 text-yellow-800' :
                      application.status === 'Final Round' ? 'bg-purple-100 text-purple-800' :
                      application.status === 'Offer' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {application.status}
                    </span>
                    <Link
                      to={`/applications/${application.id}`}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
              {applications.length >= 5 && (
                <div className="text-center pt-4">
                  <Link
                    to="/applications"
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    View all applications →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard