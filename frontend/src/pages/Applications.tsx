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

  const handleSelectAll = () => {
    if (selectedApplications.size === filteredApplications.length && filteredApplications.length > 0) {
      setSelectedApplications(new Set())
    } else {
      setSelectedApplications(new Set(filteredApplications.map(app => app.id)))
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Please sign in to view your applications.</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary-900 tracking-tight">APPLICATIONS</h1>
          <p className="text-gray-500 font-medium">
            {filteredApplications.length} active records found
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/applications/new" className="btn btn-primary bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/20">
            <Icon name="add" size={18} className="mr-2" />
            New Application
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm sticky top-4 z-10 backdrop-blur-xl bg-white/90 dark:bg-zinc-900/90 transition-colors">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search companies, roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 transition-all outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm font-medium focus:border-primary-500 text-gray-700 dark:text-gray-200 outline-none"
          >
            <option value="all">All Statuses</option>
            {['Applied', 'Phone Screen', 'Technical Interview', 'Final Round', 'Offer', 'Rejected'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button
            onClick={() => setVisaFilter(visaFilter === 'visa' ? 'all' : 'visa')}
            className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${visaFilter === 'visa'
              ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-400'
              : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
              }`}
          >
            Visa Only
          </button>

          <div className="h-6 w-px bg-gray-200 dark:bg-zinc-700 hidden lg:block" />

          {/* Sort */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm font-medium focus:border-primary-500 text-gray-700 dark:text-gray-200 outline-none"
          >
            <option value="dateApplied">App Date</option>
            <option value="company">Company</option>
            <option value="status">Status</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-gray-200 dark:border-zinc-700"
          >
            <Icon name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={18} />
          </button>
        </div>

        {/* Batch Actions & View Mode */}
        <div className="flex items-center gap-2 pl-4 border-l border-gray-200 dark:border-zinc-700 ml-auto">
          {/* View Mode */}
          <div className="flex bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-lg mr-2">
            {(['cards', 'table', 'list'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded-md transition-all ${viewMode === mode ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                <Icon name={mode === 'cards' ? 'grid' : mode === 'table' ? 'table' : 'list'} size={16} />
              </button>
            ))}
          </div>

          {selectedApplications.size > 0 && (
            <>
              <span className="text-sm font-bold text-primary-600 whitespace-nowrap hidden sm:block">
                {selectedApplications.size} Selected
              </span>
              <select
                onChange={(e) => e.target.value && handleBulkStatusUpdate(e.target.value)}
                className="h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none"
                defaultValue=""
              >
                <option value="">Status...</option>
                {['Applied', 'Phone Screen', 'Technical Interview', 'Final Round', 'Offer', 'Rejected'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={handleBulkDelete}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                title="Delete Selected"
              >
                <Icon name="delete" size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Global Select All */}
      <div className="flex items-center gap-2 px-2">
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-500 select-none">
          <input
            type="checkbox"
            checked={selectedApplications.size === filteredApplications.length && filteredApplications.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Select All Applications
        </label>
      </div>

      {/* Applications Display */}
      {applications.length === 0 ? (
        <div className="premium-card p-12 text-center">
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
        <div className="premium-card p-12 text-center">
          <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="search" size={32} className="text-muted" />
          </div>
          <h3 className="text-lg font-bold text-primary mb-1 uppercase">No matches found</h3>
          <p className="text-secondary mb-6">Try adjusting your filters or search term.</p>
          <button onClick={clearFilters} className="btn btn-ghost text-primary-500 font-bold text-xs uppercase tracking-widest">
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApplications.map((application) => (
            <div key={application.id} className="premium-card p-6 flex flex-col group hover:border-primary-500 hover:shadow-glow transition-all">
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
        <div className="premium-card overflow-hidden">
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
            <div key={application.id} className={`premium-card p-4 flex items-center gap-4 hover:shadow-md transition-all ${selectedApplications.has(application.id) ? 'border-primary-500' : ''}`}>
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