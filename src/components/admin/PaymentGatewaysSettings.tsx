import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Lock,
  ExternalLink,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Activity,
  Server,
} from 'lucide-react';
import { SUPPORTED_PAYMENT_GATEWAYS, GatewayMetadata, DEFAULT_PAYMENT_GATEWAYS } from '../../constants/paymentGateways';
import { PaymentGatewaysMap, PaymentGatewayItem, PaymentGatewayMode, GatewayHealthCheckReport } from '../../types';
import { adminService } from '../../services/adminService';
import { useShop } from '../../context/ShopContext';
import { PaymentGatewayCard } from './PaymentGatewayCard';
import { PaymentGatewayConfigModal } from './PaymentGatewayConfigModal';
import { LiveModeConfirmModal } from './LiveModeConfirmModal';

export const PaymentGatewaysSettings: React.FC = () => {
  const { showToast } = useShop();

  const [gatewaysMap, setGatewaysMap] = useState<PaymentGatewaysMap>(DEFAULT_PAYMENT_GATEWAYS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'enabled' | 'configured' | 'live' | 'test'>('all');

  // Health check states
  const [isHealthChecking, setIsHealthChecking] = useState<boolean>(false);
  const [healthReport, setHealthReport] = useState<GatewayHealthCheckReport | null>(null);

  // Modal states
  const [activeConfigGateway, setActiveConfigGateway] = useState<GatewayMetadata | null>(null);
  const [liveConfirmGateway, setLiveConfirmGateway] = useState<GatewayMetadata | null>(null);
  const [pendingLiveMode, setPendingLiveMode] = useState<PaymentGatewayMode>('live');

  // Load from public.settings.settings_data.payment_gateways
  const loadGateways = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getPaymentGateways();
      if (data) {
        setGatewaysMap(data);
      }
    } catch (err: any) {
      console.error('Failed to load payment gateways:', err);
      showToast('Failed to load payment gateways from Supabase', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadGateways();
  }, [loadGateways]);

  // Server-side verification request
  const handleRunHealthCheck = async () => {
    setIsHealthChecking(true);
    try {
      const report = await adminService.runPaymentGatewaysHealthCheck();
      setHealthReport(report);

      if (report.unreachableCount > 0) {
        showToast(
          `Health check: ${report.unreachableCount} gateway endpoint(s) unreachable.`,
          'error'
        );
      } else if (report.warningCount > 0) {
        showToast(
          `Health check complete: ${report.healthyCount} verified operational, ${report.warningCount} notices.`,
          'info'
        );
      } else {
        showToast(
          `Health check passed! All ${report.healthyCount} verified gateways are online and operational.`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('Health check error:', err);
      showToast('Failed to complete server-side verification request', 'error');
    } finally {
      setIsHealthChecking(false);
    }
  };

  // Handle single gateway enable/disable toggle
  const handleToggleEnabled = async (gatewayId: string, newEnabled: boolean) => {
    const currentItem = gatewaysMap[gatewayId] || DEFAULT_PAYMENT_GATEWAYS[gatewayId]!;
    const updatedItem = { ...currentItem, enabled: newEnabled };

    // Optimistic UI update
    setGatewaysMap((prev) => ({
      ...prev,
      [gatewayId]: updatedItem,
    }));

    setIsSaving(true);
    try {
      const res = await adminService.savePaymentGateway(gatewayId, { enabled: newEnabled });
      if (res.success && res.data) {
        showToast(
          `${res.data.name || gatewayId} ${newEnabled ? 'enabled' : 'disabled'} successfully`,
          'success'
        );
      } else {
        showToast(res.error || 'Failed to update gateway status', 'error');
        // Rollback
        loadGateways();
      }
    } catch (err: any) {
      showToast('Error saving gateway setting to database', 'error');
      loadGateways();
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Mode Change (Trigger Live Confirmation if transitioning to Live)
  const handleModeChange = (gatewayMeta: GatewayMetadata, targetMode: PaymentGatewayMode) => {
    const currentItem = gatewaysMap[gatewayMeta.id] || DEFAULT_PAYMENT_GATEWAYS[gatewayMeta.id]!;
    if (targetMode === 'live' && currentItem.mode !== 'live') {
      setLiveConfirmGateway(gatewayMeta);
      setPendingLiveMode('live');
    } else {
      applyModeChange(gatewayMeta.id, targetMode);
    }
  };

  const applyModeChange = async (gatewayId: string, targetMode: PaymentGatewayMode) => {
    const currentItem = gatewaysMap[gatewayId] || DEFAULT_PAYMENT_GATEWAYS[gatewayId]!;
    const updatedItem = { ...currentItem, mode: targetMode };

    setGatewaysMap((prev) => ({
      ...prev,
      [gatewayId]: updatedItem,
    }));

    setIsSaving(true);
    try {
      const res = await adminService.savePaymentGateway(gatewayId, { mode: targetMode });
      if (res.success && res.data) {
        showToast(
          `${res.data.name || gatewayId} switched to ${targetMode.toUpperCase()} mode`,
          targetMode === 'live' ? 'info' : 'success'
        );
      } else {
        showToast(res.error || 'Failed to update gateway mode', 'error');
        loadGateways();
      }
    } catch {
      showToast('Error saving gateway mode', 'error');
      loadGateways();
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Switch to Live Mode
  const handleConfirmLiveMode = async () => {
    if (liveConfirmGateway) {
      const gId = liveConfirmGateway.id;
      setLiveConfirmGateway(null);
      await applyModeChange(gId, pendingLiveMode);
    }
  };

  // Modal Save Handler
  const handleSaveModalConfig = async (gatewayId: string, updated: Partial<PaymentGatewayItem>) => {
    const res = await adminService.savePaymentGateway(gatewayId, updated);
    if (res.success && res.data) {
      setGatewaysMap((prev) => ({
        ...prev,
        [gatewayId]: res.data!,
      }));
      showToast(`${res.data.name || gatewayId} settings saved successfully!`, 'success');
    } else {
      showToast(res.error || 'Failed to save gateway configuration', 'error');
      throw new Error(res.error || 'Save failed');
    }
  };

  // Filtered gateways list
  const filteredGateways = SUPPORTED_PAYMENT_GATEWAYS.filter((meta) => {
    const config = gatewaysMap[meta.id] || DEFAULT_PAYMENT_GATEWAYS[meta.id]!;
    
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = meta.name.toLowerCase().includes(q);
      const matchDesc = meta.description.toLowerCase().includes(q);
      const matchBadge = meta.badge.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchBadge) return false;
    }

    // Filter mode match
    if (filterMode === 'enabled') {
      return config.enabled;
    }
    if (filterMode === 'configured') {
      return config.configured;
    }
    if (filterMode === 'live') {
      return config.mode === 'live';
    }
    if (filterMode === 'test') {
      return config.mode !== 'live';
    }

    return true;
  });

  // Calculate statistics
  const totalSupported = SUPPORTED_PAYMENT_GATEWAYS.length;
  const enabledCount = SUPPORTED_PAYMENT_GATEWAYS.filter(
    (g) => gatewaysMap[g.id]?.enabled
  ).length;
  const liveCount = SUPPORTED_PAYMENT_GATEWAYS.filter(
    (g) => gatewaysMap[g.id]?.enabled && gatewaysMap[g.id]?.mode === 'live'
  ).length;

  return (
    <div id="payment-gateways-settings-container" className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#ff6452] flex items-center justify-center shadow-xs">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Payment Gateways</h2>
              <p className="text-xs text-gray-500 font-medium">
                Manage online card, EFT, and wallet payment providers in Supabase
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
            Configure payment methods for your KUD Store checkout. All settings persist inside{' '}
            <code className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-800 text-xs font-mono font-semibold">
              public.settings.settings_data.payment_gateways
            </code>
            .
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          {/* Run Health Check Button */}
          <button
            id="run-health-check-btn"
            type="button"
            onClick={handleRunHealthCheck}
            disabled={isHealthChecking || isLoading}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white text-sm font-bold shadow-xs hover:shadow-md transition-all flex items-center space-x-2 disabled:opacity-60 cursor-pointer"
          >
            <Activity className={`w-4 h-4 text-emerald-400 ${isHealthChecking ? 'animate-spin' : ''}`} />
            <span>{isHealthChecking ? 'Verifying Gateways...' : 'Run Health Check'}</span>
          </button>

          {/* Reload Settings Button */}
          <button
            id="refresh-gateways-btn"
            type="button"
            onClick={loadGateways}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold text-gray-700 transition-colors flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Reloading...' : 'Reload Settings'}</span>
          </button>
        </div>
      </div>

      {/* Health Check Results Report Dashboard (Shown when report exists or running) */}
      {(healthReport || isHealthChecking) && (
        <div
          id="health-check-results-panel"
          className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-200/80 shadow-xs space-y-4 relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                  isHealthChecking
                    ? 'bg-blue-50 text-blue-600'
                    : healthReport?.unreachableCount
                    ? 'bg-rose-50 text-rose-600'
                    : healthReport?.warningCount
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {isHealthChecking ? (
                  <Activity className="w-5 h-5 animate-spin" />
                ) : (
                  <Server className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-gray-900 text-base">Server-Side Gateway Verification Report</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Live Server Ping
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {isHealthChecking
                    ? 'Executing server-side reachability checks, latency diagnostics, and credential format validations...'
                    : `Verified ${healthReport?.totalChecked || 0} providers at ${new Date(
                        healthReport?.timestamp || ''
                      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.`}
                </p>
              </div>
            </div>

            {!isHealthChecking && (
              <button
                type="button"
                onClick={handleRunHealthCheck}
                className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                <span>Re-verify</span>
              </button>
            )}
          </div>

          {/* Quick Metrics Bar */}
          {healthReport && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Healthy & Reachable</span>
                <div className="text-xl font-black text-emerald-800">{healthReport.healthyCount} Verified</div>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending / Action Needed</span>
                <div className="text-xl font-black text-amber-800">{healthReport.warningCount} Notice</div>
              </div>

              <div className="p-3.5 bg-rose-50/70 border border-rose-200/60 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Unreachable Endpoints</span>
                <div className="text-xl font-black text-rose-800">{healthReport.unreachableCount} Down</div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Vault Security</span>
                <div className="text-xl font-black text-slate-800">Protected</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overview Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Available Gateways</span>
            <div className="text-2xl font-black text-gray-900">{totalSupported} Providers</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active at Checkout</span>
            <div className="text-2xl font-black text-emerald-600">{enabledCount} Active</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live Production Gateways</span>
            <div className="text-2xl font-black text-[#ff6452]">{liveCount} Live</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#ff6452] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Bank-Grade Security & Architecture Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-gray-900 text-white rounded-3xl p-6 sm:p-7 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-rose-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold tracking-wider uppercase border border-emerald-500/30 flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>Zero Private Key Exposure</span>
              </div>
              <span className="text-xs text-gray-400">PCI-DSS Compliant Storage</span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Secret API Keys are Isolated in Server-Side Supabase Secrets
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              In accordance with security requirements, secret keys (such as <code className="text-rose-300 font-mono">YOCO_SECRET_KEY</code>) are NEVER stored in public database tables or frontend bundles. The database holds only public identifiers and mode settings, while charges are authorized securely via server-side Edge Functions.
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-2">
            <a
              href="https://supabase.com/docs/guides/functions/secrets"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors flex items-center space-x-1.5 border border-white/10"
            >
              <span>Edge Secrets Guide</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="gateway-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gateways..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:border-[#ff6452] focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'All Gateways' },
              { id: 'enabled', label: 'Active Only' },
              { id: 'configured', label: 'Credentials Configured' },
              { id: 'live', label: 'Live Mode' },
              { id: 'test', label: 'Test / Sandbox' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              id={`filter-pill-${f.id}`}
              type="button"
              onClick={() => setFilterMode(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterMode === f.id
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gateways Grid */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-gray-100">
          <RefreshCw className="w-8 h-8 text-[#ff6452] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-gray-500">Loading payment gateways from Supabase...</p>
        </div>
      ) : filteredGateways.length === 0 ? (
        <div className="py-12 text-center space-y-3 bg-white rounded-3xl border border-gray-100">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
          <h4 className="font-bold text-gray-800">No payment gateways match your filter</h4>
          <p className="text-xs text-gray-500">Try changing your search term or filter selection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGateways.map((meta) => {
            const config = gatewaysMap[meta.id] || DEFAULT_PAYMENT_GATEWAYS[meta.id]!;
            const healthItem = healthReport?.results[meta.id];
            return (
              <PaymentGatewayCard
                key={meta.id}
                gateway={meta}
                config={config}
                isSaving={isSaving}
                healthItem={healthItem}
                isHealthChecking={isHealthChecking}
                onToggleEnabled={handleToggleEnabled}
                onModeChange={handleModeChange}
                onOpenConfig={(g) => setActiveConfigGateway(g)}
              />
            );
          })}
        </div>
      )}

      {/* Extensibility & Custom Gateway Architecture Note */}
      <div className="bg-gray-50 border border-gray-200/80 rounded-3xl p-6 text-xs text-gray-600 space-y-3">
        <div className="flex items-center space-x-2 font-bold text-gray-900 text-sm">
          <HelpCircle className="w-4 h-4 text-[#ff6452]" />
          <span>Extensible Multi-Gateway Architecture</span>
        </div>
        <p className="leading-relaxed">
          The payment gateway engine is configured dynamically via the React gateway registry in{' '}
          <code className="px-1 py-0.5 rounded bg-gray-200/70 font-mono text-gray-800">
            src/constants/paymentGateways.ts
          </code>
          . To add additional South African or international payment gateways (e.g. SnapScan, Zapper, Stripe, Stitch), simply register the gateway metadata. The system will automatically store and manage settings under{' '}
          <code className="px-1 py-0.5 rounded bg-gray-200/70 font-mono text-gray-800">
            public.settings.settings_data.payment_gateways[gatewayId]
          </code>{' '}
          without requiring PostgreSQL table alterations.
        </p>
      </div>

      {/* Modals */}
      <PaymentGatewayConfigModal
        isOpen={!!activeConfigGateway}
        gatewayMeta={activeConfigGateway}
        currentConfig={activeConfigGateway ? gatewaysMap[activeConfigGateway.id] || DEFAULT_PAYMENT_GATEWAYS[activeConfigGateway.id]! : null}
        onClose={() => setActiveConfigGateway(null)}
        onSave={handleSaveModalConfig}
        onTriggerLiveConfirm={(meta, pendingMode) => {
          setLiveConfirmGateway(meta);
          setPendingLiveMode(pendingMode);
        }}
      />

      <LiveModeConfirmModal
        isOpen={!!liveConfirmGateway}
        gateway={liveConfirmGateway}
        onConfirm={handleConfirmLiveMode}
        onCancel={() => setLiveConfirmGateway(null)}
      />
    </div>
  );
};
