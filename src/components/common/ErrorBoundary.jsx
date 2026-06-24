import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const logError = (error, context = {}) => {
  const timestamp = new Date().toISOString();
  console.error(
    `[ERROR - ${timestamp}]`,
    "An error occurred:", error,
    "Context:", context
  );
};

// A stale browser tab can hold an old index.html that points at chunk hashes
// which no longer exist after a redeploy. The dynamic import then fails (or the
// server returns index.html, which the browser can't parse as a module). Detect
// that class of error so we can recover by reloading fresh assets.
export const isChunkLoadError = (error) => {
  const msg = (error && (error.message || String(error))) || '';
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /'?ChunkLoadError'?/i.test(msg) ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    // Server returned HTML (index.html) where JS was expected.
    /Unexpected token '<'/i.test(msg) ||
    /expected a JavaScript(?:-or-Wasm)? module/i.test(msg)
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error, errorInfo) {
    logError(error, {
      componentStack: errorInfo.componentStack,
      componentName: this.props.componentName || 'UnknownComponent'
    });

    // Self-heal stale-deploy chunk errors: reload once to pull fresh assets.
    // Guard with sessionStorage so a genuinely missing chunk can't loop forever.
    if (isChunkLoadError(error)) {
      const KEY = '__chunk_reload_at';
      const last = Number(sessionStorage.getItem(KEY) || 0);
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        // Cache-bust so the new index.html (with current hashes) is fetched.
        const url = new URL(window.location.href);
        url.searchParams.set('_r', Date.now().toString().slice(-6));
        window.location.replace(url.toString());
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  }

  render() {
    if (this.state.hasError) {
      // Chunk error: a reload is already in flight — show a friendly updating state.
      if (this.state.isChunkError) {
        return (
          <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
            <RefreshCw className="w-7 h-7 animate-spin text-orange-600" />
            <p className="text-sm">Updating to the latest version…</p>
          </div>
        );
      }
      return (
        <div className="flex items-center justify-center p-8 min-h-[300px]">
          <Card className="premium-card w-full max-w-lg text-center">
            <CardHeader>
              <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-red-800">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We encountered an unexpected error. Please try refreshing or contact support if the problem persists.
              </p>
              <Button onClick={this.handleReset} className="bg-red-600 hover:bg-red-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;