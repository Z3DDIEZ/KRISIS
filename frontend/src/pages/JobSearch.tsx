import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions, db, auth } from '../lib/firebase'
import { useAuthState } from 'react-firebase-hooks/auth'
import Icon from '../components/ui/Icon'
import { toast } from 'sonner'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

interface JobResult {
    job_id: string;
    employer_name: string;
    employer_logo?: string;
    job_title: string;
    job_description: string;
    job_apply_link: string;
    job_city?: string;
    job_country?: string;
    job_is_remote?: boolean;
    job_posted_at_datetime_utc?: string;
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
            const response: any = await searchFn({ query: query, num_pages: 1 })

            if (response.data && response.data.data) {
                setResults(response.data.data)
            } else {
                toast.info('No intel found for this sector.')
            }
        } catch (error: any) {
            console.error("Search Error:", error)
            toast.error(`Search Protocol Failed: ${error.message}`)
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
                updatedAt: serverTimestamp()
            })
            toast.success('Target Acquired: Application Record Created')
        } catch (error) {
            toast.error('Failed to save target.')
        }
    }

    return (
        <div className="max-w-6xl mx-auto animate-fade-in font-primary">
            <header className="mb-12 text-center">
                <h1 className="text-4xl font-black text-primary mb-2 uppercase tracking-tighter">
                    Global Job Intelligence
                </h1>
                <p className="text-secondary font-medium tracking-tight uppercase text-xs">
                    Scan global networks for open positions
                </p>
            </header>

            <div className="max-w-2xl mx-auto mb-16">
                <form onSubmit={handleSearch} className="relative group">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ex: React Developer Remote"
                        className="w-full h-16 bg-surface-2 border-2 border-border-light focus:border-primary-orange px-6 pr-16 text-lg font-bold outline-none transition-all shadow-sm group-hover:shadow-md"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="absolute right-2 top-2 h-12 w-12 bg-primary-orange text-white flex items-center justify-center hover:bg-primary-orange/90 transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                        ) : (
                            <Icon name="search" size={24} />
                        )}
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((job) => (
                    <div key={job.job_id} className="card group hover:border-primary-orange transition-all flex flex-col h-full">
                        <div className="card-body p-6 flex flex-col flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-surface-3 rounded flex items-center justify-center overflow-hidden">
                                    {job.employer_logo ? (
                                        <img src={job.employer_logo} alt={job.employer_name} className="w-full h-full object-contain" />
                                    ) : (
                                        <span className="font-black text-xl text-muted">{job.employer_name.charAt(0)}</span>
                                    )}
                                </div>
                                {job.job_is_remote && (
                                    <span className="badge bg-primary-green/10 text-primary-green border-primary-green/20">Remote</span>
                                )}
                            </div>

                            <h3 className="text-lg font-bold text-primary mb-1 uppercase leading-tight line-clamp-2">
                                {job.job_title}
                            </h3>
                            <p className="text-xs text-primary-orange font-black uppercase tracking-widest mb-4">
                                {job.employer_name}
                            </p>

                            <p className="text-xs text-secondary line-clamp-4 leading-relaxed mb-6 flex-1">
                                {job.job_description}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-border-light mt-auto">
                                <span className="text-[10px] font-bold text-muted uppercase">
                                    {job.job_city ? `${job.job_city}, ` : ''}{job.job_country}
                                </span>
                                <div className="flex gap-2">
                                    <a
                                        href={job.job_apply_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-muted hover:text-primary transition-colors"
                                        title="View Original"
                                    >
                                        <Icon name="visibility" size={18} />
                                    </a>
                                    <button
                                        onClick={() => handleSaveJob(job)}
                                        className="p-2 text-muted hover:text-primary-orange transition-colors"
                                        title="Add to Pipeline"
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
                <div className="text-center py-12 text-muted">
                    <Icon name="warning" size={32} className="mx-auto mb-4 opacity-50" />
                    <p className="uppercase text-xs font-bold tracking-widest">No signals detected</p>
                </div>
            )}
        </div>
    )
}

export default JobSearch
