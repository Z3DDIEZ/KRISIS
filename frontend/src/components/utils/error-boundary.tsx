import React from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import Icon from '../ui/Icon'

interface ErrorBoundaryProps {
  children: React.ReactNode
  title?: string
  description?: string
}

interface ErrorBoundaryState {
  hasError: boolean
}

const isDev = import.meta.env.DEV

/**
 * ErrorBoundary - Catches render-time errors and shows a safe recovery UI.
 * @param props - Boundary configuration and child components.
 * @returns The wrapped UI or a fallback state on error.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  public componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[KRISIS] Unhandled UI error', error, info)
  }

  private handleReset = () => {
    this.setState({ hasError: false })
  }

  public render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
        <Card className="w-full max-w-xl p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-bg-subtle border border-border flex items-center justify-center text-primary-600 shrink-0">
              <Icon name="warning" size={22} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-text-primary">
                {this.props.title ?? 'Something went wrong'}
              </h2>
              <p className="text-sm text-text-muted mt-1">
                {this.props.description ??
                  'A UI error occurred. Try reloading, or return to the dashboard.'}
              </p>
              {isDev && (
                <p className="text-xs text-text-muted mt-3">
                  Check the browser console for details.
                </p>
              )}
              <div className="flex flex-wrap gap-3 mt-6">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </Button>
                <Link to="/">
                  <Button type="button" variant="secondary">
                    Go to Dashboard
                  </Button>
                </Link>
                <Button type="button" variant="ghost" onClick={this.handleReset}>
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }
}

