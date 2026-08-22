import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Key,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  Lock,
} from 'lucide-react';
import { GatewayMetadata } from '../../constants/paymentGateways';
import { PaymentGatewayItem, PaymentGatewayMode } from '../../types';

interface PaymentGatewayConfigModalProps {
  isOpen: boolean;
  gatewayMeta: GatewayMetadata | null;
  currentConfig: PaymentGatewayItem | null;
  onClose: () => void;
  onSave: (gatewayId: string, updated: Partial<PaymentGatewayItem>) => Promise<void>;
  onTriggerLiveConfirm: (meta: GatewayMetadata, pendingMode: PaymentGatewayMode) => void;
}

export const PaymentGatewayConfigModal: React.FC<PaymentGatewayConfigModalProps> = ({
  isOpen,
  gatewayMeta,
  currentConfig,
  onClose,
  onSave,
  onTriggerLiveConfirm,
}) => {
  if (!isOpen || !gatewayMeta) return null;

  const [enabled, setEnabled] = useState<boolean>(currentConfig?.enabled ?? false);
  const [mode, setMode] = useState<PaymentGatewayMode>(currentConfig?.mode ?? gatewayMeta.defaultMode);
  const [publicIdentifier, setPublicIdentifier] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(currentConfig?.configured ?? false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSecretsHelp, setShowSecretsHelp] = useState<boolean>(false);

  useEffect(() => {
    if (currentConfig && gatewayMeta) {
      setEnabled(currentConfig.enabled ?? false);
      setMode(currentConfig.mode ?? gatewayMeta.defaultMode);
      setIsConfigured(currentConfig.configured ?? false);

      const pKey = gatewayMeta.publicIdentifierKey;
      if (pKey && currentConfig[pKey]) {
        setPublicIdentifier(String(currentConfig[pKey]));
      } else {
        setPublicIdentifier('');
      }
    }
  }, [currentConfig, gatewayMeta]);

  const handleModeChange = (newMode: PaymentGatewayMode) => {
    if (newMode === 'live' && mode !== 'live') {
      onTriggerLiveConfirm(gatewayMeta, newMode);
    } else {
      setMode(newMode);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const pKey = gatewayMeta.publicIdentifierKey;
      const updatedItem: Partial<PaymentGatewayItem> = {
        enabled,
        mode,
        configured: isConfigured || (publicIdentifier.trim().length > 0),
        [pKey]: publicIdentifier.trim(),
      };

      await onSave(gatewayMeta.id, updatedItem);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id={`config-modal-${gatewayMeta.id}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 relative my-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-md shrink-0"
              style={{ backgroundColor: gatewayMeta.brandColor }}
            >
              {gatewayMeta.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-gray-900">{gatewayMeta.name} Configuration</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                  {gatewayMeta.badge}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{gatewayMeta.description}</p>
            </div>
          </div>
          <button
            id="close-config-modal-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Status & Mode Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Enable/Disable Toggle */}
            <div className="p-4 rounded-2xl border border-gray-200/80 bg-gray-50/50 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-gray-800 block">Gateway Status</span>
                <span className="text-xs text-gray-500">
                  {enabled ? 'Active during checkout' : 'Disabled for customers'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id={`toggle-enable-${gatewayMeta.id}`}
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6452]"></div>
              </label>
            </div>

            {/* Mode Selector */}
            <div className="p-4 rounded-2xl border border-gray-200/80 bg-gray-50/50 space-y-2">
              <span className="text-sm font-bold text-gray-800 block">Environment Mode</span>
              <div className="flex items-center space-x-2">
                {gatewayMeta.supportedModes.map((sm) => (
                  <button
                    key={sm.value}
                    id={`mode-btn-${gatewayMeta.id}-${sm.value}`}
                    type="button"
                    onClick={() => handleModeChange(sm.value)}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                      mode === sm.value
                        ? sm.value === 'live'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {sm.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Public Identifier Input (Never Secret Keys) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor={`public-id-${gatewayMeta.id}`}
                className="text-sm font-bold text-gray-800 flex items-center space-x-1.5"
              >
                <Key className="w-4 h-4 text-gray-500" />
                <span>{gatewayMeta.publicIdentifierLabel}</span>
              </label>
              <span className="text-[11px] text-gray-400 font-medium">Public client identifier</span>
            </div>
            <input
              id={`public-id-${gatewayMeta.id}`}
              type="text"
              value={publicIdentifier}
              onChange={(e) => setPublicIdentifier(e.target.value)}
              placeholder={gatewayMeta.publicIdentifierPlaceholder}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:border-[#ff6452] focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
            />
            <p className="text-xs text-gray-500">
              Safe public key/identifier stored in database and used by client checkout SDK.
            </p>
          </div>

          {/* Credentials Status & Security Architecture Notice */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">Credential Security</h4>
                  <p className="text-xs text-emerald-800">
                    Protected by Supabase Edge Functions server-side vault
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-emerald-700 border border-emerald-200 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isConfigured ? 'Credentials Configured' : 'Ready to Connect'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-emerald-900">
                <input
                  id={`mark-configured-${gatewayMeta.id}`}
                  type="checkbox"
                  checked={isConfigured}
                  onChange={(e) => setIsConfigured(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Mark secret credentials configured in server environment</span>
              </label>

              <button
                type="button"
                onClick={() => setShowSecretsHelp(!showSecretsHelp)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center space-x-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showSecretsHelp ? 'Hide Secret Key Setup' : 'How to set secret keys?'}</span>
              </button>
            </div>

            {/* Secret Key Setup Accordion */}
            {showSecretsHelp && (
              <div className="mt-3 pt-3 border-t border-emerald-200/80 text-xs text-gray-700 space-y-2 bg-white/80 p-3.5 rounded-xl border">
                <div className="flex items-center space-x-1.5 font-bold text-gray-900">
                  <Lock className="w-3.5 h-3.5 text-rose-500" />
                  <span>Never place secret keys in frontend code</span>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  For bank-grade compliance, secret keys are never stored in public database tables or frontend bundles.
                  Set your private key in your server environment or Supabase Edge Functions:
                </p>
                <div className="bg-gray-900 text-gray-100 p-2.5 rounded-lg font-mono text-[11px] select-all">
                  {gatewayMeta.secretKeyEnvName}=your_secret_live_key_here
                </div>
                <p className="text-[11px] text-gray-500">{gatewayMeta.guideNotes}</p>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <a
              href={gatewayMeta.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-[#ff6452] font-semibold hover:underline"
            >
              <span>{gatewayMeta.name} Developer Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={gatewayMeta.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-gray-500 hover:text-gray-800"
            >
              <span>Merchant Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              id={`cancel-config-${gatewayMeta.id}`}
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              id={`save-config-${gatewayMeta.id}`}
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-[#ff6452] hover:bg-[#e05342] text-white text-sm font-bold shadow-lg shadow-rose-500/20 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
