import React, { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Download,
  Building,
  Mail,
  Phone,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { InvoiceSettingsConfig } from '../../types';
import { DEFAULT_INVOICE_SETTINGS } from '../../constants/config';
import { useShop } from '../../context/ShopContext';

export const InvoiceSettingsConfigCard: React.FC = () => {
  const { showToast } = useShop();
  const [settings, setSettings] = useState<InvoiceSettingsConfig>(DEFAULT_INVOICE_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    adminService
      .getInvoiceSettings()
      .then((data) => {
        setSettings(data);
      })
      .catch((err) => {
        console.error('Error fetching invoice settings:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await adminService.saveInvoiceSettings(settings);
      if (res.success) {
        showToast('Invoice & receipt configuration saved', 'success');
      } else {
        showToast(res.error || 'Failed to save invoice settings', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving invoice settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800">
        <RefreshCw className="w-6 h-6 text-[#ff6452] animate-spin mx-auto mb-2" />
        <p className="text-xs text-gray-500">Loading invoice configuration...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-[#ff6452] flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                Tax Invoice & Receipt Automation
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Configure automatic email dispatch, customer self-service download permissions, and SARS tax profile.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-2xl bg-[#ff6452] hover:bg-[#ff523d] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Invoice Settings</span>
              </>
            )}
          </button>
        </div>

        {/* Global Dispatch Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Auto-Send Toggle */}
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-extrabold text-gray-900 dark:text-white">Auto-Send Invoices</h4>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                When enabled, the system automatically dispatches the official tax invoice PDF and summary directly to the customer's email upon confirmed paid status.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, autoSendInvoices: !prev.autoSendInvoices }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.autoSendInvoices ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  settings.autoSendInvoices ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Customer Receipt Download Toggle */}
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-extrabold text-gray-900 dark:text-white">Customer Receipt Download</h4>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                When enabled, customers can download their PDF tax invoice from the Order Details page. When disabled, the download option is hidden.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, allowCustomerDownload: !prev.allowCustomerDownload }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.allowCustomerDownload ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  settings.allowCustomerDownload ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Company Tax Profile & Prefix */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#ff6452]" />
            <span>Tax Invoice Details & Prefix</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                placeholder="INV-2026-"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452]"
              />
              <p className="text-[10px] text-gray-400 mt-1">Example generated number: <strong className="font-mono text-gray-600 dark:text-slate-300">{settings.invoicePrefix}100245</strong></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                SARS VAT Registration Number
              </label>
              <input
                type="text"
                value={settings.vatNumber}
                onChange={(e) => setSettings({ ...settings, vatNumber: e.target.value })}
                placeholder="4920192841"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452]"
              />
              <p className="text-[10px] text-gray-400 mt-1">Official 10-digit VAT registration number printed on tax documents</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Company Legal Name
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                placeholder="KUD Store (Pty) Ltd"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Billing Support Email
              </label>
              <input
                type="email"
                value={settings.companyEmail}
                onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                placeholder="billing@kudstore.com"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Support Telephone Number
              </label>
              <input
                type="text"
                value={settings.companyPhone || ''}
                onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                placeholder="+27 (0)11 892 4000"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Support WhatsApp Number
              </label>
              <input
                type="text"
                value={settings.whatsappSupport || settings.companyWhatsapp || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    whatsappSupport: e.target.value,
                    companyWhatsapp: e.target.value,
                  })
                }
                placeholder="+27797648590"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Company Registered Legal Address
              </label>
              <input
                type="text"
                value={settings.companyAddress}
                onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                placeholder="124 Main Street, Sandton, Johannesburg, 2196, South Africa"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Invoice / Receipt Support & Compliance Note
              </label>
              <input
                type="text"
                value={settings.invoiceSupportNote || settings.invoiceFooterNote || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    invoiceSupportNote: e.target.value,
                    invoiceFooterNote: e.target.value,
                  })
                }
                placeholder="For order inquiries, billing questions or returns, contact support via email or WhatsApp."
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452]"
              />
              <p className="text-[10px] text-gray-400 mt-1">Printed on customer PDF tax invoices and order receipts</p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
