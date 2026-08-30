import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Mail,
  MessageSquare,
  Phone,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { adminService } from '../../services/adminService';
import { GeneralStoreSettings, InvoiceSettingsConfig } from '../../types';
import { STORE_CONFIG } from '../../constants/config';

export const AdminSupportSettingsWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { generalSettings, updateGeneralSettings, showToast } = useShop();

  const [heading, setHeading] = useState<string>('Need help with an order?');
  const [email, setEmail] = useState<string>(STORE_CONFIG.CONTACT_EMAIL);
  const [whatsapp, setWhatsapp] = useState<string>(STORE_CONFIG.WHATSAPP_SUPPORT);
  const [phone, setPhone] = useState<string>(STORE_CONFIG.CONTACT_PHONE);
  const [subtext, setSubtext] = useState<string>('');
  const [invoiceSupportNote, setInvoiceSupportNote] = useState<string>('');
  const [syncToInvoices, setSyncToInvoices] = useState<boolean>(true);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<'customer_dashboard' | 'invoice_receipt'>('customer_dashboard');

  // Load existing values from generalSettings & invoiceSettings
  useEffect(() => {
    if (generalSettings) {
      setHeading(generalSettings.supportHeading || 'Need help with an order?');
      setEmail(generalSettings.contactEmail || STORE_CONFIG.CONTACT_EMAIL);
      setWhatsapp(generalSettings.whatsappSupport || STORE_CONFIG.WHATSAPP_SUPPORT);
      setPhone(generalSettings.contactPhone || STORE_CONFIG.CONTACT_PHONE);
      setSubtext(
        generalSettings.supportSubtext ||
          'Contact KUD Store support for order tracking, updates, cancellations, or returns.'
      );
    }
  }, [generalSettings]);

  useEffect(() => {
    adminService
      .getInvoiceSettings()
      .then((inv) => {
        if (inv?.invoiceSupportNote) {
          setInvoiceSupportNote(inv.invoiceSupportNote);
        } else {
          setInvoiceSupportNote(
            'For order inquiries, billing questions or returns, contact support via email or WhatsApp.'
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleFieldChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setHasUnsavedChanges(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    try {
      const cleanEmail = email.trim();
      const cleanWhatsapp = whatsapp.trim();
      const cleanPhone = phone.trim();
      const cleanHeading = heading.trim() || 'Need help with an order?';
      const cleanSubtext = subtext.trim();

      if (!cleanEmail || !cleanEmail.includes('@')) {
        showToast('Please enter a valid support email address', 'error');
        setIsSaving(false);
        return;
      }

      if (!cleanWhatsapp || cleanWhatsapp.replace(/[^0-9]/g, '').length < 7) {
        showToast('Please enter a valid WhatsApp support number with country code (e.g. +27797648590)', 'error');
        setIsSaving(false);
        return;
      }

      // 1. Update General Settings
      const updatedGeneral: GeneralStoreSettings = {
        ...generalSettings,
        contactEmail: cleanEmail,
        contactPhone: cleanPhone,
        whatsappSupport: cleanWhatsapp,
        supportHeading: cleanHeading,
        supportSubtext: cleanSubtext,
        lastUpdated: new Date().toISOString(),
      };

      const res = await updateGeneralSettings(updatedGeneral);

      // 2. Optionally sync to Invoice Settings
      if (syncToInvoices) {
        try {
          const currentInv = await adminService.getInvoiceSettings();
          const updatedInv: InvoiceSettingsConfig = {
            ...currentInv,
            companyEmail: cleanEmail,
            companyPhone: cleanPhone,
            companyWhatsapp: cleanWhatsapp,
            whatsappSupport: cleanWhatsapp,
            invoiceSupportNote:
              invoiceSupportNote.trim() ||
              `For order inquiries or returns, contact ${cleanEmail} or WhatsApp ${cleanWhatsapp}`,
            lastUpdated: new Date().toISOString(),
          };
          await adminService.saveInvoiceSettings(updatedInv);
        } catch (invErr) {
          console.warn('Failed to sync invoice settings:', invErr);
        }
      }

      if (res.success) {
        setHasUnsavedChanges(false);
        showToast(
          'Support contact details updated! Changes take effect on Customer Dashboard & Invoices instantly.',
          'success'
        );
      } else {
        showToast(res.error || 'Failed to save support settings', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating support settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const cleanWhatsappDigits = whatsapp.replace(/[^0-9]/g, '');

  return (
    <div
      id="admin-support-settings-widget"
      className={`bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-gray-100 dark:border-slate-800 shadow-xs space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-2xs">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                Customer Support & "Need help with an order?" Customization
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Configure real-time support channels (Email & WhatsApp) displayed on customer account profiles, order trackers, and tax invoices.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[11px] font-bold rounded-xl border border-amber-200 dark:border-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Unsaved changes
            </span>
          )}
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-2xl bg-[#ff6452] hover:bg-[#ff4935] text-white text-xs font-black transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save & Apply Instantly</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Editable Form Fields (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-4">
          {/* Card Title Customization */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#ff6452]" />
                Support Card Title / Heading
              </span>
              <span className="text-[10px] text-gray-400">Appears on Customer Dashboard</span>
            </label>
            <input
              type="text"
              value={heading}
              onChange={(e) => handleFieldChange(setHeading, e.target.value)}
              placeholder="Need help with an order?"
              className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452] transition-all"
            />
          </div>

          {/* Email & WhatsApp Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Support Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Support Email Address</span>
                <span className="text-[10px] font-bold text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleFieldChange(setEmail, e.target.value)}
                  placeholder="support@kudstore.co.za"
                  className="w-full pl-3.5 pr-8 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <p className="text-[10px] text-gray-400">Target for customer support tickets and replies</p>
            </div>

            {/* WhatsApp Support Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp Support Number</span>
                <span className="text-[10px] font-bold text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => handleFieldChange(setWhatsapp, e.target.value)}
                  placeholder="+27797648590"
                  className="w-full pl-3.5 pr-8 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                />
              </div>
              <p className="text-[10px] text-gray-400">Include country code (e.g. +27 79 764 8590 for SA)</p>
            </div>
          </div>

          {/* Helpline Phone & Guidance Subtext */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contact Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-500" />
                <span>Support Telephone Helpline</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => handleFieldChange(setPhone, e.target.value)}
                placeholder="+27 (0)11 892 4000"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-400/20 focus:border-gray-400 transition-all"
              />
            </div>

            {/* Custom Subtext Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                Support Guidance Subtext (Optional)
              </label>
              <input
                type="text"
                value={subtext}
                onChange={(e) => handleFieldChange(setSubtext, e.target.value)}
                placeholder="Order tracking, cancellations, or returns"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-xs font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-400/20 focus:border-gray-400 transition-all"
              />
            </div>
          </div>

          {/* Sync to Tax Invoice & Receipt Details */}
          <div className="p-4 rounded-2xl bg-gray-50/90 dark:bg-slate-800/50 border border-gray-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Sync Support Details to Tax Invoices & Receipts</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Automatically print the updated email, WhatsApp, and support guidelines on PDF invoices and order receipts.
                </p>
              </div>

              <input
                type="checkbox"
                id="sync-to-invoices-checkbox"
                checked={syncToInvoices}
                onChange={(e) => handleFieldChange(setSyncToInvoices, e.target.checked)}
                className="w-4 h-4 text-[#ff6452] rounded-md border-gray-300 focus:ring-[#ff6452] cursor-pointer mt-0.5"
              />
            </div>

            {syncToInvoices && (
              <div className="space-y-1 pt-1 border-t border-gray-200 dark:border-slate-700">
                <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300">
                  Invoice / Receipt Support Footer Note
                </label>
                <input
                  type="text"
                  value={invoiceSupportNote}
                  onChange={(e) => handleFieldChange(setInvoiceSupportNote, e.target.value)}
                  placeholder="For order inquiries, billing questions or returns, contact support via email or WhatsApp."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-[#ff6452]"
                />
              </div>
            )}
          </div>
        </form>

        {/* Right Side: Live Interactive Customer Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-gray-700 dark:text-slate-300">
                <Eye className="w-4 h-4 text-[#ff6452]" />
                <span>Live Real-Time Preview</span>
              </div>

              {/* Preview Mode Switcher */}
              <div className="flex bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewTab('customer_dashboard')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    previewTab === 'customer_dashboard'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Customer Card
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('invoice_receipt')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    previewTab === 'invoice_receipt'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Receipt / Invoice
                </button>
              </div>
            </div>

            {/* Preview Box Container */}
            {previewTab === 'customer_dashboard' ? (
              <div className="bg-gradient-to-br from-blue-50 via-sky-50/60 to-indigo-50/70 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-800 rounded-2xl p-4 sm:p-5 border border-blue-200/80 dark:border-blue-900/50 shadow-2xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">
                    {heading || 'Need help with an order?'}
                  </h4>
                </div>

                <p className="text-[11px] text-gray-600 dark:text-slate-300 leading-relaxed">
                  Contact support at{' '}
                  <span className="font-bold text-blue-600 dark:text-blue-400 underline decoration-blue-300">
                    {email || 'support@kudstore.co.za'}
                  </span>{' '}
                  or WhatsApp{' '}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 underline decoration-emerald-300">
                    {whatsapp || '+27797648590'}
                  </span>
                  .
                </p>

                {subtext && (
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                    {subtext}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={`mailto:${email}?subject=Customer%20Support%20Inquiry`}
                    className="flex-1 py-1.5 px-3 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 text-[11px] font-bold rounded-xl border border-blue-200 dark:border-slate-700 shadow-2xs text-center flex items-center justify-center gap-1"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Email</span>
                  </a>
                  <a
                    href={`https://wa.me/${cleanWhatsappDigits}?text=Hi%20KUD%20Store%2C%20I%20need%20assistance`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-3 bg-emerald-600 text-white text-[11px] font-bold rounded-xl shadow-2xs text-center flex items-center justify-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-2xs space-y-3 text-xs font-mono">
                <div className="border-b border-gray-100 dark:border-slate-800 pb-2 text-[10px] text-gray-500 flex justify-between">
                  <span>TAX INVOICE HEADER</span>
                  <span className="text-emerald-600 font-bold">OFFICIAL</span>
                </div>
                <div className="space-y-1 text-[11px] text-gray-700 dark:text-slate-300">
                  <p className="font-bold text-gray-900 dark:text-white">KUD online store (Pty) Ltd</p>
                  <p className="text-gray-500 text-[10px]">
                    Email: <span className="text-blue-600">{email}</span> • Tel: {phone}
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]">
                    WhatsApp Support: {whatsapp}
                  </p>
                </div>
                <div className="border-t border-gray-100 dark:border-slate-800 pt-2 text-[10px] text-gray-500">
                  <p className="font-sans font-medium text-gray-700 dark:text-slate-300">
                    {invoiceSupportNote || 'For order inquiries, billing, or returns, contact support via email or WhatsApp.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Test Channel Links */}
          <div className="p-3 bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-gray-500 text-[11px]">Direct Link Check:</span>
            <div className="flex items-center gap-2">
              <a
                href={`mailto:${email}?subject=Test%20Admin%20Support`}
                className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>Test Email</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <span className="text-gray-300">•</span>
              <a
                href={`https://wa.me/${cleanWhatsappDigits}?text=Hi%2C%20testing%20WhatsApp%20support%20line`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>Test WhatsApp</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
