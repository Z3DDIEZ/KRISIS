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
import { useSearch } from '../context/SearchContext'

interface Application {
  id: string
  company: string
  role: string
  status: string
  dateApplied: string
  notes?: string
  resumeUrl?: string
  visaSponsorship: boolean
  createdAt?: unknown
  updatedAt?: unknown
}

type ViewMode = 'cards' | 'table' | 'list'
type SortField = 'dateApplied' | 'company' | 'status' | 'role'
type SortOrder = 'asc' | 'desc'

function Applications() {
  const [user, loading] = useAuthState(auth)
  const { searchQuery, setSearchQuery } = useSearch()
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
      toast.error(`Failed to load applications`)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const filteredApplications = useMemo(() => {
    const filtered = applications.filter(app => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = app.company.toLowerCase().includes(query) ||
          app.role.toLowerCase().includes(query) ||
          (app.notes && app.notes.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }
      if (statusFilter !== 'all' && app.status !== statusFilter) return false
      if (visaFilter === 'visa' && !app.visaSponsorship) return false
      if (visaFilter === 'no-visa' && app.visaSponsorship) return false
      return true
    })

    filtered.sort((a, b) => {
      let aVal: string | number | Date, bVal: string | number | Date
      switch (sortField) {
        case 'company': aVal = a.company.toLowerCase(); bVal = b.company.toLowerCase(); break
        case 'role': aVal = a.role.toLowerCase(); bVal = b.role.toLowerCase(); break
        case 'status': aVal = a.status; bVal = b.status; break
        case 'dateApplied':
        default: aVal = new Date(a.dateApplied); bVal = new Date(b.dateApplied); break
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [applications, searchQuery, statusFilter, visaFilter, sortField, sortOrder])

  const handleDelete = async (applicationId: string, company: string) => {
    if (!user || !confirm(`Are you sure you want to delete your application at ${company}?`)) return
    try {
      await deleteDoc(doc(db, `users/${user.uid}/applications/${applicationId}`))
      toast.success('Application deleted')
    } catch (error) {
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
      toast.error('Failed to update')
    }
  }

  const handleBulkDelete = async () => {
    if (!user || selectedApplications.size === 0 || !confirm(`Are you sure you want to delete ${selectedApplications.size} applications?`)) return
    try {
      const promises = Array.from(selectedApplications).map(appId =>
        deleteDoc(doc(db, `users/${user.uid}/applications/${appId}`))
      )
      await Promise.all(promises)
      toast.success(`Deleted ${selectedApplications.size} applications`)
      setSelectedApplications(new Set())
    } catch (error) {
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
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
    <div className="animate-fade-in flex flex-col gap-spacing-4">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 mb-spacing-4">
        <header className="page-header">
          <h1 className="text-4xl font-black text-primary tracking-tighter uppercase leading-none">Applications</h1>
          <p className="text-secondary font-medium tracking-tight">
            {filteredApplications.length} cases detected in your active pipeline.
          </p>
        </header>
        <div className="flex gap-4">
          <Link to="/analytics" className="btn btn-secondary">
            <Icon name="bar-chart" size={16} />
            Intelligence
          </Link>
          <Link to="/applications/new" className="btn btn-orange">
            <Icon name="add" size={16} />
            Initialize Record
          </Link>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="filter-bar">
        <div className="relative">
          <input
            type="text"
            placeholder="Search applications (Enter to scan)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                toast.success('Scanning complete')
              }
            }}
            className="filter-bar__search"
          />
          <Icon name="search" size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
        </div>

        <div className="filter-bar__controls">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black text-muted uppercase tracking-widest mr-2">Protocol:</span>
            {['Applied', 'Phone Screen', 'Technical Interview', 'Final Round', 'Offer', 'Rejected'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                className={`filter-button ${statusFilter === status ? 'filter-button--active' : ''}`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-border mx-2 hidden lg:block" />

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-muted uppercase tracking-widest mr-2">Residency:</span>
            <button
              onClick={() => setVisaFilter(visaFilter === 'visa' ? 'all' : 'visa')}
              className={`filter-button ${visaFilter === 'visa' ? 'filter-button--active' : ''}`}
            >
              Visa Required
            </button>
            <button
              onClick={() => setVisaFilter(visaFilter === 'no-visa' ? 'all' : 'no-visa')}
              className={`filter-button ${visaFilter === 'no-visa' ? 'filter-button--active' : ''}`}
            >
              Local
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-muted uppercase tracking-widest mr-2">Sort:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="filter-button bg-transparent outline-none"
            >
              <option value="dateApplied">Applied Date</option>
              <option value="company">Company</option>
              <option value="role">Position</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="filter-button"
              aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              <Icon name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={14} />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-4">
            {(searchQuery || statusFilter !== 'all' || visaFilter !== 'all') && (
              <button onClick={clearFilters} className="text-xs font-bold text-primary-500 uppercase tracking-tight hover:underline">
                Reset
              </button>
            )}
            <div className="filter-count">
              Showing {filteredApplications.length} of {applications.length} cases
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle & Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-muted uppercase tracking-widest">View Mode</span>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-md">
            {(['cards', 'table', 'list'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center justify-center w-8 h-8 rounded transition-all ${viewMode === mode ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-500' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <Icon name={mode === 'cards' ? 'grid' : mode === 'table' ? 'table' : 'list'} size={14} />
              </button>
            ))}
          </div>
        </div>

        {selectedApplications.size > 0 && (
          <div className="flex items-center gap-3 animate-fade-in">
            <span className="text-xs font-bold text-primary-500 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 rounded-full border border-primary-100 dark:border-primary-900/30">
              {selectedApplications.size} Selected
            </span>
            <select
              onChange={(e) => e.target.value && handleBulkStatusUpdate(e.target.value)}
              className="h-9 px-3 bg-white dark:bg-gray-800 border border-border rounded-md text-xs font-bold uppercase"
              defaultValue=""
            >
              <option value="">Update Status</option>
              {['Applied', 'Phone Screen', 'Technical Interview', 'Final Round', 'Offer', 'Rejected'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={handleBulkDelete}
              className="w-9 h-9 flex items-center justify-center text-error hover:bg-error/10 rounded-md transition-colors border border-border"
            >
              <Icon name="delete" size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Applications Display */}
      {applications.length === 0 ? (
        <div className="card py-32 text-center">
          <div className="bg-gray-100 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="work" size={40} className="text-muted" />
          </div>
          <h3 className="text-xl font-bold text-primary mb-2 uppercase">Build Your Pipeline</h3>
          <p className="text-secondary max-w-sm mx-auto mb-8">Start tracking your job applications to get AI-powered insights and stay organized.</p>
          <Link to="/applications/new" className="btn btn-orange px-8">
            Add Your First Application
          </Link>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="card py-24 text-center">
          <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="search" size={32} className="text-muted" />
          </div>
          <h3 className="text-lg font-bold text-primary mb-1 uppercase">No matches found</h3>
          <p className="text-secondary mb-6">Try adjusting your filters or search term.</p>
          <button onClick={clearFilters} className="btn btn-ghost text-primary-500 font-black text-[10px] uppercase tracking-widest">
            RESET PROTOCOLS
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApplications.map((application) => (
            <div key={application.id} className="card flex flex-col group hover:border-primary-500 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-900 text-white rounded flex items-center justify-center font-black text-xl">
                    {application.company.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-primary group-hover:text-primary-500 transition-colors uppercase text-sm">{application.company}</h4>
                    <p className="text-xs text-secondary font-medium">{application.role}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedApplications.has(application.id)}
                  onChange={() => toggleApplicationSelection(application.id)}
                  className="checkbox mt-1"
                />
              </div>

              <div className="flex items-center gap-2 mb-6">
                <div className={`badge ${application.status === 'Applied' ? 'badge-applied' :
                  application.status === 'Phone Screen' ? 'badge-phone-screen' :
                    application.status === 'Technical Interview' ? 'badge-technical' :
                      application.status === 'Final Round' ? 'badge-final' :
                        application.status === 'Offer' ? 'badge-offer' :
                          'badge-rejected'
                  }`}>
                  {application.status}
                </div>
                {application.visaSponsorship && (
                  <div className="badge border border-primary-500/20 text-primary-500 bg-primary-500/5">
                    <Icon name="check" size={10} /> Visa
                  </div>
                )}
              </div>

              <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                <span className="text-[10px] font-black text-muted uppercase tracking-widest">
                  Applied {formatDateForDisplay(application.dateApplied)}
                </span>
                <div className="flex gap-2">
                  <Link to={`/applications/${application.id}`} className="p-2 text-muted hover:text-primary transition-colors">
                    <Icon name="visibility" size={16} />
                  </Link>
                  <button onClick={() => handleDelete(application.id, application.company)} className="p-2 text-muted hover:text-error transition-colors">
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'table' ? (
        <div className="card overflow-hidden">
          <div className="table-container">
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
                  <th>Position</th>
                  <th>Status</th>
                  <th>Date Applied</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map(application => (
                  <tr key={application.id} className={selectedApplications.has(application.id) ? 'bg-primary-50 dark:bg-primary-900/10' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedApplications.has(application.id)}
                        onChange={() => toggleApplicationSelection(application.id)}
                        className="checkbox"
                      />
                    </td>
                    <td>
                      <div className="table__company">
                        <div className="table__logo">
                          {application.company.charAt(0).toUpperCase()}
                        </div>
                        <span className="table__company-name">{application.company}</span>
                      </div>
                    </td>
                    <td className="table__role">{application.role}</td>
                    <td>
                      <span className={`badge ${application.status === 'Applied' ? 'badge-applied' :
                        application.status === 'Phone Screen' ? 'badge-phone-screen' :
                          application.status === 'Technical Interview' ? 'badge-technical' :
                            application.status === 'Final Round' ? 'badge-final' :
                              application.status === 'Offer' ? 'badge-offer' :
                                'badge-rejected'
                        }`}>
                        {application.status}
                      </span>
                    </td>
                    <td className="table__date">{formatDateForDisplay(application.dateApplied)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/applications/${application.id}`} className="p-2 text-muted hover:text-primary transition-colors">
                          <Icon name="visibility" size={16} />
                        </Link>
                        <button onClick={() => handleDelete(application.id, application.company)} className="p-2 text-error hover:bg-error/10 rounded transition-colors">
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
        <div className="flex flex-col gap-3">
          {filteredApplications.map(application => (
            <div key={application.id} className={`card flex items-center p-4 gap-4 hover:shadow-md transition-all ${selectedApplications.has(application.id) ? 'border-primary-500' : ''}`}>
              <input
                type="checkbox"
                checked={selectedApplications.has(application.id)}
                onChange={() => toggleApplicationSelection(application.id)}
                className="checkbox"
              />
              <div className="w-10 h-10 rounded bg-gray-900 text-white flex items-center justify-center font-black">
                {application.company.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-primary truncate uppercase text-sm">{application.company}</h4>
                <p className="text-xs text-secondary truncate">{application.role}</p>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span className={`badge ${application.status === 'Applied' ? 'badge-applied' :
                  application.status === 'Phone Screen' ? 'badge-phone-screen' :
                    application.status === 'Technical Interview' ? 'badge-technical' :
                      application.status === 'Final Round' ? 'badge-final' :
                        application.status === 'Offer' ? 'badge-offer' :
                          'badge-rejected'
                  }`}>
                  {application.status}
                </span>
              </div>
              <div className="text-right ml-auto hidden sm:block">
                <p className="text-[10px] font-black text-muted uppercase tracking-widest">{formatDateForDisplay(application.dateApplied)}</p>
              </div>
              <div className="flex gap-1 ml-4">
                <Link to={`/applications/${application.id}`} className="p-2 text-muted hover:text-primary transition-colors">
                  <Icon name="visibility" size={16} />
                </Link>
                <button onClick={() => handleDelete(application.id, application.company)} className="p-2 text-muted hover:text-error transition-colors">
                  <Icon name="delete" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Applications