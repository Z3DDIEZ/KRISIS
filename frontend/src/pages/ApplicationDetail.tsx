function ApplicationDetail() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Application Details</h1>
        <p className="text-gray-600">View and manage application details</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <span className="text-4xl">📄</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Application form coming soon</h3>
          <p className="text-gray-500">This will allow you to create and edit job applications.</p>
        </div>
      </div>
    </div>
  )
}

export default ApplicationDetail