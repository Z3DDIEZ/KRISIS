import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db, functions } from '../lib/firebase'
import { getTodayDate } from '../lib/dateUtils'
import Icon from '../components/ui/Icon'
import { extractTextFromPDF } from '../utils/pdfHelpers'
import { httpsCallable } from 'firebase/functions'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { applicationSchema, type ApplicationValues } from '../lib/schemas'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '../lib/store'
import { motion } from 'framer-motion'
import DecryptedText from '../components/effects/DecryptedText'
import SplitText from '../components/effects/SplitText'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 } as any
  }
}

const statusOptions = [
  { value: 'Applied', label: 'Applied' },
  { value: 'Phone Screen', label: 'Phone Screen' },
  { value: 'Technical Interview', label: 'Technical Interview' },
  { value: 'Final Round', label: 'Final Round' },
  { value: 'Offer', label: 'Offer' },
  { value: 'Rejected', label: 'Rejected' },
]

function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const dispatchNotification = useUIStore((state) => state.dispatchNotification)
  const [user, authLoading] = useAuthState(auth)
  const isNewApplication = id === 'new'

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting: hookIsSubmitting },
  } = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      company: '',
      role: '',
      status: 'Applied',
      dateApplied: getTodayDate(),
      notes: '',
      visaSponsorship: false,
      requestAnalysis: false,
      resumeUrl: '',
      latestAnalysis: undefined,
    },
  })

  const [isLoading, setIsLoading] = useState(id && id !== 'new')
  const [resumeText, setResumeText] = useState<string>('')
  const [analyzing, setAnalyzing] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const formData = watch()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported.')
      return
    }

    try {
      const text = await extractTextFromPDF(file)
      setResumeText(text)
      toast.success('Resume data extracted successfully.')
    } catch {
      toast.error('Failed to parse resume PDF.')
    }
  }

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!resumeText) {
      toast.error('Please upload a PDF resume first.')
      return
    }
    if (formData.notes.length < 10 && (!formData.role || !formData.company)) {
      toast.error('Please define a Role and Company, or add details in notes to start analysis.')
      return
    }

    const jobDescription =
      formData.notes.length > 50 ? formData.notes : `Role: ${formData.role} at ${formData.company}.`

    setAnalyzing(true)
    try {
      const analyzeFn = httpsCallable(functions, 'analyzeResume')
      const result: any = await analyzeFn({ resumeText, jobDescription })

      if (result.data.success) {
        const analysisData = {
          ...result.data.data,
          analyzedAt: new Date().toISOString(),
        }
        setValue('latestAnalysis', analysisData, { shouldDirty: true, shouldValidate: true })
        toast.success('Analysis complete. Save changes to persist.')
      } else {
        throw new Error('Analysis returned failure.')
      }
    } catch (error: unknown) {
      console.error('Analysis Error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Analysis failed: ${message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const loadApplication = async () => {
    if (!user || !id) return

    try {
      const docRef = doc(db, `users/${user.uid}/applications/${id}`)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        const loadedData: ApplicationValues = {
          company: data.company || '',
          role: data.role || '',
          status: data.status || 'Applied',
          dateApplied: data.dateApplied || getTodayDate(),
          notes: data.notes || '',
          resumeUrl: data.resumeUrl || '',
          visaSponsorship: Boolean(data.visaSponsorship),
          requestAnalysis: false,
          latestAnalysis: data.latestAnalysis,
        }
        reset(loadedData)
      } else {
        dispatchNotification('Application not found', 'error')
        navigate('/applications')
      }
    } catch (error) {
      console.error('Error loading application:', error)
      dispatchNotification(t('common.error'), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlFromParams = params.get('importUrl')

    if (id === 'new' && urlFromParams) {
      setImportUrl(urlFromParams)
      handleImport(urlFromParams)
    } else if (id && id !== 'new' && user) {
      loadApplication()
    } else if (id === 'new' || !id) {
      setIsLoading(false)
    }
  }, [user, id])

  const onFormSubmit = async (data: ApplicationValues) => {
    if (!user) return

    try {
      const sanitizedData = JSON.parse(JSON.stringify(data))
      const applicationData = {
        ...sanitizedData,
        updatedAt: serverTimestamp(),
        ...(isNewApplication && {
          createdAt: serverTimestamp(),
        }),
      }

      if (isNewApplication) {
        const docRef = await addDoc(collection(db, `users/${user.uid}/applications`), applicationData)
        dispatchNotification('Application created successfully.', 'success')
        navigate(`/applications/${docRef.id}`)
      } else {
        await updateDoc(doc(db, `users/${user.uid}/applications/${id}`), applicationData)
        dispatchNotification('Application updated successfully.', 'success')
      }
    } catch (error: unknown) {
      console.error('Error saving application:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      dispatchNotification(`Error saving application: ${errorMessage}`, 'error')
    }
  }

  const handleImport = async (overrideUrl?: string) => {
    const targetUrl = overrideUrl || importUrl
    if (!targetUrl) return

    setIsImporting(true)
    try {
      const ingestFn = httpsCallable(functions, 'ingestJobUrl')
      const result: any = await ingestFn({ url: targetUrl })

      if (result.data.success) {
        const jobData = result.data.data
        setValue('company', jobData.company || '', { shouldDirty: true })
        setValue('role', jobData.role || '', { shouldDirty: true })

        const description = jobData.description
          ? `${jobData.description}\n\nSource: ${targetUrl}`
          : `Source: ${targetUrl}`

        setValue('notes', description, { shouldDirty: true })
        setValue('dateApplied', getTodayDate(), { shouldDirty: true })
        toast.success(`Imported job from ${jobData.company}`)
      }
    } catch (error: unknown) {
      console.error('Import Error:', error)
      toast.error('Failed to import job details. Please fill manually.')
    } finally {
      setIsImporting(false)
    }
  }

  if (id && id !== 'new' && (authLoading || isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-none h-8 w-8 border-2 border-brand-midnight border-t-brand-orange"></div>
          <p className="text-brand-midnight text-xs font-black uppercase tracking-widest animate-pulse">
            {authLoading ? 'Authenticating...' : 'Loading Dossier...'}
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center p-8 border-2 border-brand-midnight bg-white">
          <p className="text-brand-midnight font-black uppercase tracking-widest mb-6">
            Authentication Required for Dossier Access
          </p>
          <Button onClick={() => navigate('/auth')} variant="primary" className="rounded-none font-black uppercase tracking-widest border-2 border-brand-midnight">
            Return to Core
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="pb-20 p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 relative"
    >
      {/* Strategic Header */}
      <motion.div variants={itemVariants}>
        <Card className="p-0 overflow-hidden border-2 border-brand-midnight shadow-[8px_8px_0px_rgba(0,0,0,1)] bg-brand-midnight! relative">
          <div className="absolute top-0 right-0 p-2 transform rotate-45 translate-x-12 -translate-y-4 bg-brand-orange! text-brand-midnight text-[8px] font-black uppercase tracking-[0.4em] px-10 py-1 border-2 border-brand-midnight z-20">
            INTERNAL USE ONLY
          </div>
          
          <div className="flex flex-col md:flex-row divide-y-2 md:divide-y-0 md:divide-x-2 divide-brand-midnight">
            <div className="p-8 md:p-12 flex-1 bg-brand-midnight! text-brand-signal">
              <div className="flex items-center gap-2 mb-6">
                <Link
                  to="/applications"
                  className="text-brand-signal/60 hover:text-brand-orange transition-colors flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.2em]"
                >
                  <Icon name="arrow-left" size={14} />
                  Return to Archive
                </Link>
                <div className="h-4 w-px bg-brand-signal/20" />
                <span className="text-brand-signal/20 font-mono text-xs uppercase tracking-tighter italic">REF: KRISIS-DOSSIER-{id?.toUpperCase().slice(0, 8)}</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none mb-4">
                <SplitText text={isNewApplication ? 'New Extractions' : (formData.company || 'Target Details')} className="inline" />
              </h1>
              {formData.role && (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-brand-orange flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-brand-midnight rounded-full" />
                  </div>
                  <p className="text-brand-orange text-sm font-black uppercase tracking-[0.3em] italic">
                    OPERATIONAL ROLE: {formData.role}
                  </p>
                </div>
              )}
            </div>

            {!isNewApplication && (
              <div className="md:w-80 bg-brand-signal! p-8 md:p-12 flex flex-col justify-center items-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-orange!" />
                <span className="text-[11px] font-black text-brand-midnight/60 uppercase tracking-widest mb-6 border-b border-brand-midnight/10 pb-2">Engagement Phase</span>
                <Badge
                  variant={
                    formData.status === 'Offer'
                      ? 'success'
                      : formData.status === 'Rejected'
                        ? 'error'
                        : 'neutral'
                  }
                  className="px-8 py-3 text-sm font-black uppercase tracking-widest rounded-none border-2 border-brand-midnight shadow-[6px_6px_0px_rgba(0,0,0,1)] scale-110"
                >
                  {formData.status}
                </Badge>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Automated Ingestion Phase (New Only) */}
      {isNewApplication && (
        <motion.div variants={itemVariants}>
          <Card className="p-8 bg-brand-orange! border-2 border-brand-midnight shadow-[8px_8px_0px_rgba(0,0,0,1)]">
            <div className="flex flex-col lg:flex-row gap-6 items-end lg:items-center">
              <div className="flex-1 w-full space-y-3">
                <label
                  htmlFor="importUrl"
                  className="text-[11px] font-black uppercase text-brand-midnight flex items-center gap-2 tracking-[0.3em]"
                >
                  <Icon name="bolt" size={14} className="animate-pulse" />
                  Automated Ingestion Protocol
                </label>
                <input
                  id="importUrl"
                  type="text"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="SOURCE URL (LINKEDIN, INDEED, ETC)..."
                  className="w-full h-14 px-6 rounded-none border-2 border-brand-midnight bg-white focus:bg-brand-gray/5 outline-none text-xs font-black placeholder:text-brand-midnight/30 uppercase tracking-[0.2em] transition-all focus:ring-4 focus:ring-brand-midnight/10"
                />
              </div>
              <Button
                onClick={() => handleImport()}
                disabled={!importUrl || isImporting}
                variant="primary"
                className="w-full lg:w-auto h-14 rounded-none border-2 border-brand-midnight bg-brand-midnight text-brand-signal hover:bg-brand-midnight/90 uppercase font-black tracking-[0.2em] px-12 shadow-[4px_4px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none transition-all"
              >
                {isImporting ? 'INGESTING...' : 'INITIATE INGEST'}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-12">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-12">
          <motion.div variants={itemVariants}>
            <Card className="p-0 overflow-hidden border-2 border-brand-midnight shadow-[8px_8px_0px_rgba(0,0,0,1)] bg-white">
              <div className="bg-brand-gray/10 px-8 py-4 border-b-2 border-brand-midnight flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-none bg-brand-midnight text-brand-signal flex items-center justify-center border-r border-brand-signal/20">
                    <Icon name="work" size={18} />
                  </div>
                  <h3 className="text-xs font-black text-brand-midnight uppercase tracking-[0.4em]">
                    Section 01 // Operational Context
                  </h3>
                </div>
                <div className="flex gap-1">
                   {[1,2,3].map(i => <div key={i} className="w-2 h-2 bg-brand-midnight/20" />)}
                </div>
              </div>

              <div className="p-8 md:p-12 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label htmlFor="company" className="text-[11px] font-black text-brand-midnight/60 dark:text-zinc-300 uppercase tracking-[0.25em] flex justify-between">
                      Target Entity <span className="text-brand-orange">*</span>
                    </label>
                    <input
                      {...register('company')}
                      type="text"
                      className={`w-full h-14 px-6 rounded-none border-2 bg-brand-gray/5 text-brand-midnight outline-none focus:ring-4 focus:ring-brand-orange/10 transition-all font-black text-xs uppercase tracking-widest ${errors.company ? 'border-error' : 'border-brand-midnight focus:border-brand-orange'}`}
                      placeholder="ACME CORP / GLOBAL SEC"
                    />
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="role" className="text-[11px] font-black text-brand-midnight/60 dark:text-zinc-300 uppercase tracking-[0.25em] flex justify-between">
                      Designated Role <span className="text-brand-orange">*</span>
                    </label>
                    <input
                      {...register('role')}
                      type="text"
                      className={`w-full h-14 px-6 rounded-none border-2 bg-brand-gray/5 text-brand-midnight outline-none focus:ring-4 focus:ring-brand-orange/10 transition-all font-black text-xs uppercase tracking-widest ${errors.role ? 'border-error' : 'border-brand-midnight focus:border-brand-orange'}`}
                      placeholder="PRINCIPAL ENGINEER / LEAD"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label htmlFor="status" className="text-[11px] font-black text-brand-midnight/60 dark:text-zinc-300 uppercase tracking-[0.25em]">Engagement Phase</label>
                    <div className="relative">
                      <select
                        {...register('status')}
                        className="w-full h-14 px-6 rounded-none border-2 border-brand-midnight bg-brand-gray/5 text-brand-midnight outline-none focus:border-brand-orange transition-all font-black text-xs appearance-none cursor-pointer uppercase tracking-widest"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label.toUpperCase()}</option>
                        ))}
                      </select>
                      <Icon name="arrow-down" size={14} className="absolute right-6 top-1/2 -translate-y-1/2 text-brand-midnight pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="dateApplied" className="text-[11px] font-black text-brand-midnight/60 dark:text-zinc-300 uppercase tracking-[0.25em]">Timestamp: Initial Contact <span className="text-brand-orange">*</span></label>
                    <input
                      {...register('dateApplied')}
                      type="date"
                      className="w-full h-14 px-6 rounded-none border-2 border-brand-midnight bg-brand-gray/5 text-brand-midnight outline-none focus:border-brand-orange transition-all font-black text-xs uppercase tracking-widest"
                    />
                  </div>
                </div>

                <div className="p-8 bg-brand-midnight text-brand-signal rounded-none border-l-4 border-brand-orange flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase tracking-widest block">Authorization Status</span>
                    <p className="text-[10px] text-brand-signal/40 font-bold uppercase tracking-tight italic">International visa sponsorship assessment required</p>
                  </div>
                  <input
                    {...register('visaSponsorship')}
                    type="checkbox"
                    className="w-8 h-8 rounded-none border-2 border-brand-signal bg-brand-midnight text-brand-orange focus:ring-brand-orange cursor-pointer"
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="notes" className="text-[11px] font-black text-brand-midnight/60 dark:text-zinc-300 uppercase tracking-[0.25em] flex justify-between">
                    Strategic Intelligence / Match Assessment Details
                    <span className="font-mono text-[9px] opacity-60">{formData.notes.length}/1000</span>
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={8}
                    className="w-full p-6 rounded-none border-2 border-brand-midnight bg-brand-gray/5 text-brand-midnight outline-none focus:ring-4 focus:ring-brand-orange/10 transition-all font-bold text-xs leading-relaxed placeholder:text-brand-midnight/20"
                    placeholder="Enter full job specifications, requirements, and tactical field notes..."
                  />
                </div>

                <div className="pt-10 border-t-2 border-brand-midnight/10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isDirty ? 'bg-error animate-pulse' : 'bg-success'}`} />
                    <span className="text-[11px] font-black text-brand-midnight/60 dark:text-zinc-400 uppercase tracking-widest">
                       Status: {isDirty ? 'UNSTABLE_CHANGES_DETECTED' : 'SYSTEM_SYNCHRONIZED'}
                    </span>
                  </div>
                  <div className="flex gap-4 w-full md:w-auto">
                    <Button type="button" onClick={() => navigate('/applications')} variant="secondary" className="flex-1 md:flex-none h-14 rounded-none border-2 border-brand-midnight/20 uppercase font-black text-[10px] tracking-[0.3em] px-8 hover:bg-brand-gray/5">
                      ABORT
                    </Button>
                    <Button
                      type="submit"
                      disabled={hookIsSubmitting || !isDirty}
                      variant="primary"
                      className="flex-1 md:flex-none h-14 rounded-none border-2 border-brand-midnight bg-brand-midnight text-brand-signal hover:bg-brand-midnight/90 uppercase font-black text-[10px] tracking-[0.3em] px-12 shadow-[6px_6px_0px_rgba(0,0,0,0.3)] disabled:opacity-50 disabled:shadow-none transition-all"
                    >
                      {hookIsSubmitting ? 'SAVING...' : isNewApplication ? 'SUBMIT DOSSIER' : 'UPDATE DOSSIER'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </form>

        {/* Strategic Analysis Dossier Section */}
        {!isNewApplication && formData.latestAnalysis && (
          <motion.div variants={itemVariants}>
            <Card className="p-0 overflow-hidden border-2 border-brand-midnight shadow-[8px_8px_0px_rgba(0,0,0,1)] bg-brand-midnight! text-brand-signal">
              <div className="bg-brand-orange! px-8 py-4 border-b-2 border-brand-midnight flex items-center justify-between">
                <hgroup>
                  <h3 className="text-[11px] font-black text-brand-midnight uppercase tracking-[0.4em]">
                    Section 02 // Strategic Intelligence Assessment
                  </h3>
                  <p className="text-[9px] font-black text-brand-midnight/60 uppercase tracking-widest leading-none mt-1">
                    System Timestamp: {formData.latestAnalysis.analyzedAt?.slice(0, 16).replace('T', ' ')}
                  </p>
                </hgroup>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(i => <div key={i} className="w-1.5 h-6 bg-brand-midnight/40 -skew-x-12" />)}
                </div>
              </div>

              <div className="flex flex-col lg:flex-row">
                <div className="lg:w-96 p-12 flex flex-col items-center justify-center bg-brand-midnight border-b-2 lg:border-b-0 lg:border-r-2 border-brand-signal/5 relative overflow-hidden group">
                  <motion.div 
                    animate={{ top: ['-10%', '110%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-[4px] bg-brand-orange/20 z-10 pointer-events-none"
                  />
                  
                  <span className="text-[10px] font-black text-brand-signal/40 uppercase tracking-[0.3em] mb-6">Strategic Match Signal</span>
                  <div className="relative">
                    <span className="text-9xl font-black tracking-tighter text-brand-orange tabular-nums leading-none">
                      {formData.latestAnalysis.fitScore}
                    </span>
                    <span className="absolute -top-4 -right-8 text-3xl font-black text-brand-orange/40">%</span>
                  </div>
                  
                  <div className="mt-8 w-full bg-brand-signal/5 h-2 rounded-none overflow-hidden border border-brand-signal/10 p-px">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${formData.latestAnalysis.fitScore}%` }}
                      transition={{ duration: 2, ease: "easeOut" }}
                      className="h-full bg-brand-orange shadow-[0_0_20px_rgba(255,107,0,0.6)]" 
                    />
                  </div>
                  
                  <p className="mt-10 text-[11px] font-black text-center uppercase tracking-widest leading-relaxed text-brand-signal/60 bg-white/5 p-4 border border-brand-signal/10 w-full italic">
                    Vector Alignment Analysis: <br/>
                    <span className="text-brand-orange not-italic mt-2 block text-lg">
                      {formData.latestAnalysis.fitScore >= 80 ? 'CRITICAL_MATCH' : formData.latestAnalysis.fitScore >= 60 ? 'HIGH_ALIGNMENT' : 'MARGINAL_SIGNAL'}
                    </span>
                  </p>
                </div>

                <div className="flex-1 p-8 md:p-12 space-y-12 bg-white/3 backdrop-blur-md">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-brand-orange uppercase tracking-[0.3em] flex items-center gap-3">
                      <div className="w-2 h-2 bg-brand-orange animate-ping" />
                      Intelligence Summary
                    </h4>
                    <div className="text-base font-bold text-brand-signal/90 leading-relaxed font-mono bg-brand-midnight/40 p-6 border-2 border-brand-signal/5 border-l-brand-orange">
                      <DecryptedText 
                        text={formData.latestAnalysis.matchAnalysis || 'NO_INTELLIGENCE_DATA_RETRIEVED'} 
                        speed={40}
                        maxIterations={20}
                        className="inline"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-brand-signal/30 uppercase tracking-[0.3em] border-b border-brand-signal/10 pb-2">Verified Skill Assets</h4>
                      <div className="flex flex-wrap gap-3">
                        {formData.latestAnalysis.keyMatches?.map((skill: string, index: number) => (
                          <Badge
                            key={index}
                            className="bg-brand-midnight border-2 border-brand-orange/40 text-brand-orange text-[10px] font-black uppercase tracking-[0.2em] rounded-none py-2 px-4 shadow-[4px_4px_0px_rgba(255,107,0,0.1)]"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-brand-signal/30 uppercase tracking-[0.3em] border-b border-brand-signal/10 pb-2">Identified Skill Deficiencies</h4>
                      <div className="flex flex-wrap gap-3">
                        {formData.latestAnalysis.missingKeywords?.map((skill: string, index: number) => (
                          <Badge
                            key={index}
                            className="bg-brand-midnight border-2 border-error/40 text-error text-[10px] font-black uppercase tracking-[0.2em] rounded-none py-2 px-4 shadow-[4px_4px_0px_rgba(255,0,0,0.1)]"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {formData.latestAnalysis.suggestedImprovements && formData.latestAnalysis.suggestedImprovements.length > 0 && (
                    <div className="p-8 bg-brand-orange/90 text-brand-midnight border-l-12 border-brand-midnight">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                        <Icon name="bolt" size={16} />
                        Operational Recommendations
                      </h4>
                      <ul className="space-y-4">
                        {formData.latestAnalysis.suggestedImprovements.map((tip: string, index: number) => (
                          <li key={index} className="flex items-start gap-4">
                            <div className="mt-2 w-2 h-2 bg-brand-midnight rotate-45 shrink-0" />
                            <span className="text-xs font-black uppercase tracking-tight leading-tight italic opacity-90">
                              {tip}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Manual Trigger / Resource Management */}
        {!isNewApplication && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
             {/* Analysis Trigger if missing */}
             {!formData.latestAnalysis && resumeText && (
               <Card className="p-10 border-2 border-brand-midnight border-dashed bg-brand-gray/5 flex flex-col items-center text-center group hover:bg-brand-orange/5 transition-all">
                  <div className="w-16 h-16 bg-brand-midnight text-brand-signal flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Icon name="technical" size={32} />
                  </div>
                  <h3 className="text-xl font-black text-brand-midnight uppercase tracking-widest mb-3">Intelligence Gap Detected</h3>
                  <p className="text-xs font-bold text-brand-midnight/50 uppercase tracking-tighter max-w-xs mb-10 leading-relaxed">
                    CV data available but no strategic assessment performed. Initiate technical alignment protocol now.
                  </p>
                  <Button 
                    onClick={handleAnalyze} 
                    disabled={analyzing}
                    className="w-full h-14 rounded-none border-2 border-brand-midnight bg-brand-midnight text-brand-signal font-black uppercase tracking-[0.3em] hover:bg-brand-orange hover:text-brand-midnight transition-colors"
                  >
                    {analyzing ? 'PROCESSING...' : 'EXECUTE ANALYSIS'}
                  </Button>
               </Card>
             )}

             {/* CV Management */}
             <Card className="p-8 border-2 border-brand-midnight bg-white flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-midnight/30 mb-2">Resource Protocol</h4>
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-brand-midnight text-brand-signal rounded-none shadow-[4px_4px_0px_rgba(255,107,0,1)]">
                       <Icon name="upload" size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-brand-midnight uppercase tracking-widest">Pilot Profile (CV/Resume)</p>
                      <p className="text-[10px] font-bold text-brand-midnight/40 uppercase mt-1 italic">Format: PDF_ONLY // Access: RESTRICTED</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex flex-col gap-4">
                  {resumeText && (
                    <div className="flex items-center gap-2 p-3 bg-brand-gray/5 border border-brand-midnight/10 mb-2 text-[10px] font-black uppercase text-success tracking-widest">
                       <Icon name="check-circle" size={14} />
                       Data Synchronized: {resumeText.length} bytes extracted
                    </div>
                  )}
                  <label className="h-14 px-8 border-2 border-brand-midnight bg-white text-brand-midnight flex items-center justify-center font-black text-xs uppercase tracking-[0.3em] cursor-pointer hover:bg-brand-midnight hover:text-brand-signal transition-all shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">
                    {resumeText ? 'RE-UPLOAD SOURCE' : 'UPLOAD SOURCE FILE'}
                    <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
             </Card>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default ApplicationDetail
