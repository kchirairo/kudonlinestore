import React from 'react';
import { Database, AlertTriangle, RefreshCw } from 'lucide-react';

interface DatabaseErrorBannerProps {
  error: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const DatabaseErrorBanner: React.FC<DatabaseErrorBannerProps> = ({
  error,
  onRetry,
  isRetrying = false,
}) => {
  return (
    <div
      id="database-error-banner"
      className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 sm:p-8 my-6 text-gray-900 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-300 flex items-center justify-center flex-shrink-0 text-rose-600">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-rose-950">
                Database Connection Error
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200/80 text-rose-800 uppercase">
                Supabase
              </span>
            </div>
            <p className="text-xs sm:text-sm text-rose-800 mt-1 max-w-2xl font-medium leading-relaxed">
              Unable to load products from the primary Supabase database (<code className="bg-rose-100/80 px-1 py-0.5 rounded text-rose-900 font-mono">public.products</code>):
            </p>
            <div className="mt-2 bg-white/80 border border-rose-200 rounded-xl px-3 py-2 text-xs font-mono text-rose-900 break-words max-w-2xl">
              {error}
            </div>
          </div>
        </div>

        {onRetry && (
          <button
            id="retry-database-connection-btn"
            onClick={onRetry}
            disabled={isRetrying}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-sm cursor-pointer whitespace-nowrap self-start sm:self-center"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Connecting...' : 'Retry Connection'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
