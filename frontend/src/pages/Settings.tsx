function Settings() {
  return (
    <div className="max-w-4xl mx-auto" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
      {/* Page Header */}
      <div className="mb-xl">
        <h1 className="text-3xl font-bold text-primary">Settings</h1>
        <p className="text-secondary text-base mt-sm">Manage your account and preferences</p>
      </div>

      {/* Settings Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
        
        {/* Account Settings Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Account Settings</h3>
          </div>
          <div style={{ padding: 'var(--spacing-lg)' }}>
            <div className="input-group">
              <label htmlFor="email-notifications" className="input-label">
                Email Notifications
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <input
                  type="checkbox"
                  id="email-notifications"
                  className="checkbox"
                />
                <span className="text-sm text-secondary">
                  Receive weekly progress summaries
                </span>
              </div>
            </div>

            <div className="border-t border-border-light" style={{ paddingTop: 'var(--spacing-lg)', marginTop: 'var(--spacing-lg)' }}>
              <h4 className="text-sm font-semibold text-primary mb-md">Danger Zone</h4>
              <button className="btn btn-secondary" style={{ color: 'var(--status-rejected)', borderColor: 'var(--status-rejected)' }}>
                🗑️ Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Data Export Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Data Export</h3>
          </div>
          <div style={{ padding: 'var(--spacing-lg)' }}>
            <p className="text-secondary mb-lg">
              Download all your application data in CSV format.
            </p>
            <button className="btn btn-orange">
              📥 Export Data
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Settings