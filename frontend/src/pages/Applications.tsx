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
  updateDoc,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { formatDateForDisplay } from '../lib/dateUtils'
import { toast } from 'sonner'
import Icon from '../components/ui/Icon'
import { useSearch } from '../hooks/use-search'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

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
    if (loading) return
    if (!user) {
      return
    }

    const q = query(
      collection(db, `users/${user.uid}/applications`),
      orderBy('dateApplied', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
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
            updatedAt: data.updatedAt,
          })
        })
        setApplications(apps)
        setIsLoading(false)
      },
      (error) => {
        console.error('Error loading applications:', error)
        toast.error(`Failed to load applications`)
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user, loading])

  const filteredApplications = useMemo(() => {
    const filtered = applications.filter((app) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          app.company.toLowerCase().includes(query) ||
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
    if (!user || !confirm(`Are you sure you want to delete your application at ${company}?`)) return
    try {
      await deleteDoc(doc(db, `users/${user.uid}/applications/${applicationId}`))
      toast.success('Application deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (!user || selectedApplications.size === 0) return
    try {
      const promises = Array.from(selectedApplications).map((appId) =>
        updateDoc(doc(db, `users/${user.uid}/applications/${appId}`), {
          status: newStatus,
          updatedAt: new Date(),
        })
      )
      await Promise.all(promises)
      toast.success(`Updated ${selectedApplications.size} applications`)
      setSelectedApplications(new Set())
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleBulkDelete = async () => {
    if (
      !user ||
      selectedApplications.size === 0 ||
      !confirm(`Are you sure you want to delete ${selectedApplications.size} applications?`)
    )
      return
    try {
      const promises = Array.from(selectedApplications).map((appId) =>
        deleteDoc(doc(db, `users/${user.uid}/applications/${appId}`))
      )
      await Promise.all(promises)
      toast.success(`Deleted ${selectedApplications.size} applications`)
      setSelectedApplications(new Set())
    } catch {
      toast.error('Failed to delete')
    }
  }

  const toggleApplicationSelection = (appId: string) => {
    setSelectedApplications((prev) => {
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
    if (
      selectedApplications.size === filteredApplications.length &&
      filteredApplications.length > 0
    ) {
      setSelectedApplications(new Set())
    } else {
      setSelectedApplications(new Set(filteredApplications.map((app) => app.id)))
    }
  }

  const getBadgeVariant = (status: string) => {
    if (status === 'Applied') return 'applied'
    if (status.includes('Phone')) return 'phone-screen'
    if (status.includes('Technical')) return 'technical'
    if (status.includes('Final')) return 'final'
    if (status === 'Offer') return 'offer'
    return 'rejected'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500 dark:text-zinc-400">
          Please sign in to view your applications.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
            APPLICATIONS
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">
            {filteredApplications.length} active records found
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/applications/new">
            <Button variant="primary" className="shadow-lg shadow-primary-500/20">
              <Icon name="add" size={18} className="mr-2" />
              New Application
            </Button>
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-4 z-10 backdrop-blur-xl bg-white/90 dark:bg-zinc-900/90 transition-colors">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Icon
            name="search"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
          />
          <input
            type="text"
            placeholder="Search companies, roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-500 transition-all outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium focus:border-primary-500 text-zinc-700 dark:text-zinc-200 outline-none"
          >
            <option value="all">All Statuses</option>
            {[
              'Applied',
              'Phone Screen',
              'Technical Interview',
              'Final Round',
              'Offer',
              'Rejected',
            ].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            onClick={() => setVisaFilter(visaFilter === 'visa' ? 'all' : 'visa')}
            className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              visaFilter === 'visa'
                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-400'
                : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            Visa Only
          </button>

          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 hidden lg:block" />

          {/* Sort */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium focus:border-primary-500 text-zinc-700 dark:text-zinc-200 outline-none"
          >
            <option value="dateApplied">App Date</option>
            <option value="company">Company</option>
            <option value="status">Status</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700"
          >
            <Icon name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={18} />
          </button>
        </div>

        {/* Batch Actions & View Mode */}
        <div className="flex items-center gap-2 pl-4 border-l border-zinc-200 dark:border-zinc-700 ml-auto">
          {/* View Mode */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg mr-2">
            {(['cards', 'table', 'list'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded-md transition-all ${viewMode === mode ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
              >
                <Icon
                  name={mode === 'cards' ? 'grid' : mode === 'table' ? 'table' : 'list'}
                  size={16}
                />
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
                className="h-9 px-3 bg-white border border-zinc-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none"
                defaultValue=""
              >
                <option value="">Status...</option>
                {[
                  'Applied',
                  'Phone Screen',
                  'Technical Interview',
                  'Final Round',
                  'Offer',
                  'Rejected',
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
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
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-zinc-500 select-none">
          <input
            type="checkbox"
            checked={
              selectedApplications.size === filteredApplications.length &&
              filteredApplications.length > 0
            }
            onChange={handleSelectAll}
            className="w-4 h-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
          />
          Select All Applications
        </label>
      </div>

      {/* Applications Display */}
      {applications.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="bg-zinc-100 dark:bg-zinc-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="work" size={40} className="text-zinc-400" />
          </div>
          <h3 className="text-xl font-bold text-primary-600 mb-2 uppercase">Build Your Pipeline</h3>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-8">
            Start tracking your job applications to get AI-powered insights and stay organized.
          </p>
          <Link to="/applications/new">
            <Button variant="primary" size="lg">
              Add Your First Application
            </Button>
          </Link>
        </Card>
      ) : filteredApplications.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="bg-zinc-100 dark:bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="search" size={32} className="text-zinc-400" />
          </div>
          <h3 className="text-lg font-bold text-primary-600 mb-1 uppercase">No matches found</h3>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">
            Try adjusting your filters or search term.
          </p>
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="text-xs uppercase tracking-widest"
          >
            Reset Filters
          </Button>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApplications.map((application) => (
            <Card
              key={application.id}
              className={`p-6 flex flex-col group ${selectedApplications.has(application.id) ? 'ring-2 ring-primary-500' : ''}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-900 text-white rounded flex items-center justify-center font-black text-xl">
                    {application.company.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-white group-hover:text-primary-600 transition-colors uppercase text-sm">
                      {application.company}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      {application.role}
                    </p>
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
                <Badge variant={getBadgeVariant(application.status)}>{application.status}</Badge>
                {application.visaSponsorship && (
                  <Badge variant="information" className="gap-1">
                    <Icon name="check" size={10} /> Visa
                  </Badge>
                )}
              </div>

              <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Applied {formatDateForDisplay(application.dateApplied)}
                </span>
                <div className="flex gap-2">
                  <Link
                    to={`/applications/${application.id}`}
                    className="p-2 text-zinc-400 hover:text-primary-600 transition-colors"
                  >
                    <Icon name="visibility" size={16} />
                  </Link>
                  <button
                    onClick={() => handleDelete(application.id, application.company)}
                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : viewMode === 'table' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-3 w-10">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={
                        selectedApplications.size === filteredApplications.length &&
                        filteredApplications.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked)
                          setSelectedApplications(new Set(filteredApplications.map((a) => a.id)))
                        else setSelectedApplications(new Set())
                      }}
                    />
                  </th>
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3">Position</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date Applied</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredApplications.map((application) => (
                  <tr
                    key={application.id}
                    className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                      selectedApplications.has(application.id)
                        ? 'bg-primary-50 dark:bg-primary-900/10'
                        : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedApplications.has(application.id)}
                        onChange={() => toggleApplicationSelection(application.id)}
                        className="checkbox"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
                          {application.company.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-zinc-900 dark:text-white text-sm">
                          {application.company}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300">
                      {application.role}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getBadgeVariant(application.status)}>
                        {application.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {formatDateForDisplay(application.dateApplied)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/applications/${application.id}`}
                          className="p-2 text-zinc-400 hover:text-primary-600 transition-colors"
                        >
                          <Icon name="visibility" size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(application.id, application.company)}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded transition-colors"
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
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredApplications.map((application) => (
            <Card
              key={application.id}
              className={`p-4 flex items-center gap-4 hover:shadow-md transition-all ${selectedApplications.has(application.id) ? 'border-primary-500 ring-1 ring-primary-500' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedApplications.has(application.id)}
                onChange={() => toggleApplicationSelection(application.id)}
                className="checkbox"
              />
              <div className="w-10 h-10 rounded bg-zinc-900 text-white flex items-center justify-center font-black">
                {application.company.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-zinc-900 dark:text-white truncate uppercase text-sm group-hover:text-primary-600 transition-colors">
                  {application.company}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {application.role}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Badge variant={getBadgeVariant(application.status)}>{application.status}</Badge>
              </div>
              <div className="text-right ml-auto hidden sm:block">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  {formatDateForDisplay(application.dateApplied)}
                </p>
              </div>
              <div className="flex gap-1 ml-4">
                <Link
                  to={`/applications/${application.id}`}
                  className="p-2 text-zinc-400 hover:text-primary-600 transition-colors"
                >
                  <Icon name="visibility" size={16} />
                </Link>
                <button
                  onClick={() => handleDelete(application.id, application.company)}
                  className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default Applications
