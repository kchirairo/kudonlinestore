import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  CreditCard,
  Truck,
  PackageCheck,
  Tag,
  Smartphone,
  Save,
  Loader2,
} from 'lucide-react';
import { customerNotificationService } from '../services/customerNotificationService';
import { CustomerNotificationPreferences, UserProfile } from '../types';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSaved?: (prefs: CustomerNotificationPreferences) => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  user,
  onSaved,
}) => {
  const [prefs, setPrefs] = useState<CustomerNotificationPreferences>({
    user_id: user?.id || '',
    order_updates: true,
    payment_updates: true,
    shipping_updates: true,
    delivery_updates: true,
    promotions: false,
    email_notifications: true,
    push_notifications: false,
    in_app_notifications: true,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user?.id) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    customerNotificationService
      .getPreferences(user.id)
      .then((loaded) => {
        if (isMounted) {
          setPrefs(loaded);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[NotificationPreferencesModal] Error loading preferences:', err);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof CustomerNotificationPreferences) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handlePushToggle = async () => {
    if (!user?.id) return;

    if (prefs.push_notifications) {
      // Disabling push
      setPrefs((prev) => ({ ...prev, push_notifications: false }));
      setPushStatusMessage('Push notifications turned off for this account.');
      return;
    }

    setPushStatusMessage('Requesting device notification permission...');
    const result = await customerNotificationService.requestPushPermissionAndSubscribe(user.id);

    if (result.permission === 'granted') {
      setPrefs((prev) => ({ ...prev, push_notifications: true }));
      setPushStatusMessage('Push notifications enabled successfully!');
    } else {
      setPrefs((prev) => ({ ...prev, push_notifications: false }));
      setPushStatusMessage(result.error || 'Notification permission was not granted by your browser.');
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const res = await customerNotificationService.updatePreferences(user.id, prefs);
      if (res.success && res.data) {
        setSaveSuccess(true);
        if (onSaved) onSaved(res.data);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.error || 'Failed to save notification preferences.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unexpected error saving preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-[#ff6452] flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                Notification Preferences
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Choose how KUD Store keeps you informed
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#ff6452]" />
              <p className="text-xs">Loading preferences from Supabase...</p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Preferences saved successfully to Supabase!</span>
                </div>
              )}

              {/* Order & Payment Channels */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                  Transactional Alerts
                </h4>

                {/* Order Updates */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <ShoppingBag className="w-5 h-5 text-gray-700 dark:text-slate-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Order Creation & Updates</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        Get notified when orders are placed, processed, or status changes.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                    <input
                      type="checkbox"
                      checked={prefs.order_updates}
                      onChange={() => handleToggle('order_updates')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6452]" />
                  </label>
                </div>

                {/* Payment Updates */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-gray-700 dark:text-slate-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Yoco Payments & Invoices</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        Alerts for payment confirmation, incomplete attempts, or refunds.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                    <input
                      type="checkbox"
                      checked={prefs.payment_updates}
                      onChange={() => handleToggle('payment_updates')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6452]" />
                  </label>
                </div>

                {/* Shipping & Collection */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-gray-700 dark:text-slate-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Shipping & Collection</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        Courier tracking details and notifications when ready for collection.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                    <input
                      type="checkbox"
                      checked={prefs.shipping_updates}
                      onChange={() => handleToggle('shipping_updates')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6452]" />
                  </label>
                </div>

                {/* Delivery Completion */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <PackageCheck className="w-5 h-5 text-gray-700 dark:text-slate-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Delivery Confirmation</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        Final notification when your order has been safely delivered.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                    <input
                      type="checkbox"
                      checked={prefs.delivery_updates}
                      onChange={() => handleToggle('delivery_updates')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6452]" />
                  </label>
                </div>
              </div>

              {/* Delivery Channels */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                  Notification Channels
                </h4>

                {/* In-App Notifications */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-gray-700 dark:text-slate-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">In-App Notification Bell</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        Show unread count badges and popovers when browsing KUD Store.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                    <input
                      type="checkbox"
                      checked={prefs.in_app_notifications}
                      onChange={() => handleToggle('in_app_notifications')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6452]" />
                  </label>
                </div>

                {/* Push Notifications (Web & Android) */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-gray-700 dark:text-slate-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Push Notifications</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        Receive instant status alerts on your device even when not on the site.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handlePushToggle}
                    className={`ml-3 shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                      prefs.push_notifications
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-600 hover:bg-gray-50'
                    }`}
                  >
                    {prefs.push_notifications ? 'Enabled' : 'Enable'}
                  </button>
                </div>
                {pushStatusMessage && (
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 px-2 italic">
                    {pushStatusMessage}
                  </p>
                )}

                {/* Promotions & Offers */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <Tag className="w-5 h-5 text-gray-700 dark:text-slate-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Promotions & Vouchers</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        Occasional discount vouchers, promo codes, and special sales.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                    <input
                      type="checkbox"
                      checked={prefs.promotions}
                      onChange={() => handleToggle('promotions')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6452]" />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0 bg-gray-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-5 py-2 rounded-xl bg-[#ff6452] hover:bg-[#e05342] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
