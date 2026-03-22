import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle size={28} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Something went wrong</h2>
              <p className="text-sm text-slate-400 max-w-md break-words">
                {error.message}
              </p>
            </div>
            <button
              onClick={() => this.setState({ error: null })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
