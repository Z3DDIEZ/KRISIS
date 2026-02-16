import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions, db, auth } from '../lib/firebase'
import { useAuthState } from 'react-firebase-hooks/auth'
import Icon from '../components/ui/Icon'
import { toast } from 'sonner'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

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
    <div className="max-w-6xl mx-auto animate-fade-in p-6 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-black text-zinc-900 dark:text-white uppercase tracking-[0.2em]">
          JOB SEARCH
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium text-lg">
          Search across thousands of job boards to find your next role
        </p>
      </header>

      <div className="max-w-2xl mx-auto">
        <Card className="p-2 flex items-center gap-2 shadow-lg shadow-primary-500/10 border-primary-100 dark:border-primary-900/30">
          <form onSubmit={handleSearch} className="flex-1 flex items-center relative">
            <Icon name="search" size={20} className="absolute left-4 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. React Developer Remote"
              className="w-full h-12 pl-12 pr-4 bg-transparent border-none focus:ring-0 text-lg font-medium text-zinc-900 dark:text-white placeholder-zinc-400 outline-none"
            />
          </form>
          <Button
            onClick={handleSearch}
            disabled={loading}
            variant="primary"
            size="lg"
            className="rounded-lg px-8"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
            ) : (
              'Search'
            )}
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((job) => (
          <Card
            key={job.job_id}
            className="flex flex-col h-full hover:shadow-glow hover:border-primary-500/50 transition-all group p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700">
                {job.employer_logo ? (
                  <img
                    src={job.employer_logo}
                    alt={job.employer_name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="font-bold text-xl text-zinc-500 dark:text-zinc-400">
                    {job.employer_name.charAt(0)}
                  </span>
                )}
              </div>
              {job.job_is_remote && <Badge variant="success">Remote</Badge>}
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors">
                {job.job_title}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wide">
                {job.employer_name}
              </p>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-4 leading-relaxed mb-6 flex-1">
              {job.job_description}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-auto">
              <span className="text-xs font-medium text-zinc-400 flex items-center gap-1">
                <Icon name="location_on" size={14} />
                {job.job_city ? `${job.job_city}, ` : ''}
                {job.job_country}
              </span>
              <div className="flex gap-2">
                <a
                  href={job.job_apply_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-zinc-400 hover:text-primary-600 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="View Original"
                >
                  <Icon name="visibility" size={18} />
                </a>
                <button
                  onClick={() => handleSaveJob(job)}
                  className="p-2 text-zinc-400 hover:text-primary-600 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="Save Application"
                >
                  <Icon name="add" size={18} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {!loading && results.length === 0 && query && (
        <Card className="p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <Icon name="search" size={32} />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">No jobs found</h3>
          <p className="text-zinc-500 dark:text-zinc-400">
            Try adjusting your search terms or location
          </p>
        </Card>
      )}
    </div>
  )
}

export default JobSearch
