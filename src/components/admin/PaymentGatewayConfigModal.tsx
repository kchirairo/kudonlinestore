import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Key,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  Lock,
  Server,
  Check,
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
  const [enabled, setEnabled] = useState<boolean>(false);
  const [mode, setMode] = useState<PaymentGatewayMode>('test');
  const [publicIdentifier, setPublicIdentifier] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showVaultInfo, setShowVaultInfo] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && currentConfig && gatewayMeta) {
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
  }, [isOpen, currentConfig, gatewayMeta]);

  if (!isOpen || !gatewayMeta) return null;

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
        configured: isConfigured,
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
          <div className="flex items-center space-x-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-md shrink-0"
              style={{ backgroundColor: gatewayMeta.brandColor }}
            >
              {gatewayMeta.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-black text-gray-900">{gatewayMeta.name} Configuration</h3>
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

        <form onSubmit={handleSave} className="space-y-5">
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
              <span className="text-sm font-bold text-gray-800 block">Processing Mode</span>
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

          {/* Secure Credentials State Panel (Hiding Sensitive Keys) */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              isConfigured
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/70 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isConfigured
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {isConfigured ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      API Credentials State
                    </span>
                  </div>
                  <h4 className="text-base font-black flex items-center space-x-2">
                    <span>
                      {isConfigured ? 'Credentials configured' : 'Credentials not configured'}
                    </span>
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {isConfigured
                      ? 'API private keys and secret credentials are securely stored in the server environment vault.'
                      : 'Secret API keys have not been registered in the server environment yet.'}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                <span
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-xs ${
                    isConfigured
                      ? 'bg-white text-emerald-700 border-emerald-300'
                      : 'bg-white text-amber-800 border-amber-300'
                  }`}
                >
                  {isConfigured ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>{isConfigured ? 'Credentials configured' : 'Credentials not configured'}</span>
                </span>
              </div>
            </div>

            {/* Secret Key Masked Display */}
            <div className="mt-4 pt-3.5 border-t border-gray-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-xs">
                <Lock className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-600 font-semibold">Sensitive Key:</span>
                <span className="font-mono text-gray-700 bg-white/80 px-2 py-0.5 rounded border text-[11px]">
                  {isConfigured ? '●●●●●●●●●●●● (Protected in Server Vault)' : 'No key detected'}
                </span>
              </div>

              {/* State Toggle Button */}
              <button
                type="button"
                id={`toggle-configured-btn-${gatewayMeta.id}`}
                onClick={() => setIsConfigured(!isConfigured)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isConfigured
                    ? 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/50'
                    : 'bg-amber-600 text-white hover:bg-amber-700 shadow-xs'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {isConfigured ? 'Change to Not Configured' : 'Mark as Credentials Configured'}
                </span>
              </button>
            </div>
          </div>

          {/* Public Identifier / Public Key (Safe, Non-sensitive) */}
          {gatewayMeta.publicIdentifierKey && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`public-id-${gatewayMeta.id}`}
                  className="text-xs font-bold text-gray-800 flex items-center space-x-1.5"
                >
                  <Key className="w-3.5 h-3.5 text-gray-500" />
                  <span>{gatewayMeta.publicIdentifierLabel}</span>
                </label>
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  Public / Non-sensitive
                </span>
              </div>
              <input
                id={`public-id-${gatewayMeta.id}`}
                type="text"
                value={publicIdentifier}
                onChange={(e) => setPublicIdentifier(e.target.value)}
                placeholder={gatewayMeta.publicIdentifierPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-mono focus:border-[#ff6452] focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
              />
              <p className="text-[11px] text-gray-500">
                Safe public identifier used by client-side checkout. Secret private keys remain hidden on the server.
              </p>
            </div>
          )}

          {/* Vault Security Note */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-xs text-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-slate-900">
                <Server className="w-3.5 h-3.5 text-[#ff6452]" />
                <span>Server-Side Secret Key Protection</span>
              </div>
              <button
                type="button"
                onClick={() => setShowVaultInfo(!showVaultInfo)}
                className="text-[11px] font-bold text-[#ff6452] hover:underline flex items-center space-x-1"
              >
                <HelpCircle className="w-3 h-3" />
                <span>{showVaultInfo ? 'Hide details' : 'Security details'}</span>
              </button>
            </div>
            {showVaultInfo && (
              <p className="text-[11px] text-slate-600 leading-relaxed pt-1 border-t border-slate-200">
                For bank-grade PCI-DSS compliance, private secret API keys (e.g.{' '}
                <code className="bg-slate-200/70 px-1 py-0.5 rounded font-mono text-slate-800">
                  {gatewayMeta.secretKeyEnvName}
                </code>
                ) are never typed into or displayed in the browser UI. They are configured securely as server environment secrets.
              </p>
            )}
          </div>

          {/* Quick Links */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <a
              href={gatewayMeta.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-[#ff6452] font-semibold hover:underline text-xs"
            >
              <span>{gatewayMeta.name} Developer Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={gatewayMeta.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-gray-500 hover:text-gray-800 text-xs"
            >
              <span>Merchant Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
            <button
              id={`cancel-config-${gatewayMeta.id}`}
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id={`save-config-${gatewayMeta.id}`}
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-[#ff6452] hover:bg-[#e05342] text-white text-xs font-bold shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

