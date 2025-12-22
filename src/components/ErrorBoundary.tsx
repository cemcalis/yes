'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking service (Sentry, etc.)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Bir Hata Oluştu
            </h1>
            <p className="text-gray-600 mb-6">
              Üzgünüz, bir şeyler ters gitti. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-gray-100 p-4 rounded-lg mb-4">
                <summary className="cursor-pointer font-medium text-sm">
                  Hata Detayları
                </summary>
                <pre className="mt-2 text-xs overflow-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional error component for specific sections
export function ErrorMessage({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
      <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
      <p className="text-red-800 text-sm font-medium mb-3">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Tekrar Dene
        </button>
      )}
    </div>
  );
}
