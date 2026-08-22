import React from 'react';
import {
  Settings,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
  CreditCard,
  Zap,
  Globe,
  Wallet,
  Activity,
  AlertTriangle,
  Lock,
  Radio,
} from 'lucide-react';
import { GatewayMetadata } from '../../constants/paymentGateways';
import { PaymentGatewayItem, PaymentGatewayMode, GatewayHealthItem } from '../../types';

interface PaymentGatewayCardProps {
  gateway: GatewayMetadata;
  config: PaymentGatewayItem;
  isSaving: boolean;
  healthItem?: GatewayHealthItem;
  isHealthChecking?: boolean;
  onToggleEnabled: (gatewayId: string, enabled: boolean) => void;
  onModeChange: (gateway: GatewayMetadata, targetMode: PaymentGatewayMode) => void;
  onOpenConfig: (gateway: GatewayMetadata) => void;
}

export const PaymentGatewayCard: React.FC<PaymentGatewayCardProps> = ({
  gateway,
  config,
  isSaving,
  healthItem,
  isHealthChecking = false,
  onToggleEnabled,
  onModeChange,
  onOpenConfig,
}) => {
  const isEnabled = config?.enabled ?? false;
  const currentMode = config?.mode ?? gateway.defaultMode;
  const isConfigured = config?.configured ?? false;
  const isLive = currentMode === 'live';

  const getCategoryIcon = () => {
    switch (gateway.category) {
      case 'card':
        return <CreditCard className="w-3.5 h-3.5" />;
      case 'eft':
        return <Zap className="w-3.5 h-3.5" />;
      case 'wallet':
        return <Wallet className="w-3.5 h-3.5" />;
      default:
        return <Globe className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      id={`gateway-card-${gateway.id}`}
      className={`relative bg-white rounded-3xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
        isEnabled
          ? isLive
            ? 'border-rose-200 shadow-sm hover:shadow-md ring-1 ring-rose-100'
            : 'border-blue-200 shadow-sm hover:shadow-md ring-1 ring-blue-100'
          : 'border-gray-200/80 shadow-xs hover:border-gray-300 opacity-90'
      }`}
    >
      {/* Header Bar Indicator */}
      <div
        className="h-1.5 w-full"
        style={{
          backgroundColor: isEnabled ? (isLive ? '#ff6452' : gateway.brandColor) : '#e5e7eb',
        }}
      />

      <div className="p-5 sm:p-6 space-y-5 flex-1 flex flex-col justify-between">
        {/* Top Info Row */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-3.5">
              {/* Branded Logo Square */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-sm shrink-0"
                style={{ backgroundColor: gateway.brandColor }}
              >
                {gateway.name.substring(0, 2).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-gray-900 text-base">{gateway.name}</h4>
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
                    {getCategoryIcon()}
                    <span>{gateway.badge}</span>
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{gateway.description}</p>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="shrink-0 pt-0.5">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id={`toggle-card-${gateway.id}`}
                  type="checkbox"
                  checked={isEnabled}
                  disabled={isSaving}
                  onChange={(e) => onToggleEnabled(gateway.id, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6452]"></div>
              </label>
            </div>
          </div>

          {/* Badges / Status Indicators */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Status Badge */}
            <span
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                isEnabled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              <span>{isEnabled ? 'Enabled' : 'Disabled'}</span>
            </span>

            {/* Mode Badge */}
            <span
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                isLive
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 font-extrabold'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}
            >
              <span>{isLive ? 'LIVE' : currentMode.toUpperCase()}</span>
            </span>

            {/* Configured Credentials Badge */}
            <span
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-semibold ${
                isConfigured
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {isConfigured ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Credentials configured</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Credentials not configured</span>
                </>
              )}
            </span>

            {/* Server-Side Health Verification Status Badge */}
            {isHealthChecking && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                <Activity className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Checking reachability...</span>
              </span>
            )}

            {!isHealthChecking && healthItem && (
              <span
                id={`health-indicator-${gateway.id}`}
                title={healthItem.message}
                className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                  healthItem.status === 'healthy'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : healthItem.status === 'warning'
                    ? 'bg-amber-50 text-amber-800 border border-amber-300'
                    : healthItem.status === 'unreachable'
                    ? 'bg-rose-50 text-rose-800 border border-rose-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                {healthItem.status === 'healthy' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Reachable ({healthItem.latencyMs ? `${healthItem.latencyMs}ms` : 'Online'})</span>
                  </>
                )}
                {healthItem.status === 'warning' && (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Warning: Action needed</span>
                  </>
                )}
                {healthItem.status === 'unreachable' && (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Endpoint unreachable</span>
                  </>
                )}
                {healthItem.status === 'not_configured' && (
                  <>
                    <Lock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span>Unverified (Not Configured)</span>
                  </>
                )}
              </span>
            )}
          </div>

          {/* Health Check Server Diagnostic Note */}
          {healthItem && !isHealthChecking && (
            <div
              className={`p-2.5 rounded-2xl text-[11px] leading-relaxed flex items-start space-x-2 ${
                healthItem.status === 'healthy'
                  ? 'bg-emerald-50/70 border border-emerald-100 text-emerald-900'
                  : healthItem.status === 'warning'
                  ? 'bg-amber-50/70 border border-amber-100 text-amber-900'
                  : healthItem.status === 'unreachable'
                  ? 'bg-rose-50/70 border border-rose-100 text-rose-900'
                  : 'bg-gray-50 border border-gray-200 text-gray-600'
              }`}
            >
              <Radio className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-70" />
              <div className="flex-1">
                <span className="font-bold">Server Verification: </span>
                <span>{healthItem.message}</span>
              </div>
            </div>
          )}

          {/* Feature Highlights */}
          <div className="pt-2">
            <div className="grid grid-cols-2 gap-1.5">
              {gateway.features.slice(0, 2).map((feat, idx) => (
                <div key={idx} className="text-[11px] text-gray-500 flex items-center space-x-1">
                  <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                  <span className="truncate">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions Row */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {/* Mode Switcher Buttons */}
          <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl">
            {gateway.supportedModes.map((sm) => (
              <button
                key={sm.value}
                id={`card-mode-${gateway.id}-${sm.value}`}
                type="button"
                onClick={() => onModeChange(gateway, sm.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  currentMode === sm.value
                    ? sm.value === 'live'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {sm.label.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Configure Modal Trigger */}
          <button
            id={`configure-btn-${gateway.id}`}
            type="button"
            onClick={() => onOpenConfig(gateway)}
            className="px-3.5 py-1.5 rounded-xl border border-gray-200 hover:border-[#ff6452] hover:bg-rose-50/50 text-xs font-bold text-gray-700 hover:text-[#ff6452] transition-all flex items-center space-x-1.5 shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configure</span>
          </button>
        </div>
      </div>
    </div>
  );
};
