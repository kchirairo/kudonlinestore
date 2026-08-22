import React from 'react';
import { AlertTriangle, X, ShieldAlert, Check } from 'lucide-react';
import { GatewayMetadata } from '../../constants/paymentGateways';

interface LiveModeConfirmModalProps {
  isOpen: boolean;
  gateway: GatewayMetadata | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const LiveModeConfirmModal: React.FC<LiveModeConfirmModalProps> = ({
  isOpen,
  gateway,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !gateway) return null;

  return (
    <div
      id="live-mode-confirm-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="live-mode-confirm-modal"
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6 relative overflow-hidden"
      >
        {/* Accent Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-[#ff6452] to-rose-600" />

        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                Switch {gateway.name} to Live mode?
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Production Payment Environment</p>
            </div>
          </div>
          <button
            id="close-live-confirm-btn"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-sm text-amber-900 space-y-2">
          <div className="flex items-center space-x-2 font-semibold text-amber-950">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Important Live Mode Notice</span>
          </div>
          <p className="text-xs leading-relaxed text-amber-800">
            Live payments will charge real customers. Make sure your Live credentials are configured before continuing.
          </p>
        </div>

        <div className="space-y-2 text-xs text-gray-600 bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center space-x-2 font-medium text-gray-800">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Real credit cards and bank accounts will be charged</span>
          </div>
          <div className="flex items-center space-x-2 font-medium text-gray-800">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Production secret key (<code className="text-[11px] font-mono text-gray-700 bg-gray-200/60 px-1 py-0.5 rounded">{gateway.secretKeyEnvName}</code>) must be set in Supabase Edge Functions</span>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            id="cancel-live-mode-btn"
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            id="confirm-live-mode-btn"
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-[#ff6452] hover:bg-[#e05342] text-white text-sm font-bold shadow-lg shadow-rose-500/20 transition-all flex items-center space-x-2"
          >
            <span>Switch to Live</span>
          </button>
        </div>
      </div>
    </div>
  );
};
