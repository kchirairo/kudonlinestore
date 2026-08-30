import React, { useState, useEffect } from 'react';
import {
  Users,
  Gift,
  Tag,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { InviteFriendsModal } from './InviteFriendsModal';
import { useShop } from '../context/ShopContext';
import { referralService, getEffectiveCustomerReferralSettings } from '../services/referralService';
import { StoreReferralGlobalConfig, UserReferralRewardsState } from '../types';

interface CustomerReferralBannerProps {
  className?: string;
  onInviteClick?: () => void;
}

export const CustomerReferralBanner: React.FC<CustomerReferralBannerProps> = ({
  className = '',
  onInviteClick,
}) => {
  const { user } = useShop();
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [userRewards, setUserRewards] = useState<UserReferralRewardsState | null>(null);
  const [globalConfig, setGlobalConfig] = useState<StoreReferralGlobalConfig | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      try {
        const cfg = await referralService.getStoreReferralConfig();
        let rew: UserReferralRewardsState | null = null;
        if (user) {
          rew = await referralService.getUserRewards(user.id);
        }
        if (mounted) {
          setGlobalConfig(cfg);
          setUserRewards(rew);
          setIsLoaded(true);
        }
      } catch {
        if (mounted) setIsLoaded(true);
      }
    }
    loadSettings();
    return () => {
      mounted = false;
    };
  }, [user]);

  const effective = getEffectiveCustomerReferralSettings(userRewards, globalConfig);

  // If program is disabled or invite is hidden by admin or user is banned, hide banner
  if (isLoaded && (!effective.isProgramEnabled || effective.hideInvite || effective.isBanned)) {
    return null;
  }

  const handleOpenModal = () => {
    if (effective.hideInvite || effective.isBanned) return;
    if (onInviteClick) {
      onInviteClick();
    } else {
      setInternalModalOpen(true);
    }
  };

  return (
    <>
      {/* Modern Apple-inspired Minimalist Referral Banner */}
      <div
        id="customer-referral-banner"
        onClick={handleOpenModal}
        className={`w-full bg-white dark:bg-slate-900 rounded-[28px] border border-gray-100 dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-none p-5 sm:p-7 md:p-8 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:hover:border-slate-700 cursor-pointer ${className}`}
      >
        {/* Top Row: Icon + Headline/Subtext + Invite Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6">
          {/* Left: Custom Green Shopping Bag Icon with Heart & Typography */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            {/* Green Circular Badge with White Bag & Red Heart and Sparkles */}
            <div className="relative shrink-0 select-none">
              {/* Sparkle Ticks at Top-Left */}
              <div className="absolute -top-2 -left-2 text-[#16a34a] dark:text-[#22c55e]">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M5 2L3 6M2 9L0.5 9.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Sparkle Dot at Bottom-Left */}
              <div className="absolute -bottom-1 left-1.5 w-1.5 h-1.5 rounded-full bg-[#16a34a] dark:bg-[#22c55e]" />

              {/* Main Outer Soft Ring & Green Badge */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#ecfdf5] dark:bg-emerald-950/40 p-1 flex items-center justify-center shadow-xs">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#22c55e] to-[#15803d] flex items-center justify-center shadow-inner relative overflow-hidden">
                  {/* Shopping Bag SVG with Red Heart */}
                  <svg
                    className="w-9 h-9 sm:w-11 sm:h-11 drop-shadow-sm"
                    viewBox="0 0 44 44"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Shopping Bag Body */}
                    <path
                      d="M10 15C10 13.8954 10.8954 13 12 13H32C33.1046 13 34 13.8954 34 15L35.5 33C35.5 35.2091 33.7091 37 31.5 37H12.5C10.2909 37 8.5 35.2091 8.5 33L10 15Z"
                      fill="white"
                    />
                    {/* Bag Handle Loop Left */}
                    <path
                      d="M16 14V11C16 7.68629 18.6863 5 22 5C25.3137 5 28 7.68629 28 11V14"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Handle Attachment Rivets */}
                    <circle cx="16" cy="15" r="1.5" fill="#15803d" />
                    <circle cx="28" cy="15" r="1.5" fill="#15803d" />
                    {/* Vibrant Red Heart in Center */}
                    <path
                      d="M22 30.5L20.85 29.45C16.8 25.75 14 23.2 14 20C14 17.4 16 15.4 18.6 15.4C20.05 15.4 21.45 16.1 22 17.15C22.55 16.1 23.95 15.4 25.4 15.4C28 15.4 30 17.4 30 20C30 23.2 27.2 25.75 23.15 29.45L22 30.5Z"
                      fill="#ef4444"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Headline and Supporting Text */}
            <div className="space-y-0.5 min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                <span className="text-gray-900 dark:text-white">Share </span>
                <span className="text-[#16a34a] dark:text-[#22c55e]">the vibe!</span>
              </h2>
              <p className="text-xs sm:text-sm md:text-[15px] text-gray-500 dark:text-slate-400 font-normal leading-normal">
                Invite friends to KUD Store and shop together
              </p>
            </div>
          </div>

          {/* Right: Vibrant Red Pill Button */}
          <div className="sm:shrink-0">
            <button
              id="referral-invite-now-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenModal();
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-sm sm:text-base rounded-full shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/35 active:scale-[0.98] transition-all cursor-pointer select-none"
            >
              <span>Invite Now</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Divider / Spacer */}
        <div className="w-full h-px bg-gray-100 dark:bg-slate-800/80 my-4 sm:my-5" />

        {/* Bottom Section: Step Sequence + Safe & Secure Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
          {/* Step Sequence */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 md:gap-5 text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300">
            {/* Step 1: Invite friends */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#ecfdf5] dark:bg-emerald-950/60 text-[#16a34a] dark:text-[#22c55e] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <span className="font-semibold text-gray-800 dark:text-slate-200 text-xs sm:text-[13px] tracking-tight">
                Invite friends
              </span>
            </div>

            <div className="h-6 w-px bg-gray-200/80 dark:bg-slate-800 hidden sm:block" />

            {/* Step 2: They shop */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#ecfdf5] dark:bg-emerald-950/60 text-[#16a34a] dark:text-[#22c55e] flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4 text-[#16a34a] dark:text-[#22c55e]" />
              </div>
              <span className="font-semibold text-gray-800 dark:text-slate-200 text-xs sm:text-[13px] tracking-tight">
                They shop
              </span>
            </div>

            <div className="h-6 w-px bg-gray-200/80 dark:bg-slate-800 hidden sm:block" />

            {/* Step 3: You both save */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#ecfdf5] dark:bg-emerald-950/60 text-[#16a34a] dark:text-[#22c55e] flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4 text-[#16a34a] dark:text-[#22c55e]" />
              </div>
              <span className="font-semibold text-gray-800 dark:text-slate-200 text-xs sm:text-[13px] tracking-tight">
                You both save
              </span>
            </div>
          </div>

          {/* Right Badge: Safe & Secure */}
          <div className="self-start sm:self-auto">
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#ecfdf5] dark:bg-emerald-950/40 border border-[#d1fae5] dark:border-emerald-900/50">
              <ShieldCheck className="w-4 h-4 text-[#16a34a] dark:text-[#22c55e]" />
              <span className="text-xs sm:text-[13px] font-bold text-[#dc2626] dark:text-[#ef4444]">
                Safe & Secure
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Modal if not controlled by parent */}
      {!onInviteClick && (
        <InviteFriendsModal
          isOpen={internalModalOpen}
          onClose={() => setInternalModalOpen(false)}
        />
      )}
    </>
  );
};
