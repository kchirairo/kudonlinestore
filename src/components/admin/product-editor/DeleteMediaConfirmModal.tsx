import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface DeleteMediaConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mediaType?: 'image' | 'video';
  thumbnailUrl?: string;
  isDeleting?: boolean;
}

export const DeleteMediaConfirmModal: React.FC<DeleteMediaConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  mediaType = 'image',
  thumbnailUrl,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white">
                Delete this {mediaType}?
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Confirmation prompt</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thumbnail preview if available */}
        {thumbnailUrl && (
          <div className="flex items-center justify-center">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 shadow-inner">
              {mediaType === 'video' ? (
                <video
                  src={thumbnailUrl}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <img
                  src={thumbnailUrl}
                  alt="Delete preview"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-600 dark:text-slate-300 text-center leading-relaxed">
          This action will remove this {mediaType} from this product. Other media will remain untouched.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-rose-200 dark:shadow-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
