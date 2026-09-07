import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { safeGetItem, safeSetItem } from '../utils/storage';
import {
  RedemptionType,
  ReferralRewardRedemption,
  UserReferralRewardsState,
  StoreReferralGlobalConfig,
  Coupon,
  ReferralLeaderboardUser,
  LeaderboardTimeframe,
  LoyaltyTierLevel,
  ReferralCommissionRecord,
} from '../types';
import { adminService } from './adminService';


const USER_REWARDS_STORAGE_PREFIX = 'kud_store_user_rewards_';

export interface ExpiryStatus {
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  formattedExpiry: string;
  badgeLabel: string;
  badgeColorClass: string;
}

export function getVoucherExpiryStatus(expiryIso?: string): ExpiryStatus {
  if (!expiryIso) {
    return {
      isExpired: false,
      isExpiringSoon: false,
      daysRemaining: 999,
      hoursRemaining: 9999,
      formattedExpiry: 'No Expiry',
      badgeLabel: 'ACTIVE',
      badgeColorClass: 'bg-[#16a34a] text-white',
    };
  }

  const expiryTime = new Date(expiryIso).getTime();
  const now = Date.now();
  const diffMs = expiryTime - now;

  const dateObj = new Date(expiryIso);
  const formattedExpiry = dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (diffMs <= 0) {
    return {
      isExpired: true,
      isExpiringSoon: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      formattedExpiry,
      badgeLabel: 'EXPIRED',
      badgeColorClass: 'bg-red-500 text-white',
    };
  }

  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.ceil(diffMs / (1000 * 60 * 60));

  if (daysRemaining <= 3) {
    return {
      isExpired: false,
      isExpiringSoon: true,
      daysRemaining,
      hoursRemaining,
      formattedExpiry,
      badgeLabel: daysRemaining === 1 ? 'Expires in 24h!' : `Expires in ${daysRemaining} days!`,
      badgeColorClass: 'bg-red-600 text-white animate-pulse shadow-xs',
    };
  }

  if (daysRemaining <= 7) {
    return {
      isExpired: false,
      isExpiringSoon: true,
      daysRemaining,
      hoursRemaining,
      formattedExpiry,
      badgeLabel: `Expires in ${daysRemaining} days`,
      badgeColorClass: 'bg-amber-500 text-white',
    };
  }

  return {
    isExpired: false,
    isExpiringSoon: false,
    daysRemaining,
    hoursRemaining,
    formattedExpiry,
    badgeLabel: `Valid until ${formattedExpiry}`,
    badgeColorClass: 'bg-[#16a34a] text-white',
  };
}

export const DEFAULT_INITIAL_USER_REWARDS: Omit<UserReferralRewardsState, 'userId'> = {
  referralBalance: 0,
  totalEarned: 0,
  walletBalance: 0,
  successfulReferralsCount: 0,
  pendingReferralsCount: 0,
  vouchers: [],
  history: [],
  referral_rewards_enabled: false,
  referralRewardsEnabled: false,
};

export interface EffectiveCustomerReferralSettings {
  isProgramEnabled: boolean;
  referral_rewards_enabled: boolean;
  isBanned: boolean;
  banReason?: string;
  isEarningsFrozen: boolean;
  frozenReason?: string;
  frozenAt?: string;
  hideEarnings: boolean;
  hideInvite: boolean;
  hideReferralWallet: boolean;
  hideWallet: boolean;
  allowLeaderboard: boolean;
}

