import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { formatDateForDisplay } from '../lib/dateUtils'
import { toast } from 'sonner'
import Icon from '../components/ui/Icon'

interface Application {
  id: string
  company: string
  role: string
  status: string
  dateApplied: string
  notes?: string
  resumeUrl?: string
  visaSponsorship: boolean
  createdAt?: any
  updatedAt?: any
}

type ViewMode = 'cards' | 'table' | 'list'
type SortField = 'dateApplied' | 'company' | 'status' | 'role'
type SortOrder = 'asc' | 'desc'

function Applications() {
  const [user, loading] = useAuthState(auth)
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [visaFilter, setVisaFilter] = useState<'all' | 'visa' | 'no-visa'>('all')
  const [sortField, setSortField] = useState<SortField>('dateApplied')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    const q = query(
      collection(db, `users/${user.uid}/applications`),
      orderBy('dateApplied', 'desc')
    )

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const apps: Application[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        apps.push({
          id: doc.id,
          company: data.company || '',
          role: data.role || '',
          dateApplied: data.dateApplied || '',
          status: data.status || 'Applied',
          visaSponsorship: Boolean(data.visaSponsorship),
          notes: data.notes,
          resumeUrl: data.resumeUrl,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        })
      })
      setApplications(apps)
      setIsLoading(false)
    }, (error) => {
      console.error('Error loading applications:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        userId: user.uid
      })
      toast.error(`Failed to load applications: ${error.message}`)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  // Filter and sort applications
  const filteredApplications = useMemo(() => {
    let filtered = applications.filter(app => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = app.company.toLowerCase().includes(query) ||
                             app.role.toLowerCase().includes(query) ||
                             (app.notes && app.notes.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== 'all' && app.status !== statusFilter) return false

      // Visa filter
      if (visaFilter === 'visa' && !app.visaSponsorship) return false
      if (visaFilter === 'no-visa' && app.visaSponsorship) return false

      return true
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortField) {
        case 'company':
          aVal = a.company.toLowerCase()
          bVal = b.company.toLowerCase()
          break
        case 'role':
          aVal = a.role.toLowerCase()
          bVal = b.role.toLowerCase()
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        case 'dateApplied':
        default:
          aVal = new Date(a.dateApplied)
          bVal = new Date(b.dateApplied)
          break
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [applications, searchQuery, statusFilter, visaFilter, sortField, sortOrder])

  const handleDelete = async (applicationId: string, company: string) => {
    if (!user) return

    if (!confirm(`Are you sure you want to delete your application at ${company}?`)) {
      return
    }

    try {
      await deleteDoc(doc(db, `users/${user.uid}/applications/${applicationId}`))
      toast.success('Application deleted successfully')
    } catch (error) {
      console.error('Error deleting application:', error)
      toast.error('Failed to delete application')
    }
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (!user || selectedApplications.size === 0) return

    try {
      const promises = Array.from(selectedApplications).map(appId =>
        updateDoc(doc(db, `users/${user.uid}/applications/${appId}`), {
          status: newStatus,
          updatedAt: new Date()
        })
      )

      await Promise.all(promises)
      toast.success(`Updated ${selectedApplications.size} applications to ${newStatus}`)
      setSelectedApplications(new Set())
    } catch (error) {
      console.error('Error updating applications:', error)
      toast.error('Failed to update applications')
    }
  }

  const handleBulkDelete = async () => {
    if (!user || selectedApplications.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedApplications.size} applications?`)) {
      return
    }

    try {
      const promises = Array.from(selectedApplications).map(appId =>
        deleteDoc(doc(db, `users/${user.uid}/applications/${appId}`))
      )

      await Promise.all(promises)
      toast.success(`Deleted ${selectedApplications.size} applications`)
      setSelectedApplications(new Set())
    } catch (error) {
      console.error('Error deleting applications:', error)
      toast.error('Failed to delete applications')
    }
  }

  const toggleApplicationSelection = (appId: string) => {
    const newSelected = new Set(selectedApplications)
    if (newSelected.has(appId)) {
      newSelected.delete(appId)
    } else {
      newSelected.add(appId)
    }
    setSelectedApplications(newSelected)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setVisaFilter('all')
    setSelectedApplications(new Set())
  }

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
        <p className="text-secondary">Please sign in to view your applications.</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-md mb-xl">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-sm">Applications</h1>
          <p className="text-secondary text-base">
            {filteredApplications.length} of {applications.length} applications
          </p>
        </div>
        <div className="flex gap-sm">
          <Link to="/analytics" className="btn btn-ghost">
            <Icon name="trending-up" size={16} />
            Analytics
          </Link>
          <Link to="/applications/new" className="btn btn-orange">
            <Icon name="add" size={16} />
            Add Application
          </Link>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="card mb-xl filters-container">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-md">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-sm">Search</label>
              <input
                type="text"
                placeholder="Company, role, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-sm">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Statuses</option>
                <option value="Applied">Applied</option>
                <option value="Phone Screen">Phone Screen</option>
                <option value="Technical Interview">Technical Interview</option>
                <option value="Final Round">Final Round</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* Visa Sponsorship Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-sm">Visa Sponsorship</label>
              <select
                value={visaFilter}
                onChange={(e) => setVisaFilter(e.target.value as any)}
                className="input"
              >
                <option value="all">All Applications</option>
                <option value="visa">Visa Sponsors Only</option>
                <option value="no-visa">No Visa Sponsors</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-sm">Sort By</label>
              <div className="flex gap-sm">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="input flex-1"
                >
                  <option value="dateApplied">Date Applied</option>
                  <option value="company">Company</option>
                  <option value="role">Role</option>
                  <option value="status">Status</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="btn btn-ghost px-sm"
                >
                  <Icon name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-md">
            <div className="flex items-center gap-sm">
              <span className="text-secondary text-sm font-medium">View:</span>
              <div className="flex bg-background-light rounded-lg p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`btn btn-ghost btn-sm ${viewMode === 'cards' ? 'active' : ''}`}
                >
                  <Icon name="grid" size={16} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`btn btn-ghost btn-sm ${viewMode === 'table' ? 'active' : ''}`}
                >
                  <Icon name="table" size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`btn btn-ghost btn-sm ${viewMode === 'list' ? 'active' : ''}`}
                >
                  <Icon name="list" size={16} />
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedApplications.size > 0 && (
              <div className="flex items-center gap-sm">
                <span className="text-secondary text-sm">
                  {selectedApplications.size} selected
                </span>
                <select
                  onChange={(e) => e.target.value && handleBulkStatusUpdate(e.target.value)}
                  className="input text-sm py-xs"
                  defaultValue=""
                >
                  <option value="">Update Status</option>
                  <option value="Applied">Applied</option>
                  <option value="Phone Screen">Phone Screen</option>
                  <option value="Technical Interview">Technical Interview</option>
                  <option value="Final Round">Final Round</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <button
                  onClick={handleBulkDelete}
                  className="btn btn-red btn-sm"
                >
                  <Icon name="delete" size={16} />
                  Delete
                </button>
              </div>
            )}

            {(searchQuery || statusFilter !== 'all' || visaFilter !== 'all') && (
              <button
                onClick={clearFilters}
                className="btn btn-ghost btn-sm"
              >
                <Icon name="clear" size={16} />
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Applications Display */}
      {applications.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-icon">
                <Icon name="work" size={48} />
              </div>
              <h3 className="empty-title">No applications yet</h3>
              <p className="empty-description">Start tracking your job applications to get AI-powered insights.</p>
              <Link to="/applications/new" className="btn btn-orange">
                Add Your First Application
              </Link>
            </div>
          </div>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-icon">
                <Icon name="search" size={48} />
              </div>
              <h3 className="empty-title">No applications match your filters</h3>
              <p className="empty-description">Try adjusting your search or filter criteria.</p>
              <button
                onClick={clearFilters}
                className="btn btn-ghost"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="card-grid">
          {filteredApplications.map((application, index) => (
            <div
              key={application.id}
              className={`application-card hover-lift animate-fade-in-scale stagger-${(index % 5) + 1}`}
            >
              <div className="application-card-header">
                <input
                  type="checkbox"
                  checked={selectedApplications.has(application.id)}
                  onChange={() => toggleApplicationSelection(application.id)}
                  className="checkbox absolute top-sm right-sm focus-visible"
                />
                <div className="company-logo bg-gradient-to-br from-primary-orange-bg to-primary-orange/20 hover-scale">
                  <span className="text-primary-orange font-semibold">
                    {application.company.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="company-info">
                  <div className="company-name font-medium text-primary">
                    {application.company} - {application.role}
                  </div>
                  <div className="position-title text-secondary">
                    Applied {formatDateForDisplay(application.dateApplied)}
                  </div>
                </div>
              </div>

              <div className="application-card-footer">
                <div className="flex items-center gap-sm">
                  <div className={`badge hover-scale ${
                    application.status === 'Applied' ? 'badge-applied' :
                    application.status === 'Phone Screen' ? 'badge-phone-screen' :
                    application.status === 'Technical Interview' ? 'badge-technical' :
                    application.status === 'Final Round' ? 'badge-final' :
                    application.status === 'Offer' ? 'badge-offer badge-pulse' :
                    'badge-rejected'
                  }`}>
                    {application.status}
                  </div>
                  {application.visaSponsorship && (
                    <div className="badge badge-visa hover-scale">
                      <Icon name="check" size={12} />
                      Visa
                    </div>
                  )}
                </div>
                <div className="flex gap-sm">
                  <Link
                    to={`/applications/${application.id}`}
                    className="btn btn-ghost btn-sm btn-ripple"
                  >
                    <Icon name="visibility" size={14} />
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(application.id, application.company)}
                    className="btn btn-ghost btn-sm text-red-600 hover:text-red-700 btn-ripple"
                  >
                    <Icon name="delete" size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'table' ? (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border-light">
                <tr>
                  <th className="text-left p-md">
                    <input
                      type="checkbox"
                      checked={selectedApplications.size === filteredApplications.length}
                      onChange={() => {
                        if (selectedApplications.size === filteredApplications.length) {
                          setSelectedApplications(new Set())
                        } else {
                          setSelectedApplications(new Set(filteredApplications.map(app => app.id)))
                        }
                      }}
                      className="checkbox"
                    />
                  </th>
                  <th className="text-left p-md text-secondary font-medium">Company</th>
                  <th className="text-left p-md text-secondary font-medium">Role</th>
                  <th className="text-left p-md text-secondary font-medium">Status</th>
                  <th className="text-left p-md text-secondary font-medium">Date Applied</th>
                  <th className="text-left p-md text-secondary font-medium">Visa</th>
                  <th className="text-left p-md text-secondary font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((application) => (
                  <tr key={application.id} className="border-b border-border-light hover:bg-background-light">
                    <td className="p-md">
                      <input
                        type="checkbox"
                        checked={selectedApplications.has(application.id)}
                        onChange={() => toggleApplicationSelection(application.id)}
                        className="checkbox"
                      />
                    </td>
                    <td className="p-md font-medium">{application.company}</td>
                    <td className="p-md">{application.role}</td>
                    <td className="p-md">
                      <div className={`badge ${
                        application.status === 'Applied' ? 'badge-applied' :
                        application.status === 'Phone Screen' ? 'badge-phone-screen' :
                        application.status === 'Technical Interview' ? 'badge-technical' :
                        application.status === 'Final Round' ? 'badge-final' :
                        application.status === 'Offer' ? 'badge-offer' :
                        'badge-rejected'
                      }`}>
                        {application.status}
                      </div>
                    </td>
                    <td className="p-md text-secondary">
                      {formatDateForDisplay(application.dateApplied)}
                    </td>
                    <td className="p-md">
                      {application.visaSponsorship ? (
                        <Icon name="check" size={16} className="text-green-600" />
                      ) : (
                        <Icon name="close" size={16} className="text-red-600" />
                      )}
                    </td>
                    <td className="p-md">
                      <div className="flex gap-sm">
                        <Link
                          to={`/applications/${application.id}`}
                          className="btn btn-ghost btn-sm"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleDelete(application.id, application.company)}
                          className="btn btn-ghost btn-sm text-red-600 hover:text-red-700"
                        >
                          <Icon name="delete" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // List view
        <div className="space-y-sm">
          {filteredApplications.map((application) => (
            <div key={application.id} className="card hover-lift">
              <div className="card-body">
                <div className="flex items-center gap-md">
                  <input
                    type="checkbox"
                    checked={selectedApplications.has(application.id)}
                    onChange={() => toggleApplicationSelection(application.id)}
                    className="checkbox"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-md mb-sm">
                      <div className="company-logo bg-primary-orange-bg">
                        <span className="text-primary-orange font-semibold">
                          {application.company.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-primary">
                          {application.company} - {application.role}
                        </div>
                        <div className="text-secondary text-sm">
                          Applied {formatDateForDisplay(application.dateApplied)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-md">
                      <div className={`badge ${
                        application.status === 'Applied' ? 'badge-applied' :
                        application.status === 'Phone Screen' ? 'badge-phone-screen' :
                        application.status === 'Technical Interview' ? 'badge-technical' :
                        application.status === 'Final Round' ? 'badge-final' :
                        application.status === 'Offer' ? 'badge-offer' :
                        'badge-rejected'
                      }`}>
                        {application.status}
                      </div>
                      {application.visaSponsorship && (
                        <div className="badge badge-visa">
                          Visa Sponsor
                        </div>
                      )}
                      {application.notes && (
                        <div className="text-secondary text-sm max-w-md truncate">
                          {application.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-sm">
                    <Link
                      to={`/applications/${application.id}`}
                      className="btn btn-ghost btn-sm"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(application.id, application.company)}
                      className="btn btn-ghost btn-sm text-red-600 hover:text-red-700"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Applications