'use client'

import { Component, type ReactNode } from 'react'
import { HardHat } from 'lucide-react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class AuthErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    if (typeof console !== 'undefined') {
      console.error('AuthErrorBoundary caught:', error)
    }
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-6">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-indigo-600 shadow-lg mb-6">
            <HardHat className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Something went wrong
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            We hit an unexpected error loading this page. Try again, or refresh if the problem persists.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    )
  }
}