export function getEffectiveCustomerReferralSettings(
  userRewards?: UserReferralRewardsState | null,
  globalConfig?: {
    isProgramEnabled?: boolean;
    hideReferralEarningsGlobally?: boolean;
    hideInviteOptionGlobally?: boolean;
    hideReferralWalletGlobally?: boolean;
    allowLeaderboardDisplay?: boolean;
  } | null
): EffectiveCustomerReferralSettings {
  const isProgramEnabled = globalConfig?.isProgramEnabled ?? true;
  // Per-customer activation flag: strictly defaults to false unless explicitly activated by Admin
  const referral_rewards_enabled = Boolean(
    userRewards?.referral_rewards_enabled ?? userRewards?.referralRewardsEnabled ?? false
  );
  const isBanned = Boolean(userRewards?.isBanned);
  const banReason = userRewards?.banReason;
  const isEarningsFrozen = Boolean(userRewards?.isEarningsFrozen);
  const frozenReason = userRewards?.frozenReason;
  const frozenAt = userRewards?.frozenAt;

  // If referral_rewards_enabled is disabled, completely hide all referral and wallet options
  const hideEarnings = !referral_rewards_enabled || Boolean(userRewards?.hideReferralEarnings || globalConfig?.hideReferralEarningsGlobally);
  const hideReferralWallet = !referral_rewards_enabled || Boolean(
    userRewards?.hideReferralWallet || globalConfig?.hideReferralWalletGlobally
  );
  const hideInvite = !referral_rewards_enabled || Boolean(
    userRewards?.hideInviteOption || globalConfig?.hideInviteOptionGlobally || isBanned || !isProgramEnabled
  );
  const allowLeaderboard = Boolean(
    referral_rewards_enabled && (globalConfig?.allowLeaderboardDisplay ?? true) && isProgramEnabled && !hideEarnings && !hideReferralWallet
  );

  return {
    isProgramEnabled,
    referral_rewards_enabled,
    isBanned,
    banReason,
    isEarningsFrozen,
    frozenReason,
    frozenAt,
    hideEarnings,
    hideInvite,
    hideReferralWallet,
    hideWallet: hideReferralWallet,
    allowLeaderboard,
  };
}

