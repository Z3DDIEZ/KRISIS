import DataManagement from '../components/DataManagement'

function DataManagementPage() {
  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 mb-20">
      <div className="p-4 sm:p-6 lg:p-10 rounded-none border-2 border-brand-midnight bg-white dark:bg-zinc-950 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-brand-orange" />
        <DataManagement />
      </div>
    </div>
  )
}

export default DataManagementPage
