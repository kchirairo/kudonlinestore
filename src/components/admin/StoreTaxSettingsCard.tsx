import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Check,
  AlertCircle,
  Percent,
  FileText,
  ShieldCheck,
  Save,
  RotateCcw,
  HelpCircle,
  Calculator,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useShop } from '../../context/ShopContext';
import { TaxSettings } from '../../types';

export const StoreTaxSettingsCard: React.FC = () => {
  const { showToast } = useShop();

  const [taxSettings, setTaxSettings] = useState<TaxSettings>({
    tax_enabled: false,
    tax_name: 'VAT',
    tax_rate: 15,
    show_tax_on_receipt: true,
    vat_registration_number: null,
  });

  const [initialSettings, setInitialSettings] = useState<TaxSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch persistent settings from Supabase database on mount
  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await adminService.getTaxSettings();
        if (isMounted) {
          const loaded: TaxSettings = {
            id: data.id,
            tax_enabled: Boolean(data.tax_enabled),
            tax_name: data.tax_name || 'VAT',
            tax_rate: data.tax_rate !== undefined && data.tax_rate !== null ? Number(data.tax_rate) : 15,
            show_tax_on_receipt: data.show_tax_on_receipt !== false,
            vat_registration_number: data.vat_registration_number || '',
          };
          setTaxSettings(loaded);
          setInitialSettings(loaded);
        }
      } catch (err: any) {
        if (isMounted) {
          const msg = err?.message || 'Failed to load VAT/TAX settings from database.';
          setErrorMessage(msg);
          showToast(msg, 'error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  const handleToggleTax = () => {
    setTaxSettings((prev) => ({
      ...prev,
      tax_enabled: !prev.tax_enabled,
    }));
    setSaveSuccessMessage(null);
  };

  const handleToggleReceiptDisplay = () => {
    setTaxSettings((prev) => ({
      ...prev,
      show_tax_on_receipt: !prev.show_tax_on_receipt,
    }));
    setSaveSuccessMessage(null);
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setTaxSettings((prev) => ({
      ...prev,
      tax_rate: isNaN(val) ? 0 : val,
    }));
    setSaveSuccessMessage(null);
  };

  const handleTextChange = (field: 'tax_name' | 'vat_registration_number', value: string) => {
    setTaxSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaveSuccessMessage(null);
  };

  const handleReset = () => {
    if (initialSettings) {
      setTaxSettings(initialSettings);
      setSaveSuccessMessage(null);
      setErrorMessage(null);
    }
  };

  // Save changes to Supabase
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccessMessage(null);

    // Validation
    if (taxSettings.tax_rate < 0 || taxSettings.tax_rate > 100) {
      const err = 'Tax rate must be between 0% and 100%.';
      setErrorMessage(err);
      showToast(err, 'error');
      setIsSaving(false);
      return;
    }

    if (!taxSettings.tax_name.trim()) {
      const err = 'Tax Name is required (e.g. VAT, GST, Tax).';
      setErrorMessage(err);
      showToast(err, 'error');
      setIsSaving(false);
      return;
    }

    try {
      const response = await adminService.saveTaxSettings({
        tax_enabled: taxSettings.tax_enabled,
        tax_name: taxSettings.tax_name.trim(),
        tax_rate: taxSettings.tax_rate,
        show_tax_on_receipt: taxSettings.show_tax_on_receipt,
        vat_registration_number: taxSettings.vat_registration_number?.trim() || null,
      });

      if (response.success && response.data) {
        const verified: TaxSettings = {
          id: response.data.id,
          tax_enabled: Boolean(response.data.tax_enabled),
          tax_name: response.data.tax_name || 'VAT',
          tax_rate: Number(response.data.tax_rate) || 0,
          show_tax_on_receipt: Boolean(response.data.show_tax_on_receipt),
          vat_registration_number: response.data.vat_registration_number || '',
        };
        setTaxSettings(verified);
        setInitialSettings(verified);
        setSaveSuccessMessage('VAT/TAX settings saved successfully.');
        showToast('VAT/TAX settings saved successfully.', 'success');
      } else {
        throw new Error(response.error || 'Failed to save VAT/TAX settings.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to save VAT/TAX settings to database.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      // Revert UI to previously verified database state on failure
      if (initialSettings) {
        setTaxSettings(initialSettings);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = initialSettings
    ? taxSettings.tax_enabled !== initialSettings.tax_enabled ||
      taxSettings.tax_name !== initialSettings.tax_name ||
      taxSettings.tax_rate !== initialSettings.tax_rate ||
      taxSettings.show_tax_on_receipt !== initialSettings.show_tax_on_receipt ||
      (taxSettings.vat_registration_number || '') !== (initialSettings.vat_registration_number || '')
    : false;

  // Real-time calculation preview
  const previewSubtotal = 1000;
  const previewDelivery = 100;
  const previewTax = taxSettings.tax_enabled
    ? Math.round(previewSubtotal * (taxSettings.tax_rate / 100) * 100) / 100
    : 0;
  const previewTotal = previewSubtotal + previewTax + previewDelivery;

  return (
    <div id="admin-tax-settings-card" className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#ff6452] flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">VAT & Sales Tax Configuration</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                taxSettings.tax_enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-gray-100 text-gray-500'
              }`}>
                {taxSettings.tax_enabled ? 'Tax Active' : 'Tax Disabled'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Control South African SARS VAT or custom jurisdiction sales taxes, invoice display rules, and tax snapshots.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              type="button"
              id="tax-settings-reset-btn"
              onClick={handleReset}
              disabled={isSaving || isLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>
          )}

          <button
            type="button"
            id="tax-settings-save-btn"
            onClick={() => handleSave()}
            disabled={isSaving || isLoading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#ff6452] hover:bg-[#ff523d] text-white shadow-md shadow-[#ff6452]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save VAT/TAX Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccessMessage && (
        <div id="tax-settings-success-alert" className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div id="tax-settings-error-alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#ff6452] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-gray-500">Connecting to store settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Main Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Control 1: Tax Enabled Toggle Switch */}
            <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-200/70 hover:border-gray-300 transition-all flex items-center justify-between gap-4">
              <div className="space-y-1">
                <label htmlFor="tax_enabled_switch" className="text-sm font-bold text-gray-900 block cursor-pointer">
                  VAT / TAX Enabled
                </label>
                <p className="text-xs text-gray-500">
                  {taxSettings.tax_enabled
                    ? 'Taxes are actively computed on eligible products and stored in order snapshots.'
                    : 'Taxes are disabled. Checkout and receipts will display 0 tax and hide the tax line.'}
                </p>
              </div>

              <button
                type="button"
                id="tax_enabled_switch"
                role="switch"
                aria-checked={taxSettings.tax_enabled}
                onClick={handleToggleTax}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-[#ff6452] focus:ring-offset-2 ${
                  taxSettings.tax_enabled ? 'bg-[#ff6452]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    taxSettings.tax_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Control 2: Show Tax on Receipt Toggle Switch */}
            <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-200/70 hover:border-gray-300 transition-all flex items-center justify-between gap-4">
              <div className="space-y-1">
                <label htmlFor="show_tax_receipt_switch" className="text-sm font-bold text-gray-900 block cursor-pointer">
                  Show Tax on Customer Receipt
                </label>
                <p className="text-xs text-gray-500">
                  {taxSettings.show_tax_on_receipt
                    ? 'Explicitly displays the VAT/TAX breakdown line on receipts and order summaries.'
                    : 'Hides the tax breakdown line on customer receipts while preserving total accuracy.'}
                </p>
              </div>

              <button
                type="button"
                id="show_tax_receipt_switch"
                role="switch"
                aria-checked={taxSettings.show_tax_on_receipt}
                onClick={handleToggleReceiptDisplay}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-[#ff6452] focus:ring-offset-2 ${
                  taxSettings.show_tax_on_receipt ? 'bg-[#ff6452]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    taxSettings.show_tax_on_receipt ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Configuration Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Control 3: Tax Name */}
            <div className="space-y-1.5">
              <label htmlFor="tax_name_input" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span>Tax Name</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                id="tax_name_input"
                name="tax_name"
                type="text"
                value={taxSettings.tax_name}
                onChange={(e) => handleTextChange('tax_name', e.target.value)}
                placeholder="VAT"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:border-[#ff6452] focus:ring-2 focus:ring-[#ff6452]/20 outline-hidden transition-all"
              />
              <p className="text-[11px] text-gray-400">
                Default: <strong className="text-gray-600">VAT</strong> (South Africa SARS standard).
              </p>
            </div>

            {/* Control 4: Tax Rate (%) */}
            <div className="space-y-1.5">
              <label htmlFor="tax_rate_input" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-gray-400" />
                <span>Tax Rate (%)</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="tax_rate_input"
                  name="tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={taxSettings.tax_rate}
                  onChange={handleRateChange}
                  placeholder="15"
                  className="w-full px-4 py-2.5 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:border-[#ff6452] focus:ring-2 focus:ring-[#ff6452]/20 outline-hidden transition-all"
                />
                <span className="absolute right-3 top-2.5 text-sm font-bold text-gray-400 pointer-events-none">%</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Default: <strong className="text-gray-600">15%</strong>. Must be between 0% and 100%.
              </p>
            </div>

            {/* Control 5: VAT Registration Number */}
            <div className="space-y-1.5">
              <label htmlFor="vat_reg_input" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                <span>VAT Registration Number</span>
                <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                id="vat_reg_input"
                name="vat_registration_number"
                type="text"
                value={taxSettings.vat_registration_number || ''}
                onChange={(e) => handleTextChange('vat_registration_number', e.target.value)}
                placeholder="e.g. 4920192841"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:border-[#ff6452] focus:ring-2 focus:ring-[#ff6452]/20 outline-hidden transition-all"
              />
              <p className="text-[11px] text-gray-400">
                SARS registration number printed on tax receipts and PDF invoices.
              </p>
            </div>
          </div>

          {/* Live Calculation Preview Card */}
          <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <Calculator className="w-4 h-4 text-amber-600" />
              <span>Live Checkout & Receipt Preview</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-600">
              <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200/40 space-y-1.5">
                <div className="flex justify-between">
                  <span>Cart Items Subtotal:</span>
                  <span className="font-bold text-gray-900">R{previewSubtotal.toFixed(2)}</span>
                </div>
                {taxSettings.tax_enabled ? (
                  <div className="flex justify-between text-amber-800 font-semibold">
                    <span>{taxSettings.tax_name || 'VAT'} ({taxSettings.tax_rate}%):</span>
                    <span>R{previewTax.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-gray-400 italic">
                    <span>Tax Line:</span>
                    <span>Disabled (R0.00)</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Courier Delivery:</span>
                  <span className="font-bold text-gray-900">R{previewDelivery.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-1.5 text-sm font-black text-gray-900">
                  <span>Grand Total:</span>
                  <span className="text-[#ff6452]">R{previewTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>How KUD Store Handles Taxes</span>
                </p>
                <p className="text-[11px] leading-relaxed text-amber-800/90">
                  • <strong>Single Source of Truth:</strong> Settings are persisted directly to <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px]">public.settings</code> in the cloud database.
                </p>
                <p className="text-[11px] leading-relaxed text-amber-800/90">
                  • <strong>Historical Order Snapshots:</strong> Each placed order permanently snapshots the active tax rate and amount into <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px]">public.orders</code>. Future tax changes will never alter past orders.
                </p>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
