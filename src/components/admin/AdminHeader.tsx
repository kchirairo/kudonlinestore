import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Store,
  ExternalLink,
  Shield,
  Upload,
  Trash2,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  UserCheck,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../ThemeToggle';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  title?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar, title }) => {
  const { user, updateAdminAvatar, removeAdminAvatar, showToast } = useShop();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP, etc.)', 'error');
      setAvatarError('Selected file must be an image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size exceeds 10MB limit. Please choose a smaller image.', 'error');
      setAvatarError('Image must be smaller than 10MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setAvatarError(null);
    setIsUploading(true);

    try {
      const result = await updateAdminAvatar(file);
      if (result.success) {
        setIsDropdownOpen(false);
      } else {
        setAvatarError(result.error || 'Failed to upload avatar.');
      }
    } catch (err: any) {
      setAvatarError(err.message || 'An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (isRemoving || isUploading) return;
    setAvatarError(null);
    setIsRemoving(true);

    try {
      const result = await removeAdminAvatar();
      if (result.success) {
        setIsDropdownOpen(false);
      } else {
        setAvatarError(result.error || 'Failed to remove avatar.');
      }
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to remove avatar.');
    } finally {
      setIsRemoving(false);
    }
  };

  const hasCustomAvatar = Boolean(user?.avatarUrl && user.avatarUrl.trim() !== '');

  return (
    <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 transition-colors duration-200">
      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={handleFileSelect}
        aria-label="Upload Admin Avatar"
      />

      {/* Left side: Mobile menu toggle + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {title && (
          <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
            {title}
          </h1>
        )}
      </div>

      {/* Right side: Theme Toggle, Store shortcut & Admin avatar profile widget */}
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />

        <button
          onClick={() => navigate('/')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Store className="w-3.5 h-3.5 text-[#ff6452]" />
          <span>View Store</span>
          <ExternalLink className="w-3 h-3 text-gray-400 dark:text-slate-400" />
        </button>

        {/* Admin Profile & Avatar Management Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            className={`flex items-center gap-2.5 bg-gray-50 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-800 p-1.5 pr-3 rounded-full border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#ff6452]/40 ${
              isDropdownOpen
                ? 'border-[#ff6452] shadow-xs'
                : 'border-gray-200/80 dark:border-slate-700'
            }`}
          >
            {/* Top-Right Avatar Display (Custom Image or Default 'K') */}
            <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[#ff6452] text-white flex items-center justify-center font-black text-sm uppercase shadow-xs">
              {isUploading || isRemoving ? (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
              ) : hasCustomAvatar ? (
                <img
                  src={user!.avatarUrl}
                  alt={user?.fullName || 'Admin'}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    // Fallback to default K if image fails loading
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="font-black tracking-tight text-white select-none">K</span>
              )}
            </div>

            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-gray-900 dark:text-white leading-none truncate max-w-[120px]">
                {user?.fullName || 'Administrator'}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-slate-400 font-medium mt-0.5">
                <Shield className="w-3 h-3 text-[#ff6452]" />
                <span>Admin Profile</span>
              </div>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 dark:text-slate-400 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180 text-[#ff6452]' : ''
              }`}
            />
          </button>

          {/* Dropdown Popover */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header Info */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-black text-gray-900 dark:text-white">
                  <Shield className="w-4 h-4 text-[#ff6452]" />
                  <span>Admin Avatar & Profile</span>
                </div>
                <button
                  onClick={() => setIsDropdownOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Avatar Preview Card */}
              <div className="my-4 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 flex items-center gap-3.5">
                <div className="relative group">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#ff6452] text-white flex items-center justify-center font-black text-2xl uppercase shadow-sm border-2 border-white dark:border-slate-700">
                    {hasCustomAvatar ? (
                      <img
                        src={user!.avatarUrl}
                        alt={user?.fullName || 'Admin'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-black text-white">K</span>
                    )}
                  </div>
                  {/* Camera overlay on preview to quickly trigger upload */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isRemoving}
                    title="Upload new image"
                    className="absolute inset-0 bg-black/40 text-white rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                    {user?.fullName || 'Administrator'}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-slate-400 truncate">
                    {user?.email || 'admin@kudstore.com'}
                  </p>
                  <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300">
                    {hasCustomAvatar ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Custom Photo</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff6452]" />
                        <span>Default "K" Avatar</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {avatarError && (
                <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 flex items-center gap-2 text-[11px] text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{avatarError}</span>
                </div>
              )}

              {/* Action Buttons: Add Avatar & Remove Avatar */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isRemoving}
                  className="w-full py-2.5 px-3.5 bg-[#ff6452] hover:bg-[#ff4935] disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white font-bold text-xs rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading to Supabase Storage...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>{hasCustomAvatar ? 'Change Avatar' : 'Add Avatar'}</span>
                    </>
                  )}
                </button>

                {hasCustomAvatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={isUploading || isRemoving}
                    className="w-full py-2.5 px-3.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 font-bold text-xs rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isRemoving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Removing Avatar...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Remove Avatar</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Info Note */}
              <p className="mt-3 text-[10px] text-gray-400 dark:text-slate-400 text-center leading-tight">
                {hasCustomAvatar
                  ? 'Saved permanently in Supabase Storage. Click "Remove Avatar" to restore default "K".'
                  : 'Upload JPG, PNG, or WebP up to 10MB to replace default "K" avatar.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

