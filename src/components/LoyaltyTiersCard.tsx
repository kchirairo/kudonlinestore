import React, { useState } from 'react';
import {
  Award,
  Crown,
  Sparkles,
  Shield,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Gift,
  Share2,
  Zap,
  Star,
  Info,
  Check,
  Flame,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { STORE_CONFIG } from '../constants/config';
import { LoyaltyTierInfo, LoyaltyTierLevel } from '../types';

export const LOYALTY_TIERS: LoyaltyTierInfo[] = [
  {
    level: 'Bronze',
    minReferrals: 0,
    maxReferrals: 2,
    rewardPerReferral: 50,
    multiplier: '1.0x',
    accentColor: '#b45309', // Amber-700 / Bronze
    description: 'Starting tier for all KUD Store brand advocates.',
    perks: [
      'R50 Reward voucher per successful referral',
      'Instant digital wallet cash conversion',
      'Standard coupon & discount stacking',
    ],
  },
  {
    level: 'Silver',
    minReferrals: 3,
    maxReferrals: 5,
    rewardPerReferral: 60,
    multiplier: '1.2x',
    accentColor: '#64748b', // Slate-500 / Silver
    description: 'Unlocked at 3 successful friend conversions.',
    perks: [
      'R60 (1.2x boost) reward per referral',
      'Free Priority Dispatch on all orders',
      'Exclusive 5% Birthday VIP Voucher',
      'Silver badge on community reviews',
    ],
  },
  {
    level: 'Gold',
    minReferrals: 6,
    maxReferrals: 9,
    rewardPerReferral: 75,
    multiplier: '1.5x',
    accentColor: '#d97706', // Amber-600 / Gold
    description: 'Unlocked at 6 successful friend conversions.',
    perks: [
      'R75 (1.5x boost) reward per referral',
      'Free Standard Shipping on all store orders',
      '10% Monthly VIP Exclusive Discount Voucher',
      'Priority 24/7 WhatsApp Customer Concierge',
    ],
  },
  {
    level: 'Platinum',
    minReferrals: 10,
    maxReferrals: null,
    rewardPerReferral: 100,
    multiplier: '2.0x',
    accentColor: '#7c3aed', // Violet-600 / Platinum
    description: 'Top VIP tier for 10+ referral ambassadors.',
    perks: [
      'R100 (2.0x DOUBLE boost) per referral',
      'Free Express Overnight Shipping always',
      '15% Quarterly VIP Store Gift Voucher',
      'Early access to limited product drops',
      'Dedicated personal account VIP manager',
    ],
  },
];

export function getLoyaltyTier(referralsCount: number): {
  currentTier: LoyaltyTierInfo;
  nextTier: LoyaltyTierInfo | null;
  progressPercent: number;
  referralsToNext: number;
  overallProgressPercent: number;
} {
  const count = Math.max(0, referralsCount);

  let currentTier = LOYALTY_TIERS[0];
  let nextTier: LoyaltyTierInfo | null = LOYALTY_TIERS[1];

  if (count >= 10) {
    currentTier = LOYALTY_TIERS[3];
    nextTier = null;
  } else if (count >= 6) {
    currentTier = LOYALTY_TIERS[2];
    nextTier = LOYALTY_TIERS[3];
  } else if (count >= 3) {
    currentTier = LOYALTY_TIERS[1];
    nextTier = LOYALTY_TIERS[2];
  } else {
    currentTier = LOYALTY_TIERS[0];
    nextTier = LOYALTY_TIERS[1];
  }

  // Progress within current tier range to next tier
  let progressPercent = 100;
  let referralsToNext = 0;

  if (nextTier) {
    const rangeStart = currentTier.minReferrals;
    const rangeEnd = nextTier.minReferrals;
    const currentProgressInRange = count - rangeStart;
    const totalRange = rangeEnd - rangeStart;
    progressPercent = Math.min(100, Math.max(0, Math.round((currentProgressInRange / totalRange) * 100)));
    referralsToNext = Math.max(0, rangeEnd - count);
  }

  // Overall journey progress (out of 10 for max tier Platinum)
  const overallProgressPercent = Math.min(100, Math.round((count / 10) * 100));

  return {
    currentTier,
    nextTier,
    progressPercent,
    referralsToNext,
    overallProgressPercent,
  };
}

interface LoyaltyTiersCardProps {
  referralsCount: number;
  expiringVouchersCount?: number;
  onInviteClick?: () => void;
  onRedeemClick?: () => void;
}

export const LoyaltyTiersCard: React.FC<LoyaltyTiersCardProps> = ({
  referralsCount = 3,
  expiringVouchersCount = 0,
  onInviteClick,
  onRedeemClick,
}) => {
  const [selectedTierDetail, setSelectedTierDetail] = useState<LoyaltyTierLevel | null>(null);

  const { currentTier, nextTier, progressPercent, referralsToNext, overallProgressPercent } =
    getLoyaltyTier(referralsCount);

  const getTierIcon = (level: LoyaltyTierLevel, className = 'w-5 h-5') => {
    switch (level) {
      case 'Bronze':
        return <Shield className={className} />;
      case 'Silver':
        return <Award className={className} />;
      case 'Gold':
        return <Crown className={className} />;
      case 'Platinum':
        return <Sparkles className={className} />;
    }
  };

  const getTierBadgeBg = (level: LoyaltyTierLevel) => {
    switch (level) {
      case 'Bronze':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60';
      case 'Silver':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700';
      case 'Gold':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60';
      case 'Platinum':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-900/60';
    }
  };

  return (
    <div
      id="loyalty-tiers-section"
      className="bg-white dark:bg-slate-900 rounded-[28px] p-6 sm:p-7 border border-gray-100 dark:border-slate-800 shadow-xs space-y-6 overflow-hidden relative"
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            {getTierIcon(currentTier.level, 'w-6 h-6')}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                Loyalty &amp; Reward Tiers
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${getTierBadgeBg(
                  currentTier.level
                )}`}
              >
                {currentTier.level} Tier ({currentTier.multiplier})
              </span>
              {expiringVouchersCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                  <Clock className="w-3 h-3" />
                  <span>{expiringVouchersCount} Reward Expiring Soon</span>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Earn higher reward multipliers and VIP perks with every friend referral conversion.
            </p>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2">
          {onInviteClick && (
            <button
              id="loyalty-invite-btn"
              type="button"
              onClick={onInviteClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#ecfdf5] hover:bg-[#d1fae5] dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-[#15803d] dark:text-emerald-400 text-xs font-extrabold rounded-full border border-emerald-200 dark:border-emerald-800/80 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Invite Friends</span>
            </button>
          )}

          {onRedeemClick && (
            <button
              id="loyalty-redeem-btn"
              type="button"
              onClick={onRedeemClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-extrabold rounded-full shadow-xs transition-colors cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Redeem</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Progress Status Box */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 via-gray-50/50 to-white dark:from-slate-800/80 dark:via-slate-800/40 dark:to-slate-900 border border-gray-200/80 dark:border-slate-700/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Total Referral Conversions:
              </span>
              <span className="text-base font-black text-gray-900 dark:text-white font-mono bg-white dark:bg-slate-700 px-2.5 py-0.5 rounded-lg border border-gray-200 dark:border-slate-600 shadow-2xs">
                {referralsCount} {referralsCount === 1 ? 'Friend' : 'Friends'}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-300">
              {nextTier ? (
                <>
                  Only <strong className="text-[#16a34a] dark:text-emerald-400">{referralsToNext} more {referralsToNext === 1 ? 'conversion' : 'conversions'}</strong> needed to reach <strong className="text-gray-900 dark:text-white">{nextTier.level} Tier</strong> ({nextTier.multiplier} booster + {STORE_CONFIG.STORE_CURRENCY}{nextTier.rewardPerReferral}/friend).
                </>
              ) : (
                <span className="text-[#16a34a] dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Crown className="w-4 h-4" />
                  Maximum Platinum VIP Tier achieved! You enjoy 2.0x top reward multiplier.
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-gray-200/90 dark:border-slate-700 shadow-2xs">
            <div className="text-right">
              <span className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase block">
                Current Rate
              </span>
              <span className="text-sm font-black text-[#16a34a] dark:text-emerald-400 font-mono">
                {STORE_CONFIG.STORE_CURRENCY}{currentTier.rewardPerReferral} / friend
              </span>
            </div>
            <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
        </div>

        {/* Multi-tier Interactive Progress Bar Component */}
        <div className="space-y-3 pt-2">
          {/* Progress Bar Track */}
          <div className="relative">
            {/* Background Bar */}
            <div className="w-full h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
              <div
                id="loyalty-progress-fill"
                className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-purple-600 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${Math.max(5, overallProgressPercent)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>

            {/* Milestones / Checkpoints on Progress Bar */}
            <div className="relative flex justify-between items-center -mt-2.5 px-0.5">
              {LOYALTY_TIERS.map((tier) => {
                const isPassed = referralsCount >= tier.minReferrals;
                const isCurrent = currentTier.level === tier.level;

                return (
                  <button
                    key={tier.level}
                    type="button"
                    onClick={() =>
                      setSelectedTierDetail(
                        selectedTierDetail === tier.level ? null : tier.level
                      )
                    }
                    className="flex flex-col items-center group cursor-pointer focus:outline-hidden"
                  >
                    {/* Node Dot */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all border-2 ${
                        isCurrent
                          ? 'bg-white dark:bg-slate-900 border-[#16a34a] text-[#16a34a] scale-110 shadow-md ring-4 ring-emerald-500/20'
                          : isPassed
                          ? 'bg-[#16a34a] border-[#16a34a] text-white shadow-xs'
                          : 'bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500'
                      }`}
                    >
                      {isPassed && !isCurrent ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        getTierIcon(tier.level, 'w-3 h-3')
                      )}
                    </div>

                    {/* Node Label Below */}
                    <span
                      className={`text-[10px] sm:text-xs font-black mt-1.5 transition-colors ${
                        isCurrent
                          ? 'text-[#16a34a] dark:text-emerald-400 font-extrabold'
                          : isPassed
                          ? 'text-gray-800 dark:text-slate-200'
                          : 'text-gray-400 dark:text-slate-500'
                      }`}
                    >
                      {tier.level}
                    </span>
                    <span className="text-[9px] text-gray-400 dark:text-slate-500 font-medium">
                      {tier.minReferrals === 0 ? '0' : `${tier.minReferrals}+`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress to Next Tier Subtext */}
          {nextTier && (
            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 pt-1">
              <span>
                Tier Progress: <strong>{progressPercent}%</strong> towards {nextTier.level}
              </span>
              <span>
                Goal: <strong>{nextTier.minReferrals} Friends</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tier Cards Breakdown & Perks Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>Tier Perks &amp; Rewards Comparison</span>
            <Info className="w-3.5 h-3.5 text-gray-400" />
          </label>
          <span className="text-[11px] text-gray-400 dark:text-slate-400">
            Click any tier to view perks
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {LOYALTY_TIERS.map((tier) => {
            const isCurrent = currentTier.level === tier.level;
            const isUnlocked = referralsCount >= tier.minReferrals;
            const isSelected = selectedTierDetail === tier.level;

            return (
              <div
                key={tier.level}
                onClick={() =>
                  setSelectedTierDetail(
                    selectedTierDetail === tier.level ? null : tier.level
                  )
                }
                className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  isCurrent
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-[#16a34a] dark:border-emerald-500 ring-2 ring-[#16a34a]/20 shadow-xs'
                    : isSelected
                    ? 'bg-gray-50 dark:bg-slate-800 border-gray-400 dark:border-slate-500 shadow-xs'
                    : 'bg-white dark:bg-slate-800/80 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                {/* Top Badge & Multiplier */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isCurrent
                            ? 'bg-[#16a34a] text-white shadow-2xs'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200'
                        }`}
                      >
                        {getTierIcon(tier.level, 'w-4 h-4')}
                      </div>
                      <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                        {tier.level}
                      </span>
                    </div>

                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 font-mono text-gray-800 dark:text-slate-200">
                      {tier.multiplier}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  {isCurrent ? (
                    <div className="inline-flex items-center gap-1 text-[10px] font-black text-[#15803d] dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full mb-2">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Current Active Tier</span>
                    </div>
                  ) : isUnlocked ? (
                    <span className="inline-block text-[10px] font-bold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-full mb-2">
                      Unlocked
                    </span>
                  ) : (
                    <span className="inline-block text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full mb-2">
                      Unlocks at {tier.minReferrals} friends
                    </span>
                  )}

                  {/* Reward Rate */}
                  <div className="my-1.5">
                    <span className="text-xs text-gray-500 dark:text-slate-400 block">
                      Reward Rate:
                    </span>
                    <span className="text-base font-black text-gray-900 dark:text-white font-mono">
                      {STORE_CONFIG.STORE_CURRENCY}{tier.rewardPerReferral}{' '}
                      <span className="text-[11px] font-normal text-gray-500">/ referral</span>
                    </span>
                  </div>
                </div>

                {/* Key Perks List */}
                <div className="pt-2 border-t border-gray-100 dark:border-slate-700/70 space-y-1.5 mt-2">
                  {tier.perks.slice(0, 2).map((perk, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px] text-gray-600 dark:text-slate-300">
                      <Check className="w-3 h-3 text-[#16a34a] shrink-0 mt-0.5 stroke-[2.5]" />
                      <span className="leading-tight">{perk}</span>
                    </div>
                  ))}
                  {tier.perks.length > 2 && (
                    <span className="text-[10px] text-[#16a34a] dark:text-emerald-400 font-semibold block pt-0.5">
                      +{tier.perks.length - 2} more VIP benefits
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded Perk Details Drawer if selected */}
      {selectedTierDetail && (
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 animate-in fade-in space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <span>Full {selectedTierDetail} Tier Benefits Checklist</span>
            </h4>
            <button
              type="button"
              onClick={() => setSelectedTierDetail(null)}
              className="text-[11px] text-gray-400 hover:text-gray-700 dark:hover:text-white font-medium cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {LOYALTY_TIERS.find((t) => t.level === selectedTierDetail)?.perks.map((perk, i) => (
              <div
                key={i}
                className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700/60 flex items-center gap-2 text-xs text-gray-700 dark:text-slate-300"
              >
                <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#16a34a] flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>{perk}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
