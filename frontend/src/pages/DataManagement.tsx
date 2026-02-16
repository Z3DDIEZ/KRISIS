import DataManagement from '../components/DataManagement'

function DataManagementPage() {
  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 mb-20">
      <div className="glass-card p-4 sm:p-6 lg:p-10 rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800/50 bg-white/30 dark:bg-zinc-900/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-primary-500/20 to-transparent" />
        <DataManagement />
      </div>
    </div>
  )
}

export default DataManagementPage
