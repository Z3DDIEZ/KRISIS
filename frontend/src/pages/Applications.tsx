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
import { useSearch } from '../layouts/MainLayout'

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
  const { searchQuery, setSearchQuery } = useSearch() // Use global search context
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
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
      toast.error(`Failed to load applications`)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  // Filter and sort applications
  const filteredApplications = useMemo(() => {
    let filtered = applications.filter(app => {
      // Search filter using global query
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
      toast.success('Application deleted')
    } catch (error) {
      console.error('Error deleting application:', error)
      toast.error('Failed to delete')
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
      toast.success(`Updated ${selectedApplications.size} applications`)
      setSelectedApplications(new Set())
    } catch (error) {
      console.error('Error updating applications:', error)
      toast.error('Failed to update')
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
      toast.error('Failed to delete')
    }
  }

  const toggleApplicationSelection = (appId: string) => {
    setSelectedApplications(prev => {
      const next = new Set(prev)
      if (next.has(appId)) next.delete(appId)
      else next.add(appId)
      return next
    })
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
          <Link to="/analytics" className="btn btn-ghost" data-track-action="go-to-analytics">
            <Icon name="trending-up" size={16} />
            Analytics
          </Link>
          <Link to="/applications/new" className="btn btn-orange" data-track-action="add-application">
            <Icon name="add" size={16} />
            Add Application
          </Link>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="layout__section layout__section--filters card mb-xl" data-section="filters">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
            {/* Search (Local Overrides Global if needed, but synced) */}
            <div className="form-group">
              <label className="form-label">Search</label>
              <div className="search-input-wrapper">
                <Icon name="search" size={14} className="search-input-icon" />
                <input
                  type="text"
                  placeholder="Filter by company, role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input"
                  data-track-filter="search"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="form-group">
              <label className="form-label">Status</label>
              <div className="select-wrapper">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input"
                  data-track-filter="status"
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
            </div>

            {/* Visa Filter */}
            <div className="form-group">
              <label className="form-label">Visa Sponsorship</label>
              <div className="select-wrapper">
                <select
                  value={visaFilter}
                  onChange={(e) => setVisaFilter(e.target.value as any)}
                  className="input"
                  data-track-filter="visa"
                >
                  <option value="all">All Applications</option>
                  <option value="visa">Visa Only</option>
                  <option value="no-visa">No Visa</option>
                </select>
              </div>
            </div>

            {/* Sort */}
            <div className="form-group">
              <label className="form-label">Sort By</label>
              <div className="flex gap-sm">
                <div className="select-wrapper flex-1">
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className="input"
                  >
                    <option value="dateApplied">Date Applied</option>
                    <option value="company">Company</option>
                    <option value="role">Role</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="btn btn-ghost px-sm bg-surface-2 hover:bg-surface-3"
                  aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                >
                  <Icon name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* View Mode Toggle & Bulk Actions */}
          <div className="flex flex-wrap items-center justify-between gap-md border-t border-border-light pt-lg">
            <div className="flex items-center gap-sm">
              <span className="text-secondary text-xs font-bold uppercase tracking-wider">Layout:</span>
              <div className="flex bg-surface-2 rounded-lg p-0.5 border border-border-light">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-background-white shadow-sm text-primary-orange' : 'text-secondary hover:text-primary'}`}
                >
                  <Icon name="grid" size={16} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-background-white shadow-sm text-primary-orange' : 'text-secondary hover:text-primary'}`}
                >
                  <Icon name="table" size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-background-white shadow-sm text-primary-orange' : 'text-secondary hover:text-primary'}`}
                >
                  <Icon name="list" size={16} />
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center gap-sm">
              {selectedApplications.size > 0 && (
                <>
                  <span className="text-primary-orange text-xs font-bold bg-primary-orange-bg px-2 py-1 rounded-full border border-primary-orange/20">
                    {selectedApplications.size} Selected
                  </span>
                  <div className="select-wrapper">
                    <select
                      onChange={(e) => e.target.value && handleBulkStatusUpdate(e.target.value)}
                      className="input text-xs py-1 h-9 min-w-[140px]"
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
                  </div>
                  <button
                    onClick={handleBulkDelete}
                    className="btn btn-ghost h-9 px-3 text-red-500 hover:bg-red-50"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </>
              )}

              {(searchQuery || statusFilter !== 'all' || visaFilter !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="btn btn-ghost h-9 px-3 text-secondary text-xs uppercase font-bold tracking-tight"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Applications Display */}
      {applications.length === 0 ? (
        <div className="card py-32 text-center">
          <div className="bg-surface-2 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="work" size={40} className="text-muted" />
          </div>
          <h3 className="text-xl font-bold text-primary mb-2">Build Your Pipeline</h3>
          <p className="text-secondary max-w-sm mx-auto mb-8">Start tracking your job applications to get AI-powered insights and stay organized.</p>
          <Link to="/applications/new" className="btn btn-orange px-8">
            Add Your First Application
          </Link>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="card py-24 text-center">
          <div className="bg-surface-2 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="search" size={32} className="text-muted" />
          </div>
          <h3 className="text-lg font-bold text-primary mb-1">No matches found</h3>
          <p className="text-secondary mb-6">Try adjusting your filters or search term.</p>
          <button
            onClick={clearFilters}
            className="btn btn-ghost text-primary-orange font-bold text-xs"
          >
            RESET FILTERS
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid--cards">
          {filteredApplications.map((application, index) => (
            <div
              key={application.id}
              className={`application-card bg-surface-1 border border-border-light hover:shadow-xl transition-all animate-fade-in-scale stagger-${(index % 5) + 1}`}
            >
              <div className="application-card-header mb-4">
                <div className="company-info flex-1">
                  <div className="flex items-start justify-between">
                    <div className="company-logo bg-primary-orange-bg border border-primary-orange/10 mr-3">
                      <span className="text-primary-orange font-bold text-xl">
                        {application.company.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <label className="checkbox-group">
                      <input
                        type="checkbox"
                        checked={selectedApplications.has(application.id)}
                        onChange={() => toggleApplicationSelection(application.id)}
                        className="checkbox"
                      />
                    </label>
                  </div>
                  <div className="mt-3">
                    <h4 className="company-name font-bold text-primary group-hover:text-primary-orange transition-colors">
                      {application.company}
                    </h4>
                    <p className="position-title text-sm text-secondary font-medium mt-0.5">
                      {application.role}
                    </p>
                  </div>
                </div>
              </div>

              <div className="application-meta mb-4">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted uppercase tracking-tighter">
                  <Icon name="calendar" size={12} />
                  Applied {formatDateForDisplay(application.dateApplied)}
                </div>
              </div>

              <div className="application-card-footer">
                <div className="flex items-center gap-sm">
                  <div className={`badge hover-scale ${application.status === 'Applied' ? 'badge-applied' :
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
                    data-track-action="view-application"
                    data-application-id={application.id}
                  >
                    <Icon name="visibility" size={14} />
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(application.id, application.company)}
                    className="btn btn-ghost btn-sm text-red-600 hover:text-red-700 btn-ripple"
                    data-track-action="delete-application"
                    data-application-id={application.id}
                  >
                    <Icon name="delete" size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'table' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selectedApplications.size === filteredApplications.length && filteredApplications.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedApplications(new Set(filteredApplications.map(a => a.id)))
                        else setSelectedApplications(new Set())
                      }}
                    />
                  </th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Date Applied</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map(application => (
                  <tr key={application.id} className={selectedApplications.has(application.id) ? 'bg-primary-orange-bg/30' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedApplications.has(application.id)}
                        onChange={() => toggleApplicationSelection(application.id)}
                        className="checkbox"
                      />
                    </td>
                    <td className="font-bold text-primary">{application.company}</td>
                    <td className="text-secondary">{application.role}</td>
                    <td>
                      <span className={`badge badge--${application.status.toLowerCase().replace(' ', '-')}`}>
                        {application.status}
                      </span>
                    </td>
                    <td className="text-muted text-xs">{formatDateForDisplay(application.dateApplied)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button className="btn btn--ghost btn--sm p-1" title="Edit">
                          <Icon name="edit" size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(application.id, application.company)}
                          className="btn btn--ghost btn--sm p-1 text-red-500"
                          title="Delete"
                        >
                          <Icon name="delete" size={14} />
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
        /* List View - Modernist Stack */
        <div className="flex flex-col gap-3">
          {filteredApplications.map(application => (
            <div
              key={application.id}
              className={`card flex items-center p-3 gap-4 hover:shadow-md transition-all ${selectedApplications.has(application.id) ? 'border-primary-orange ring-1 ring-primary-orange' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedApplications.has(application.id)}
                onChange={() => toggleApplicationSelection(application.id)}
                className="checkbox"
              />
              <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center font-bold text-primary-orange">
                {application.company.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-primary truncate">{application.company}</h4>
                <p className="text-xs text-secondary truncate">{application.role}</p>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span className={`badge badge--${application.status.toLowerCase().replace(' ', '-')}`}>
                  {application.status}
                </span>
                {application.visaSponsorship && (
                  <span className="text-primary-orange">
                    <Icon name="verified" size={14} />
                  </span>
                )}
              </div>
              <div className="text-right ml-auto">
                <p className="text-[10px] font-bold text-muted uppercase whitespace-nowrap">{formatDateForDisplay(application.dateApplied)}</p>
                <div className="flex justify-end gap-1 mt-1">
                  <button className="btn btn--ghost btn--sm p-1 h-auto" onClick={() => handleDelete(application.id, application.company)}>
                    <Icon name="delete" size={14} className="text-red-500" />
                  </button>
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