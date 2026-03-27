import DataManagement from '../components/DataManagement'

/**
 * Data management page wrapper.
 * @returns The data management view.
 */
function DataManagementPage() {
  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto px-6 sm:px-8 pb-16 pt-6">
      <div className="p-4 sm:p-6 lg:p-10 rounded-xl border border-border bg-bg-surface relative overflow-hidden shadow-md">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary-500/40" />
        <DataManagement />
      </div>
    </div>
  )
}

export default DataManagementPage
