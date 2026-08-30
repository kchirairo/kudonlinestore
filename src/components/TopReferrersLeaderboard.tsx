import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Sparkles,
  Flame,
  ArrowUp,
  ArrowDown,
  Minus,
  TrendingUp,
  Share2,
  Gift,
  Users,
  ChevronRight,
  Info,
  Calendar,
  Zap,
  Star,
  CheckCircle2,
  RotateCw,
} from 'lucide-react';
import { STORE_CONFIG } from '../constants/config';
import {
  LeaderboardTimeframe,
  ReferralLeaderboardUser,
  UserReferralRewardsState,
  LoyaltyTierLevel,
} from '../types';
import { referralService } from '../services/referralService';

interface TopReferrersLeaderboardProps {
  userRewards?: UserReferralRewardsState | null;
  userName?: string;
  onInviteClick?: () => void;
  onRedeemClick?: () => void;
}

export const TopReferrersLeaderboard: React.FC<TopReferrersLeaderboardProps> = ({
  userRewards,
  userName = 'You',
  onInviteClick,
  onRedeemClick,
}) => {
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('all_time');
  const [leaderboard, setLeaderboard] = useState<ReferralLeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<ReferralLeaderboardUser | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showPrizesModal, setShowPrizesModal] = useState<boolean>(false);
  const [prizePool, setPrizePool] = useState<string>('R1,000 in VIP Shopping Vouchers');

  const loadLeaderboardData = async (selectedTimeframe: LeaderboardTimeframe) => {
    setIsLoading(true);
    try {
      const data = await referralService.getLeaderboard(
        selectedTimeframe,
        userRewards,
        userName
      );
      setLeaderboard(data.leaderboard);
      setCurrentUserRank(data.currentUserRank);
      if (data.prizePool) {
        setPrizePool(data.prizePool);
      }
    } catch (err) {
      console.error('Failed to load referral leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboardData(timeframe);
  }, [timeframe, userRewards?.successfulReferralsCount, userRewards?.totalEarned, userName]);

  // Top 3 Podium Users
  const top1 = leaderboard.find((u) => u.rank === 1);
  const top2 = leaderboard.find((u) => u.rank === 2);
  const top3 = leaderboard.find((u) => u.rank === 3);

  // Other ranked users (#4 and onward)
  const remainingList = leaderboard.filter((u) => u.rank > 3);

  const getTierBadgeStyle = (tier: LoyaltyTierLevel) => {
    switch (tier) {
      case 'Platinum':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Gold':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Silver':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      case 'Bronze':
      default:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-amber-950 flex items-center justify-center font-black text-sm shadow-md shadow-amber-500/30 ring-2 ring-amber-300">
            <Crown className="w-4 h-4 text-amber-950" />
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 text-slate-900 flex items-center justify-center font-black text-sm shadow-sm ring-2 ring-slate-300">
            <Medal className="w-4 h-4 text-slate-800" />
          </div>
        );
      case 3:
        return (
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-700 to-orange-400 text-white flex items-center justify-center font-black text-sm shadow-sm ring-2 ring-orange-300">
            <Award className="w-4 h-4 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 flex items-center justify-center font-black text-xs font-mono">
            #{rank}
          </div>
        );
    }
  };

  // Conversions needed to climb to next rank
  const userRankNum = currentUserRank?.rank ?? 4;
  const userAhead = leaderboard.find((u) => u.rank === userRankNum - 1);
  const conversionsToClimb = userAhead
    ? Math.max(1, userAhead.referralsCount - (currentUserRank?.referralsCount ?? 0) + 1)
    : 0;

  return (
    <div
      id="referral-leaderboard-card"
      className="bg-white dark:bg-slate-900 rounded-[28px] p-6 sm:p-7 border border-gray-100 dark:border-slate-800 shadow-xs space-y-6 relative overflow-hidden"
    >
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/10 via-purple-500/5 to-transparent rounded-bl-full pointer-events-none -z-0 blur-2xl" />

      {/* Header Section */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
            <Trophy className="w-6 h-6 text-amber-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
                Top Referrers Leaderboard
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Flame className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>Season Active</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Compete with brand advocates to win monthly prize shopping sprees and VIP tier perks.
            </p>
          </div>
        </div>

        {/* Timeframe Filter Buttons & Info CTA */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <div className="inline-flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setTimeframe('all_time')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeframe === 'all_time'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All-Time
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('this_month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeframe === 'this_month'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('this_week')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeframe === 'this_week'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              This Week
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPrizesModal(!showPrizesModal)}
            className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-xl border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="View Monthly Leaderboard Prizes"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Prizes</span>
          </button>

          <button
            type="button"
            onClick={() => loadLeaderboardData(timeframe)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Refresh Leaderboard"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Prize Pool Info Banner (Toggleable) */}
      {showPrizesModal && (
        <div className="relative z-10 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 dark:from-amber-950/40 dark:via-purple-950/40 dark:to-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white">
                Monthly Ambassador Prize Pool ({prizePool})
              </h3>
            </div>
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-0.5 rounded-full">
              Resets 1st of every month
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center gap-2.5">
              <span className="text-xl">🥇</span>
              <div>
                <span className="text-xs font-black text-amber-900 dark:text-amber-300 block">
                  1st Place Champion
                </span>
                <span className="text-[11px] text-gray-600 dark:text-slate-300">
                  R500 Store Voucher + VIP Platinum Gift Box
                </span>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center gap-2.5">
              <span className="text-xl">🥈</span>
              <div>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                  2nd Place Ambassador
                </span>
                <span className="text-[11px] text-gray-600 dark:text-slate-300">
                  R300 Store Voucher + Gold Boost
                </span>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-orange-200 dark:border-orange-900/50 flex items-center gap-2.5">
              <span className="text-xl">🥉</span>
              <div>
                <span className="text-xs font-black text-orange-900 dark:text-orange-300 block">
                  3rd Place Advocate
                </span>
                <span className="text-[11px] text-gray-600 dark:text-slate-300">
                  R150 Store Voucher + Free Shipping
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Champions Podium Display */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
        {/* 2nd Place (Left) */}
        {top2 && (
          <div className="order-2 md:order-1 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 flex flex-col items-center text-center relative overflow-hidden group hover:border-slate-300 transition-all shadow-xs">
            <div className="absolute top-2 left-2">
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center font-black text-xs">
                #2
              </div>
            </div>
            <div className="relative mb-2">
              <img
                src={top2.avatarUrl}
                alt={top2.name}
                className="w-14 h-14 rounded-full object-cover ring-4 ring-slate-200 dark:ring-slate-700 shadow-sm"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center shadow-xs">
                <Medal className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200" />
              </div>
            </div>
            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-1">
              <span>{top2.name}</span>
              {top2.isCurrentUser && (
                <span className="text-[9px] bg-[#16a34a] text-white px-1.5 py-0.5 rounded font-black">
                  YOU
                </span>
              )}
            </h3>
            <span className="text-[10px] text-gray-500 dark:text-slate-400">
              {top2.city || 'Ambassador'}
            </span>
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap justify-center">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {top2.tier} Tier
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {top2.referralsCount} Conversions
              </span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 w-full flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-slate-400 text-[11px]">Total Earned</span>
              <span className="font-mono font-black text-gray-900 dark:text-white">
                {STORE_CONFIG.STORE_CURRENCY}{top2.totalEarned}
              </span>
            </div>
            {top2.monthlyPrize && (
              <div className="mt-2 w-full text-center bg-slate-100/80 dark:bg-slate-800/80 py-1 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300">
                Prize: {top2.monthlyPrize}
              </div>
            )}
          </div>
        )}

        {/* 1st Place (Center / Highlighted) */}
        {top1 && (
          <div className="order-1 md:order-2 bg-gradient-to-b from-amber-50 via-yellow-50/40 to-white dark:from-amber-950/30 dark:via-slate-800/70 dark:to-slate-900 rounded-2xl p-5 border-2 border-amber-400 dark:border-amber-500/70 flex flex-col items-center text-center relative overflow-hidden shadow-md shadow-amber-500/10 transform md:-translate-y-2">
            <div className="absolute top-2.5 left-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-amber-950 flex items-center justify-center font-black text-xs shadow-xs">
                #1
              </div>
            </div>
            <div className="absolute top-2.5 right-2.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-200/90 dark:bg-amber-900/90 text-amber-950 dark:text-amber-200">
                <Crown className="w-3 h-3 text-amber-700" />
                <span>Leader</span>
              </span>
            </div>
            <div className="relative mb-2">
              <img
                src={top1.avatarUrl}
                alt={top1.name}
                className="w-18 h-18 rounded-full object-cover ring-4 ring-amber-400 shadow-md"
              />
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-amber-950 flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-slate-900">
                <Crown className="w-4 h-4" />
              </div>
            </div>
            <h3 className="font-black text-base text-gray-900 dark:text-white flex items-center gap-1.5">
              <span>{top1.name}</span>
              {top1.isCurrentUser && (
                <span className="text-[9px] bg-[#16a34a] text-white px-1.5 py-0.5 rounded font-black">
                  YOU
                </span>
              )}
            </h3>
            <span className="text-[11px] text-amber-800 dark:text-amber-400 font-medium">
              {top1.city || 'Top Champion'}
            </span>
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap justify-center">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {top1.tier} Tier
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-2xs flex items-center gap-1">
                <Flame className="w-3 h-3 text-yellow-200" />
                <span>{top1.referralsCount} Conversions</span>
              </span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-amber-100 dark:border-slate-800 w-full flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-slate-400 text-[11px] font-medium">
                Lifetime Rewards
              </span>
              <span className="font-mono font-black text-amber-900 dark:text-amber-300 text-sm">
                {STORE_CONFIG.STORE_CURRENCY}{top1.totalEarned}
              </span>
            </div>
            {top1.monthlyPrize && (
              <div className="mt-2 w-full text-center bg-amber-100/80 dark:bg-amber-950/60 py-1.5 rounded-lg text-[10px] font-black text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800/60">
                Prize: {top1.monthlyPrize}
              </div>
            )}
          </div>
        )}

        {/* 3rd Place (Right) */}
        {top3 && (
          <div className="order-3 bg-gradient-to-b from-orange-50/50 to-white dark:from-slate-800/60 dark:to-slate-900/80 rounded-2xl p-4 border border-orange-200 dark:border-slate-700/80 flex flex-col items-center text-center relative overflow-hidden group hover:border-orange-300 transition-all shadow-xs">
            <div className="absolute top-2 left-2">
              <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-slate-700 text-orange-800 dark:text-slate-200 flex items-center justify-center font-black text-xs">
                #3
              </div>
            </div>
            <div className="relative mb-2">
              <img
                src={top3.avatarUrl}
                alt={top3.name}
                className="w-14 h-14 rounded-full object-cover ring-4 ring-orange-200 dark:ring-orange-900/50 shadow-sm"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-orange-400 text-white flex items-center justify-center shadow-xs">
                <Award className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-1">
              <span>{top3.name}</span>
              {top3.isCurrentUser && (
                <span className="text-[9px] bg-[#16a34a] text-white px-1.5 py-0.5 rounded font-black">
                  YOU
                </span>
              )}
            </h3>
            <span className="text-[10px] text-gray-500 dark:text-slate-400">
              {top3.city || 'Advocate'}
            </span>
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap justify-center">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {top3.tier} Tier
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {top3.referralsCount} Conversions
              </span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 w-full flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-slate-400 text-[11px]">Total Earned</span>
              <span className="font-mono font-black text-gray-900 dark:text-white">
                {STORE_CONFIG.STORE_CURRENCY}{top3.totalEarned}
              </span>
            </div>
            {top3.monthlyPrize && (
              <div className="mt-2 w-full text-center bg-orange-100/70 dark:bg-orange-950/60 py-1 rounded-lg text-[10px] font-bold text-orange-900 dark:text-orange-200">
                Prize: {top3.monthlyPrize}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current Logged-In User Position Banner */}
      {currentUserRank && (
        <div
          id="leaderboard-user-standing-banner"
          className="relative z-10 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-teal-500/10 dark:from-emerald-950/40 dark:via-slate-800 dark:to-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-600/70 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
              #{currentUserRank.rank}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">
                  Your Current Rank: #{currentUserRank.rank}
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getTierBadgeStyle(
                    currentUserRank.tier
                  )}`}
                >
                  {currentUserRank.tier} Tier
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                  {currentUserRank.referralsCount} Friend {currentUserRank.referralsCount === 1 ? 'Conversion' : 'Conversions'}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-300 mt-1">
                {userRankNum === 1 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 inline" /> You are leading the referral leaderboard! Keep sharing to hold #1.
                  </span>
                ) : conversionsToClimb > 0 ? (
                  <span>
                    Invite <strong>{conversionsToClimb} more {conversionsToClimb === 1 ? 'friend' : 'friends'}</strong> to climb to <strong>Rank #{userRankNum - 1}</strong> and unlock higher monthly prizes!
                  </span>
                ) : (
                  <span>Keep inviting friends to earn {STORE_CONFIG.STORE_CURRENCY}50+ discount rewards and rank up!</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
            {onInviteClick && (
              <button
                type="button"
                onClick={onInviteClick}
                className="px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Invite to Rank Up</span>
              </button>
            )}
            {onRedeemClick && (
              <button
                type="button"
                onClick={onRedeemClick}
                className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <span>Redeem</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Full Leaderboard Table / Rankings List */}
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-slate-400 px-3">
          <span>Rank &amp; Ambassador</span>
          <div className="flex items-center gap-8 sm:gap-14">
            <span className="hidden sm:inline">Tier Status</span>
            <span>Conversions</span>
            <span>Earned</span>
          </div>
        </div>

        <div className="space-y-2">
          {leaderboard.map((user) => {
            const isUserRow = user.isCurrentUser;

            return (
              <div
                key={user.userId}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  isUserRow
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-400/30'
                    : 'bg-gray-50/60 dark:bg-slate-800/40 hover:bg-gray-50 dark:hover:bg-slate-800/70 border-gray-100 dark:border-slate-800'
                }`}
              >
                {/* Left: Rank, Avatar, Name */}
                <div className="flex items-center gap-3 min-w-0">
                  {getRankBadge(user.rank)}

                  <div className="relative shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-black text-xs">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate">
                        {user.name}
                      </span>
                      {isUserRow && (
                        <span className="text-[9px] bg-[#16a34a] text-white px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                          YOU
                        </span>
                      )}
                      {user.rank <= 3 && (
                        <span className="text-[10px]">
                          {user.rank === 1 ? '👑' : user.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400">
                      <span>{user.city || 'South Africa'}</span>
                      {user.change === 'up' && (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center text-[10px] font-bold">
                          <ArrowUp className="w-3 h-3" />
                          <span>+{user.changeAmount || 1}</span>
                        </span>
                      )}
                      {user.change === 'down' && (
                        <span className="text-rose-500 dark:text-rose-400 flex items-center text-[10px] font-bold">
                          <ArrowDown className="w-3 h-3" />
                          <span>-{user.changeAmount || 1}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Tier, Conversions, Total Earned */}
                <div className="flex items-center gap-4 sm:gap-10 shrink-0">
                  <span
                    className={`hidden sm:inline-block text-[10px] font-black px-2 py-0.5 rounded-full border ${getTierBadgeStyle(
                      user.tier
                    )}`}
                  >
                    {user.tier}
                  </span>

                  <div className="text-right min-w-[70px]">
                    <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white flex items-center justify-end gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{user.referralsCount}</span>
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 block">
                      conversions
                    </span>
                  </div>

                  <div className="text-right min-w-[70px]">
                    <span className="text-xs sm:text-sm font-mono font-black text-emerald-700 dark:text-emerald-400">
                      {STORE_CONFIG.STORE_CURRENCY}{user.totalEarned}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 block">
                      earned
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gamification Tips / Program Rules Footer */}
      <div className="relative z-10 bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            Rankings update automatically whenever a referred friend makes their first qualifying purchase.
          </span>
        </div>
        {onInviteClick && (
          <button
            type="button"
            onClick={onInviteClick}
            className="text-emerald-700 dark:text-emerald-400 font-black hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto shrink-0"
          >
            <span>Share Referral Link</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
