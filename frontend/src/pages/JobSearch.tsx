import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions, db, auth } from '../lib/firebase'
import { useAuthState } from 'react-firebase-hooks/auth'
import Icon from '../components/ui/Icon'
import { toast } from 'sonner'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

interface JobResult {
  job_id: string
  employer_name: string
  employer_logo?: string
  job_title: string
  job_description: string
  job_apply_link: string
  job_city?: string
  job_country?: string
  job_is_remote?: boolean
  job_posted_at_datetime_utc?: string
}

function JobSearch() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<JobResult[]>([])
  const [user] = useAuthState(auth)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setResults([])
    try {
      const searchFn = httpsCallable(functions, 'searchJobs')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = await searchFn({ query: query, num_pages: 1 })

      if (response.data && response.data.data) {
        setResults(response.data.data)
      } else {
        toast.info('No intel found for this sector.')
      }
    } catch (error: unknown) {
      console.error('Search Error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Search Protocol Failed: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveJob = async (job: JobResult) => {
    if (!user) {
      toast.error('Authentication Required')
      return
    }

    try {
      await addDoc(collection(db, `users/${user.uid}/applications`), {
        company: job.employer_name,
        role: job.job_title,
        status: 'Applied', // Assume applying if saving from here, or we could add "Watchlist" status
        dateApplied: new Date().toISOString().split('T')[0],
        notes: `Source: JSearch\nLocation: ${job.job_city}, ${job.job_country}\nRemote: ${job.job_is_remote}\n\nLink: ${job.job_apply_link}\n\nDescription Snippet: ${job.job_description.substring(0, 500)}...`,
        visaSponsorship: false, // Default
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      toast.success('Application saved!')
    } catch {
      toast.error('Failed to save target.')
    }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in font-primary p-6">
      <header className="mb-12 text-center">
        <h1 className="heading-xl mb-2">Job Search</h1>
        <p className="text-text-secondary font-medium">
          Search across thousands of job boards to find your next role
        </p>
      </header>

      <div className="max-w-2xl mx-auto mb-12">
        <form onSubmit={handleSearch} className="relative group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. React Developer Remote"
            className="w-full h-14 bg-white dark:bg-zinc-900 border border-border-subtle focus:border-primary-500 rounded-full px-6 pr-14 text-base font-medium outline-none transition-all shadow-sm focus:shadow-md focus:ring-2 focus:ring-primary-500/10 placeholder:text-text-muted"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-1.5 top-1.5 h-11 w-11 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-50 shadow-md"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
            ) : (
              <Icon name="search" size={20} />
            )}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((job) => (
          <div
            key={job.job_id}
            className="premium-card group hover:border-primary-500/50 transition-all flex flex-col h-full hover:shadow-lg"
          >
            <div className="p-6 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-bg-subtle rounded-lg flex items-center justify-center overflow-hidden border border-border-subtle">
                  {job.employer_logo ? (
                    <img
                      src={job.employer_logo}
                      alt={job.employer_name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="font-bold text-xl text-text-secondary">
                      {job.employer_name.charAt(0)}
                    </span>
                  )}
                </div>
                {job.job_is_remote && <span className="badge badge-success">Remote</span>}
              </div>

              <h3 className="text-lg font-bold text-text-primary mb-1 line-clamp-2">
                {job.job_title}
              </h3>
              <p className="text-xs text-text-secondary font-bold uppercase tracking-wide mb-4">
                {job.employer_name}
              </p>

              <p className="text-xs text-text-secondary line-clamp-4 leading-relaxed mb-6 flex-1">
                {job.job_description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-border-subtle mt-auto">
                <span className="text-xs font-medium text-text-muted">
                  {job.job_city ? `${job.job_city}, ` : ''}
                  {job.job_country}
                </span>
                <div className="flex gap-2">
                  <a
                    href={job.job_apply_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-text-secondary hover:text-primary-600 transition-colors rounded-lg hover:bg-bg-subtle"
                    title="View Original"
                  >
                    <Icon name="visibility" size={18} />
                  </a>
                  <button
                    onClick={() => handleSaveJob(job)}
                    className="p-2 text-text-secondary hover:text-primary-600 transition-colors rounded-lg hover:bg-bg-subtle"
                    title="Save Application"
                  >
                    <Icon name="add" size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && results.length === 0 && query && (
        <div className="premium-card p-12 text-center">
          <div className="w-16 h-16 bg-bg-subtle rounded-full flex items-center justify-center mx-auto mb-4 text-text-muted">
            <Icon name="search" size={32} />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-1">No jobs found</h3>
          <p className="text-text-secondary">Try adjusting your search terms or location</p>
        </div>
      )}
    </div>
  )
}

export default JobSearch
