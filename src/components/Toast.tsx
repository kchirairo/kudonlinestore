import React from 'react';
import { useShop } from '../context/ShopContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useShop();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl shadow-lg border text-sm transition-all duration-200 animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-white text-gray-900 border-gray-100 shadow-gray-200/50'
              : toast.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-white text-gray-800 border-gray-100 shadow-gray-200/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-[#ff6452] flex-shrink-0" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            {toast.type === 'info' && (
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
            )}
            <span className="font-medium text-gray-800">{toast.message}</span>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            aria-label="Close toast"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
