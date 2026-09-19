import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  MapPin,
  Mail,
  Building,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Save,
  Check,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { SA_PROVINCES } from '../constants/config';

interface CustomerProfileDetailsCardProps {
  className?: string;
}

export const CustomerProfileDetailsCard: React.FC<CustomerProfileDetailsCardProps> = ({
  className = '',
}) => {
  const { user, profile, updateUserProfile, showToast } = useShop();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [addressLine, setAddressLine] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [province, setProvince] = useState<string>('Gauteng');
  const [postalCode, setPostalCode] = useState<string>('');

  // Sync state when user or profile changes
  useEffect(() => {
    if (user && !isEditing) {
      const resolvedName = profile?.full_name ?? user.fullName ?? '';
      setFullName(resolvedName);
      setPhone(profile?.phone ?? user.phone ?? '');
      setAddressLine(user.addressLine || user.address || profile?.address_line || profile?.address || '');
      setCity(user.city || profile?.city || '');
      setProvince(user.province || profile?.province || 'Gauteng');
      setPostalCode(user.postalCode || profile?.postal_code || '');
    }
  }, [user, profile, isEditing]);

  const handleStartEdit = () => {
    if (user) {
      const resolvedName = profile?.full_name ?? user.fullName ?? '';
      setFullName(resolvedName);
      setPhone(profile?.phone ?? user.phone ?? '');
      setAddressLine(user.addressLine || user.address || profile?.address_line || profile?.address || '');
      setCity(user.city || profile?.city || '');
      setProvince(user.province || profile?.province || 'Gauteng');
      setPostalCode(user.postalCode || profile?.postal_code || '');
    }
    setFormError(null);
    setSaveSuccess(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (user) {
      const resolvedName = profile?.full_name ?? user.fullName ?? '';
      setFullName(resolvedName);
      setPhone(profile?.phone ?? user.phone ?? '');
      setAddressLine(user.addressLine || user.address || profile?.address_line || profile?.address || '');
      setCity(user.city || profile?.city || '');
      setProvince(user.province || profile?.province || 'Gauteng');
      setPostalCode(user.postalCode || profile?.postal_code || '');
    }
    setFormError(null);
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setFormError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setFormError('Please enter your full name.');
      return;
    }

    try {
      setIsSaving(true);
      const res = await updateUserProfile({
        fullName: trimmedName,
        phone: phone.trim(),
        addressLine: addressLine.trim(),
        address: addressLine.trim(),
        city: city.trim(),
        province: province.trim(),
        postalCode: postalCode.trim(),
      });

      if (res.success) {
        setSaveSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setFormError(res.error || 'Failed to update personal details. Please try again.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasDeliveryAddress = Boolean(
    (user?.addressLine || user?.address || profile?.address_line || profile?.address) &&
    (user?.city || profile?.city)
  );

  return (
    <div
      id="customer-personal-details-card"
      className={`bg-white dark:bg-slate-900 rounded-[28px] p-6 sm:p-7 border border-gray-100 dark:border-slate-800 shadow-xs space-y-6 transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-[#ff6452] text-white flex items-center justify-center shadow-md shadow-rose-500/20">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                Personal &amp; Contact Details
              </h2>
              {hasDeliveryAddress ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#15803d] dark:text-emerald-400 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Address Configured
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold tracking-wider uppercase">
                  Address Incomplete
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Manage your personal information, phone number, and default delivery address.
            </p>
          </div>
        </div>

        {!isEditing && (
          <button
            id="edit-customer-profile-btn"
            type="button"
            onClick={handleStartEdit}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-bold text-xs rounded-full transition-colors cursor-pointer self-start sm:self-center shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#ff6452]" />
            <span>Edit Details</span>
          </button>
        )}
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
          <span>Your personal and delivery details have been saved successfully!</span>
        </div>
      )}

      {/* Error Notification */}
      {formError && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl flex items-center gap-2.5 text-red-800 dark:text-red-300 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Read View */}
      {!isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Identity & Contact Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              <User className="w-4 h-4 text-[#ff6452]" />
              <span>Contact Information</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-gray-400 dark:text-slate-500 font-medium block text-[11px]">Full Name</span>
                <span className="font-bold text-gray-800 dark:text-slate-200 text-sm">
                  {profile?.full_name || user?.fullName || 'Not set'}
                </span>
              </div>

              <div>
                <span className="text-gray-400 dark:text-slate-500 font-medium block text-[11px]">Email Address</span>
                <span className="font-medium text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {user?.email || 'Not set'}
                </span>
              </div>

              <div>
                <span className="text-gray-400 dark:text-slate-500 font-medium block text-[11px]">Phone Number</span>
                <span className="font-medium text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {user?.phone || profile?.phone || (
                    <span className="text-gray-400 italic">No phone number added</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Address Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Primary Delivery Address</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-gray-400 dark:text-slate-500 font-medium block text-[11px]">Street / Building Address</span>
                <span className="font-medium text-gray-800 dark:text-slate-200 block">
                  {user?.addressLine || user?.address || profile?.address_line || profile?.address || (
                    <span className="text-gray-400 italic">No street address provided</span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-400 dark:text-slate-500 font-medium block text-[11px]">City / Suburb</span>
                  <span className="font-medium text-gray-700 dark:text-slate-300">
                    {user?.city || profile?.city || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-slate-500 font-medium block text-[11px]">Province</span>
                  <span className="font-medium text-gray-700 dark:text-slate-300">
                    {user?.province || profile?.province || 'Gauteng'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 dark:text-slate-500 font-medium block text-[11px]">Postal Code</span>
                <span className="font-mono font-medium text-gray-700 dark:text-slate-300">
                  {user?.postalCode || profile?.postal_code || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Form */
        <form onSubmit={handleSubmit} className="space-y-5 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label htmlFor="edit-profile-fullname" className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-profile-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sipho Dlamini"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-[#ff6452] outline-hidden transition-all"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label htmlFor="edit-profile-phone" className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                Phone Number (Mobile for SMS/WhatsApp Delivery Updates)
              </label>
              <input
                id="edit-profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +27 82 123 4567"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-[#ff6452] outline-hidden transition-all"
              />
            </div>

            {/* Address Line */}
            <div className="sm:col-span-2 space-y-1">
              <label htmlFor="edit-profile-address" className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                Street Address / Unit / Complex
              </label>
              <input
                id="edit-profile-address"
                type="text"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="e.g. 42 Nelson Mandela Ave, Sandton"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-[#ff6452] outline-hidden transition-all"
              />
            </div>

            {/* City */}
            <div className="space-y-1">
              <label htmlFor="edit-profile-city" className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-gray-400" />
                City / Town / Suburb
              </label>
              <input
                id="edit-profile-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Johannesburg"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-[#ff6452] outline-hidden transition-all"
              />
            </div>

            {/* Province & Postal Code */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="edit-profile-province" className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  Province
                </label>
                <select
                  id="edit-profile-province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-[#ff6452] outline-hidden transition-all"
                >
                  {SA_PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="edit-profile-postal" className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  Postal Code
                </label>
                <input
                  id="edit-profile-postal"
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g. 2196"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-[#ff6452] outline-hidden transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 rounded-full border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              id="save-customer-profile-btn"
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#ff6452] hover:bg-[#ff523d] text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Details</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