export const referralService = {
  /**
   * Get user's rewards state including referral balance, wallet balance, and vouchers
   */
  async getUserRewards(userId: string): Promise<UserReferralRewardsState> {
    const storageKey = `${USER_REWARDS_STORAGE_PREFIX}${userId || 'guest'}`;

    // 1. Try fetching from server API endpoint
    try {
      if (userId && userId !== 'guest') {
        const res = await fetch(`/api/referrals/user/${encodeURIComponent(userId)}`);
        if (res.ok) {
          const apiData = await res.json();
          if (apiData.success && apiData.data) {
            safeSetItem(storageKey, apiData.data);
            return apiData.data;
          }
        }
      }
    } catch (e) {
      console.warn('[ReferralService] Server fetch notice:', e);
    }

    // 2. Try fetching from Supabase profiles/settings table
    if (isSupabaseConfigured() && supabase && userId && userId !== 'guest') {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profile) {
          const remoteReferralData = (profile as any).referral_rewards || (profile as any).referral_data;
          const isRefEnabled = (profile as any).referral_rewards_enabled !== undefined
            ? Boolean((profile as any).referral_rewards_enabled)
            : (remoteReferralData && typeof remoteReferralData === 'object' && remoteReferralData.referral_rewards_enabled !== undefined
                ? Boolean(remoteReferralData.referral_rewards_enabled)
                : false);

          if (remoteReferralData && typeof remoteReferralData === 'object') {
            const merged: UserReferralRewardsState = {
              userId,
              referralBalance: remoteReferralData.referralBalance ?? 0,
              totalEarned: remoteReferralData.totalEarned ?? 0,
              walletBalance: remoteReferralData.walletBalance ?? (profile as any).wallet_balance ?? 0,
              successfulReferralsCount: remoteReferralData.successfulReferralsCount ?? 0,
              pendingReferralsCount: remoteReferralData.pendingReferralsCount ?? 0,
              vouchers: remoteReferralData.vouchers || [],
              history: remoteReferralData.history || [],
              isBanned: Boolean(remoteReferralData.isBanned),
              banReason: remoteReferralData.banReason || '',
              isEarningsFrozen: Boolean(remoteReferralData.isEarningsFrozen),
              frozenReason: remoteReferralData.frozenReason || '',
              frozenAt: remoteReferralData.frozenAt,
              hideReferralEarnings: Boolean(remoteReferralData.hideReferralEarnings),
              hideInviteOption: Boolean(remoteReferralData.hideInviteOption),
              referral_rewards_enabled: isRefEnabled,
              referralRewardsEnabled: isRefEnabled,
              adminAdjustments: remoteReferralData.adminAdjustments || [],
              lastUpdated: remoteReferralData.lastUpdated || new Date().toISOString(),
            };
            safeSetItem(storageKey, merged);
            return merged;
          }
        }
      } catch (err) {
        console.warn('[ReferralService] Supabase profile rewards query notice:', err);
      }
    }

    // 3. Fallback to LocalStorage
    const local = safeGetItem<UserReferralRewardsState | null>(storageKey, null);
    if (local && local.userId === userId) {
      return local;
    }

    // 4. Default Seed State
    const seededState: UserReferralRewardsState = {
      userId: userId || 'demo-user',
      ...DEFAULT_INITIAL_USER_REWARDS,
      isBanned: false,
      isEarningsFrozen: false,
      frozenReason: '',
      hideReferralEarnings: false,
      hideInviteOption: false,
      adminAdjustments: [],
      lastUpdated: new Date().toISOString(),
    };
    safeSetItem(storageKey, seededState);
    return seededState;
  },

  /**
   * Redeem referral rewards as either a discount voucher or wallet credit
   */
  async redeemReward(
    userId: string,
    type: RedemptionType,
    amount: number
  ): Promise<{
    success: boolean;
    redemption?: ReferralRewardRedemption;
    rewardState?: UserReferralRewardsState;
    error?: string;
  }> {
    if (amount <= 0) {
      return { success: false, error: 'Redemption amount must be greater than zero.' };
    }

    const currentRewards = await this.getUserRewards(userId);

    if (currentRewards.isBanned) {
      return {
        success: false,
        error: `Your account is currently restricted from redeeming referral rewards. ${currentRewards.banReason ? `Reason: ${currentRewards.banReason}` : 'Please contact store support.'}`,
      };
    }

    if (currentRewards.isEarningsFrozen) {
      return {
        success: false,
        error: `Your referral earnings are currently frozen by administration and cannot be redeemed or converted at this time.${currentRewards.frozenReason ? ` Reason: ${currentRewards.frozenReason}` : ''}`,
      };
    }

    if (currentRewards.referralBalance < amount) {
      return {
        success: false,
        error: `Insufficient referral balance. You have R${currentRewards.referralBalance} available.`,
      };
    }

    const now = new Date().toISOString();
    const expiry = new Date(Date.now() + 86400000 * 90).toISOString(); // 90 days validity

    // Generate clean voucher code if type is discount voucher
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const voucherCode = type === 'discount_voucher' ? `KUD-REWARD-${amount}-${randomSuffix}` : undefined;

    const newRedemption: ReferralRewardRedemption = {
      id: `redemp-${Date.now()}-${randomSuffix}`,
      userId,
      type,
      amount,
      voucherCode,
      voucherExpiry: type === 'discount_voucher' ? expiry : undefined,
      status: type === 'discount_voucher' ? 'active' : 'completed',
      createdAt: now,
      note:
        type === 'discount_voucher'
          ? `Converted R${amount} referral reward to discount voucher ${voucherCode}`
          : `Credited R${amount} referral reward to KUD Store Wallet`,
    };

    // Calculate updated reward state
    const updatedReferralBalance = Math.max(0, currentRewards.referralBalance - amount);
    const updatedWalletBalance =
      type === 'wallet_credit'
        ? currentRewards.walletBalance + amount
        : currentRewards.walletBalance;

    const updatedVouchers =
      type === 'discount_voucher'
        ? [newRedemption, ...currentRewards.vouchers]
        : currentRewards.vouchers;

    const updatedHistory = [newRedemption, ...currentRewards.history];

    const nextRewardState: UserReferralRewardsState = {
      ...currentRewards,
      userId,
      referralBalance: updatedReferralBalance,
      walletBalance: updatedWalletBalance,
      vouchers: updatedVouchers,
      history: updatedHistory,
      lastUpdated: now,
    };

    const storageKey = `${USER_REWARDS_STORAGE_PREFIX}${userId || 'guest'}`;
    safeSetItem(storageKey, nextRewardState);

    // If voucher, register it into store coupons so Cart & Checkout validate it
    if (type === 'discount_voucher' && voucherCode) {
      try {
        const newCoupon: Coupon = {
          id: `coupon-${Date.now()}-${randomSuffix}`,
          code: voucherCode,
          description: `Referral Reward R${amount} OFF Discount Voucher`,
          discountType: 'fixed',
          discountValue: amount,
          minOrderAmount: Math.max(50, amount),
          isActive: true,
          expiryDate: expiry,
          createdAt: now,
        };

        await this.registerVoucherInCoupons(newCoupon);
      } catch (err) {
        console.warn('[ReferralService] Could not register coupon globally:', err);
      }
    }

    // 1. Send update to Server API endpoint
    try {
      const resp = await fetch('/api/referrals/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type,
          amount,
          voucherCode,
          voucherExpiry: expiry,
          redemptionId: newRedemption.id,
          updatedRewardState: nextRewardState,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success) {
          console.log('[ReferralService] Server updated successfully:', json);
        }
      }
    } catch (apiErr) {
      console.warn('[ReferralService] Server API redemption call notice:', apiErr);
    }

    // 2. Direct Supabase update if configured
    if (isSupabaseConfigured() && supabase && userId && userId !== 'guest') {
      try {
        // Update profile referral rewards JSON / fields
        await supabase
          .from('profiles')
          .update({
            wallet_balance: updatedWalletBalance,
            referral_rewards: nextRewardState,
            updated_at: now,
          })
          .eq('id', userId);
      } catch (supaErr) {
        console.warn('[ReferralService] Supabase profile update notice:', supaErr);
      }
    }

    return {
      success: true,
      redemption: newRedemption,
      rewardState: nextRewardState,
    };
  },

  /**
   * Helper to add a generated reward voucher to active store coupons
   */
  async registerVoucherInCoupons(newCoupon: Coupon): Promise<void> {
    try {
      const existingCoupons = await adminService.getCoupons();
      const updatedCoupons = [newCoupon, ...existingCoupons.filter((c) => c.code !== newCoupon.code)];

      await adminService.saveCoupons(updatedCoupons);
    } catch (e) {
      console.warn('[ReferralService] Register coupon error:', e);
    }
  },

  /**
   * Deduct wallet balance when paying for an order
   */
  async useWalletCredit(
    userId: string,
    amountToUse: number,
    orderId?: string
  ): Promise<{ success: boolean; newWalletBalance: number; error?: string }> {
    const rewards = await this.getUserRewards(userId);
    if (rewards.walletBalance < amountToUse) {
      return {
        success: false,
        newWalletBalance: rewards.walletBalance,
        error: `Insufficient wallet balance. Available: R${rewards.walletBalance}`,
      };
    }

    const newBalance = Math.max(0, rewards.walletBalance - amountToUse);
    const updatedState: UserReferralRewardsState = {
      ...rewards,
      walletBalance: newBalance,
      lastUpdated: new Date().toISOString(),
    };

    const storageKey = `${USER_REWARDS_STORAGE_PREFIX}${userId || 'guest'}`;
    safeSetItem(storageKey, updatedState);

    // Call server to persist wallet balance update
    try {
      await fetch('/api/referrals/wallet/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amountToUse, orderId, newBalance }),
      });
    } catch {
      // Ignored
    }

    if (isSupabaseConfigured() && supabase && userId && userId !== 'guest') {
      try {
        await supabase
          .from('profiles')
          .update({
            wallet_balance: newBalance,
            referral_rewards: updatedState,
          })
          .eq('id', userId);
      } catch (err) {
        console.warn('[ReferralService] Supabase wallet balance update notice:', err);
      }
    }

    return { success: true, newWalletBalance: newBalance };
  },

  /**
   * Mark a voucher as applied/used
   */
  async markVoucherUsed(userId: string, voucherCode: string): Promise<void> {
    const rewards = await this.getUserRewards(userId);
    const updatedVouchers = rewards.vouchers.map((v) =>
      v.voucherCode?.toUpperCase() === voucherCode.toUpperCase()
        ? { ...v, status: 'applied' as const }
        : v
    );

    const updatedState: UserReferralRewardsState = {
      ...rewards,
      vouchers: updatedVouchers,
      lastUpdated: new Date().toISOString(),
    };

    const storageKey = `${USER_REWARDS_STORAGE_PREFIX}${userId || 'guest'}`;
    safeSetItem(storageKey, updatedState);
  },

  /**
   * Get Referral Leaderboard data with realistic community champions and current user positioning
   */
  async getLeaderboard(
    timeframe: LeaderboardTimeframe = 'all_time',
    currentUserRewards?: UserReferralRewardsState | null,
    currentUserName: string = 'You'
  ): Promise<{
    leaderboard: ReferralLeaderboardUser[];
    currentUserRank?: ReferralLeaderboardUser;
    seasonEnd: string;
    prizePool: string;
  }> {
    let communityList: ReferralLeaderboardUser[] = [];

    try {
      const res = await fetch(`/api/referrals/leaderboard?timeframe=${encodeURIComponent(timeframe)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          communityList = json.data;
        }
      }
    } catch {
      // Ignore network errors and use client fallback
    }

    if (!communityList || communityList.length === 0) {
      communityList = [
        {
          rank: 1,
          userId: 'usr-champ-1',
          name: 'Liam K.',
          city: 'Cape Town',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
          referralsCount: timeframe === 'this_week' ? 4 : timeframe === 'this_month' ? 8 : 18,
          totalEarned: timeframe === 'this_week' ? 400 : timeframe === 'this_month' ? 800 : 1800,
          tier: 'Platinum',
          badge: '👑 All-Time Champion',
          monthlyPrize: 'R500 Store Voucher + VIP Gift Box',
          change: 'same',
          changeAmount: 0,
        },
        {
          rank: 2,
          userId: 'usr-champ-2',
          name: 'Zandile M.',
          city: 'Johannesburg',
          avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&h=120&q=80',
          referralsCount: timeframe === 'this_week' ? 3 : timeframe === 'this_month' ? 6 : 14,
          totalEarned: timeframe === 'this_week' ? 300 : timeframe === 'this_month' ? 600 : 1400,
          tier: 'Platinum',
          badge: '🥈 Top Ambassador',
          monthlyPrize: 'R300 Store Voucher',
          change: 'up',
          changeAmount: 1,
        },
        {
          rank: 3,
          userId: 'usr-champ-3',
          name: 'Thabo N.',
          city: 'Durban',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
          referralsCount: timeframe === 'this_week' ? 3 : timeframe === 'this_month' ? 5 : 11,
          totalEarned: timeframe === 'this_week' ? 300 : timeframe === 'this_month' ? 500 : 1100,
          tier: 'Platinum',
          badge: '🥉 Elite Advocate',
          monthlyPrize: 'R150 Store Voucher',
          change: 'down',
          changeAmount: 1,
        },
        {
          rank: 4,
          userId: 'usr-champ-4',
          name: 'Sipho D.',
          city: 'Pretoria',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80',
          referralsCount: timeframe === 'this_week' ? 2 : timeframe === 'this_month' ? 4 : 9,
          totalEarned: timeframe === 'this_week' ? 150 : timeframe === 'this_month' ? 300 : 675,
          tier: 'Gold',
          badge: '⭐ Gold Leader',
          change: 'up',
          changeAmount: 2,
        },
        {
          rank: 5,
          userId: 'usr-champ-5',
          name: 'Chloe V.',
          city: 'Stellenbosch',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80',
          referralsCount: timeframe === 'this_week' ? 2 : timeframe === 'this_month' ? 3 : 8,
          totalEarned: timeframe === 'this_week' ? 150 : timeframe === 'this_month' ? 225 : 600,
          tier: 'Gold',
          badge: '⭐ Gold Influencer',
          change: 'same',
          changeAmount: 0,
        },
        {
          rank: 6,
          userId: 'usr-champ-6',
          name: 'Marcus P.',
          city: 'Gqeberha',
          avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&h=120&q=80',
          referralsCount: timeframe === 'this_week' ? 1 : timeframe === 'this_month' ? 3 : 7,
          totalEarned: timeframe === 'this_week' ? 75 : timeframe === 'this_month' ? 225 : 525,
          tier: 'Gold',
          badge: '⚡ Rising Star',
          change: 'up',
          changeAmount: 1,
        },
        {
          rank: 7,
          userId: 'usr-champ-7',
          name: 'Anika S.',
          city: 'Bloemfontein',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80',
          referralsCount: timeframe === 'this_week' ? 1 : timeframe === 'this_month' ? 2 : 5,
          totalEarned: timeframe === 'this_week' ? 60 : timeframe === 'this_month' ? 120 : 300,
          tier: 'Silver',
          badge: '🥈 Silver Star',
          change: 'down',
          changeAmount: 1,
        },
        {
          rank: 8,
          userId: 'usr-champ-8',
          name: 'Johan B.',
          city: 'Centurion',
          avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&h=120&q=80',
          referralsCount: timeframe === 'this_week' ? 1 : timeframe === 'this_month' ? 2 : 4,
          totalEarned: timeframe === 'this_week' ? 60 : timeframe === 'this_month' ? 120 : 240,
          tier: 'Silver',
          change: 'same',
          changeAmount: 0,
        },
      ];
    }

    // Determine current user stats
    const userReferrals = currentUserRewards?.successfulReferralsCount ?? 0;
    const userTotalEarned = currentUserRewards?.totalEarned ?? 0;
    const currentUserId = currentUserRewards?.userId || 'current-user';

    const getUserTier = (count: number): LoyaltyTierLevel => {
      if (count >= 10) return 'Platinum';
      if (count >= 6) return 'Gold';
      if (count >= 3) return 'Silver';
      return 'Bronze';
    };

    // Construct current user object
    const currentUserItem: ReferralLeaderboardUser = {
      rank: 0,
      userId: currentUserId,
      name: `${currentUserName} (You)`,
      city: 'Your Location',
      referralsCount: userReferrals,
      totalEarned: userTotalEarned,
      tier: getUserTier(userReferrals),
      isCurrentUser: true,
      badge: userReferrals >= 10 ? '👑 VIP Platinum' : userReferrals >= 6 ? '⭐ Gold Leader' : userReferrals >= 3 ? '🥈 Silver Star' : '🥉 Active Referrer',
      change: 'same',
      changeAmount: 0,
    };

    // Filter out duplicate if user id was already in list
    const filteredOthers = communityList.filter((item) => item.userId !== currentUserId && !item.isCurrentUser);

    // Merge and sort
    const allUsers = [...filteredOthers, currentUserItem].sort((a, b) => {
      if (b.referralsCount !== a.referralsCount) {
        return b.referralsCount - a.referralsCount;
      }
      return b.totalEarned - a.totalEarned;
    });

    // Assign final ranks
    const rankedList: ReferralLeaderboardUser[] = allUsers.map((item, index) => ({
      ...item,
      rank: index + 1,
      monthlyPrize:
        index === 0
          ? 'R500 Voucher + VIP Gift'
          : index === 1
          ? 'R300 Voucher'
          : index === 2
          ? 'R150 Voucher'
          : undefined,
    }));

    const foundCurrentUser = rankedList.find((item) => item.isCurrentUser);

    return {
      leaderboard: rankedList,
      currentUserRank: foundCurrentUser,
      seasonEnd: 'End of Current Month',
      prizePool: 'R1,000 in Shopping Vouchers + VIP Multipliers',
    };
  },

  getStoreReferralConfig: async (): Promise<StoreReferralGlobalConfig> => {
    return adminService.getStoreReferralConfig();
  },

  /**
   * Get referral commissions and monthly purchase qualification statuses for a user
   */
  async getUserReferralCommissions(userId: string): Promise<ReferralCommissionRecord[]> {
    return adminService.getReferralCommissions({ referrerId: userId });
  },

  /**
   * Freeze or unfreeze a customer's referral earnings from being redeemed
   */
  async toggleCustomerEarningsFrozen(
    userId: string,
    isFrozen: boolean,
    reason?: string
  ): Promise<{ success: boolean; error?: string; data?: UserReferralRewardsState }> {
    return adminService.toggleCustomerEarningsFrozen(userId, isFrozen, reason);
  },
};

