import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Share2,
  Users,
  ShoppingBag,
  DollarSign,
  Percent,
  Calendar,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Layers,
  ArrowRight,
  Filter,
  Plus,
  Package,
  Eye,
  AlertCircle,
  HelpCircle,
  BarChart3,
} from 'lucide-react';
import { marketingService } from '../../services/marketingService';
import { productService } from '../../services/productService';
import {
  MarketingAnalyticsSummary,
  MarketingPlatformMetric,
  Product,
} from '../../types';
import { STORE_CONFIG } from '../../constants/config';
import { SEOHead } from '../../components/SEOHead';
import { ProductSocialPromoModal } from '../../components/social/ProductSocialPromoModal';
import { buildSocialCampaignUrl } from '../../utils/utmTracker';

export const AdminMarketingAnalyticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'custom'>('7d');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [analytics, setAnalytics] = useState<MarketingAnalyticsSummary | null>(null);

  // Products for the quick campaign link builder
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductForPromo, setSelectedProductForPromo] = useState<Product | null>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'products' | 'pixels'>('overview');

  // Load analytics data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const summary = await marketingService.getMarketingAnalytics({
        dateRange,
        startDate: dateRange === 'custom' ? customStartDate : undefined,
        endDate: dateRange === 'custom' ? customEndDate : undefined,
      });
      setAnalytics(summary);
    } catch (err) {
      console.error('[AdminMarketingAnalyticsPage] Error loading marketing analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load products catalog for the campaign launcher
  useEffect(() => {
    productService
      .getProducts()
      .then((res) => setProducts(res))
      .catch((err) => console.warn('Failed to load products list:', err));
  }, []);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const handleApplyCustomFilter = () => {
    if (dateRange === 'custom') {
      loadData();
    } else {
      setDateRange('custom');
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      window.prompt('Copy URL:', url);
    }
  };

  const openPromoForProduct = (prod: Product) => {
    setSelectedProductForPromo(prod);
    setIsPromoModalOpen(true);
  };

  return (
    <>
      <SEOHead
        title="Marketing & Social Commerce Analytics | KUD Store Admin"
        description="Track sales, visitors, conversions, and attribution from Instagram, Facebook, and TikTok."
      />

      <div className="space-y-8 pb-12">
        {/* Page Header with Actions & Date Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-500 text-white flex items-center justify-center shadow-sm">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  Marketing & Social Analytics
                </h1>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Instagram, Facebook & TikTok attribution with verified Yoco payment tracking
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Action: Social Link Generator */}
            {products.length > 0 && (
              <button
                id="admin-create-campaign-link-btn"
                type="button"
                onClick={() => {
                  setSelectedProductForPromo(products[0]);
                  setIsPromoModalOpen(true);
                }}
                className="px-4 py-2.5 bg-[#ff6452] hover:bg-[#e05342] text-white rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create Social Link</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              id="admin-marketing-refresh-btn"
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="p-2.5 rounded-2xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Refresh analytics data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-gray-100 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pl-2">
              <Calendar className="w-3.5 h-3.5" /> Date Filter:
            </span>
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-800 rounded-2xl">
              <button
                id="filter-range-today"
                type="button"
                onClick={() => setDateRange('today')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dateRange === 'today'
                    ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Today
              </button>
              <button
                id="filter-range-7d"
                type="button"
                onClick={() => setDateRange('7d')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dateRange === '7d'
                    ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                7 Days
              </button>
              <button
                id="filter-range-30d"
                type="button"
                onClick={() => setDateRange('30d')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dateRange === '30d'
                    ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                30 Days
              </button>
              <button
                id="filter-range-custom"
                type="button"
                onClick={() => setDateRange('custom')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dateRange === 'custom'
                    ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                id="input-custom-start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                id="input-custom-end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={handleApplyCustomFilter}
                className="px-3 py-1.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
          <button
            id="tab-analytics-overview"
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Overview & Platforms
          </button>
          <button
            id="tab-analytics-campaigns"
            type="button"
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'campaigns'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Campaign Performance ({analytics?.topCampaigns?.length || 0})
          </button>
          <button
            id="tab-analytics-products"
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Top Social Products ({analytics?.topProducts?.length || 0})
          </button>
          <button
            id="tab-analytics-pixels"
            type="button"
            onClick={() => setActiveTab('pixels')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pixels'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Meta & TikTok Pixels / CAPI
          </button>
        </div>

        {/* 1. TOP KEY METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Visitors */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Visitors (Sessions)
              </span>
              <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 dark:text-white">
                {analytics?.totalVisitors?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                Captured across social campaigns & direct
              </p>
            </div>
          </div>

          {/* Paid Orders */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Verified Orders
              </span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 dark:text-white">
                {analytics?.totalOrders?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed via Yoco payment
              </p>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Conversion Rate
              </span>
              <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 dark:text-white">
                {analytics?.overallConversionRate?.toFixed(2) || '0.00'}%
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                Visitors converted to completed sale
              </p>
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Attributed Revenue
              </span>
              <div className="w-9 h-9 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-[#ff6452] flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 dark:text-white">
                {STORE_CONFIG.STORE_CURRENCY}
                {analytics?.totalRevenue?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                Avg Order Value:{' '}
                {STORE_CONFIG.STORE_CURRENCY}
                {analytics?.totalOrders && analytics.totalOrders > 0
                  ? Math.round(analytics.totalRevenue / analytics.totalOrders).toLocaleString()
                  : 0}
              </p>
            </div>
          </div>
        </div>

        {/* 2. PLATFORM BREAKDOWN SECTION (Instagram, TikTok, Facebook, WhatsApp, Direct) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                  Revenue & Orders by Platform
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Performance breakdown for Instagram, TikTok, Facebook, and WhatsApp
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Instagram Card */}
              {renderPlatformCard(
                'Instagram',
                analytics?.platformBreakdown?.instagram,
                'from-purple-500 via-pink-500 to-rose-500',
                '📸'
              )}

              {/* TikTok Card */}
              {renderPlatformCard(
                'TikTok',
                analytics?.platformBreakdown?.tiktok,
                'from-neutral-900 to-neutral-700 dark:from-neutral-100 dark:to-neutral-300',
                '🎵'
              )}

              {/* Facebook Card */}
              {renderPlatformCard(
                'Facebook',
                analytics?.platformBreakdown?.facebook,
                'from-blue-600 to-blue-500',
                '📘'
              )}

              {/* WhatsApp Card */}
              {renderPlatformCard(
                'WhatsApp',
                analytics?.platformBreakdown?.whatsapp,
                'from-emerald-600 to-emerald-500',
                '💬'
              )}

              {/* Other / Direct */}
              {renderPlatformCard(
                'Direct / Other',
                analytics?.platformBreakdown?.other,
                'from-gray-700 to-gray-600 dark:from-slate-700 dark:to-slate-600',
                '🌐'
              )}
            </div>

            {/* 3. SOCIAL COMMERCE FUNNEL */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#ff6452]" />
                    <span>Social Commerce Conversion Funnel</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Step-by-step visitor progression from social click to Yoco payment confirmation
                  </p>
                </div>
              </div>

              {renderFunnelSection(analytics?.funnel)}
            </div>

            {/* 4. DAILY TRENDS CHART */}
            {analytics?.dailyTrends && analytics.dailyTrends.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#ff6452]" />
                      <span>Daily Revenue Trend</span>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Revenue performance over the selected period
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 px-2">
                    {(() => {
                      const maxDayRevenue = Math.max(
                        ...analytics.dailyTrends.map((d) => d.revenue),
                        500
                      );
                      return analytics.dailyTrends.map((item, idx) => {
                        const heightPct = Math.max(
                          8,
                          Math.round((item.revenue / maxDayRevenue) * 100)
                        );
                        return (
                          <div
                            key={`trend-${idx}`}
                            className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative"
                          >
                            {/* Hover tooltip */}
                            <div className="absolute -top-12 bg-gray-900 text-white text-[11px] font-bold py-1 px-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md z-10">
                              {item.date}: {STORE_CONFIG.STORE_CURRENCY}
                              {item.revenue.toLocaleString()} ({item.orders} orders)
                            </div>

                            <div className="w-full max-w-[48px] bg-gray-100 dark:bg-slate-800 rounded-2xl overflow-hidden h-full flex flex-col justify-end p-1">
                              <div
                                style={{ height: `${heightPct}%` }}
                                className="w-full bg-gradient-to-t from-[#ff6452] to-rose-400 rounded-xl transition-all duration-300 group-hover:brightness-110"
                              />
                            </div>
                            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 truncate max-w-[48px]">
                              {item.date.slice(5)}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. CAMPAIGNS TAB */}
        {activeTab === 'campaigns' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                  Best-Performing Campaigns
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Tracked by `utm_campaign`, `utm_source` and `utm_medium`
                </p>
              </div>
            </div>

            {!analytics?.topCampaigns || analytics.topCampaigns.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-slate-800 text-gray-400 mx-auto flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-white">
                  No active campaigns recorded yet
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                  Generate trackable social links for Instagram stories, TikTok bio, or Facebook
                  posts using the "Create Social Link" button above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pl-2">Campaign Name</th>
                      <th className="pb-3">Platform</th>
                      <th className="pb-3">Medium</th>
                      <th className="pb-3 text-right">Visitors</th>
                      <th className="pb-3 text-right">Cart Adds</th>
                      <th className="pb-3 text-right">Orders</th>
                      <th className="pb-3 text-right">Revenue</th>
                      <th className="pb-3 text-right pr-2">Conversion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {analytics.topCampaigns.map((c, i) => (
                      <tr
                        key={`camp-${i}`}
                        className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3.5 pl-2 font-bold text-gray-900 dark:text-white">
                          {c.campaign}
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              c.platform === 'instagram'
                                ? 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                                : c.platform === 'tiktok'
                                ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white'
                                : c.platform === 'facebook'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {c.platform}
                          </span>
                        </td>
                        <td className="py-3.5 text-gray-600 dark:text-slate-300 font-mono text-[11px]">
                          {c.medium || 'direct'}
                        </td>
                        <td className="py-3.5 text-right font-bold text-gray-900 dark:text-white">
                          {c.visitors.toLocaleString()}
                        </td>
                        <td className="py-3.5 text-right text-gray-600 dark:text-slate-300">
                          {c.addToCarts.toLocaleString()}
                        </td>
                        <td className="py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {c.orders.toLocaleString()}
                        </td>
                        <td className="py-3.5 text-right font-bold text-gray-900 dark:text-white">
                          {STORE_CONFIG.STORE_CURRENCY}
                          {c.revenue.toLocaleString()}
                        </td>
                        <td className="py-3.5 text-right pr-2">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {c.conversionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 6. TOP PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                  Best-Performing Products from Social Traffic
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Products generating the highest engagement and verified orders
                </p>
              </div>
            </div>

            {!analytics?.topProducts || analytics.topProducts.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-slate-800 text-gray-400 mx-auto flex items-center justify-center">
                  <Package className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-white">
                  No product social views recorded yet
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                  As customers click your social links and view product pages, performance metrics
                  will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pl-2">Product</th>
                      <th className="pb-3 text-right">Views</th>
                      <th className="pb-3 text-right">Cart Adds</th>
                      <th className="pb-3 text-right">Paid Orders</th>
                      <th className="pb-3 text-right">Revenue</th>
                      <th className="pb-3 text-right">Conversion</th>
                      <th className="pb-3 text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {analytics.topProducts.map((p, i) => {
                      const matchedProduct = products.find((prod) => prod.id === p.productId);
                      return (
                        <tr
                          key={`prod-${i}`}
                          className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3.5 pl-2">
                            <div className="flex items-center gap-3">
                              {matchedProduct?.images && matchedProduct.images[0] ? (
                                <img
                                  src={matchedProduct.images[0]}
                                  alt={p.productName}
                                  className="w-10 h-10 rounded-xl object-cover border border-gray-100 dark:border-slate-800 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 shrink-0 flex items-center justify-center text-gray-400">
                                  <Package className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 dark:text-white truncate">
                                  {p.productName}
                                </p>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  ID: {p.productId.slice(0, 8)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 text-right font-bold text-gray-900 dark:text-white">
                            {p.views.toLocaleString()}
                          </td>
                          <td className="py-3.5 text-right text-gray-600 dark:text-slate-300">
                            {p.addToCarts.toLocaleString()}
                          </td>
                          <td className="py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {p.orders.toLocaleString()}
                          </td>
                          <td className="py-3.5 text-right font-bold text-gray-900 dark:text-white">
                            {STORE_CONFIG.STORE_CURRENCY}
                            {p.revenue.toLocaleString()}
                          </td>
                          <td className="py-3.5 text-right font-bold text-gray-900 dark:text-white">
                            {p.conversionRate}%
                          </td>
                          <td className="py-3.5 text-right pr-2">
                            {matchedProduct && (
                              <button
                                type="button"
                                onClick={() => openPromoForProduct(matchedProduct)}
                                className="px-2.5 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-[#ff6452] hover:text-white text-gray-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3" /> Link
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 7. PIXELS & CONVERSIONS API STATUS TAB */}
        {activeTab === 'pixels' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Meta Pixel & Conversions API Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center font-bold text-lg">
                    f
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Meta Pixel & Conversions API
                    </h3>
                    <p className="text-xs text-gray-400">Instagram & Facebook ads tracking</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready & Active
                </span>
              </div>

              <div className="space-y-3 text-xs text-gray-600 dark:text-slate-300">
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl space-y-1">
                  <span className="font-bold text-gray-700 dark:text-slate-300">
                    Standard Events Supported:
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5 text-gray-500 dark:text-slate-400">
                    <li>
                      <code className="font-mono text-emerald-600 dark:text-emerald-400">PageView</code> (store-wide)
                    </li>
                    <li>
                      <code className="font-mono text-emerald-600 dark:text-emerald-400">ViewContent</code> (exact product page)
                    </li>
                    <li>
                      <code className="font-mono text-emerald-600 dark:text-emerald-400">AddToCart</code> (product details & quick add)
                    </li>
                    <li>
                      <code className="font-mono text-emerald-600 dark:text-emerald-400">InitiateCheckout</code> (checkout start)
                    </li>
                    <li>
                      <code className="font-mono text-emerald-600 dark:text-emerald-400">Purchase</code> (verified after Yoco payment)
                    </li>
                  </ul>
                </div>

                <p className="leading-relaxed">
                  Both client-side Pixel tracking and server-side Conversions API (CAPI) payloads
                  are pre-formatted with user identity hashing and exact product attribution.
                </p>
              </div>
            </div>

            {/* TikTok Pixel & Events API Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center font-bold text-base">
                    tt
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      TikTok Pixel & Events API
                    </h3>
                    <p className="text-xs text-gray-400">TikTok ads & Spark Ads tracking</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready & Active
                </span>
              </div>

              <div className="space-y-3 text-xs text-gray-600 dark:text-slate-300">
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl space-y-1">
                  <span className="font-bold text-gray-700 dark:text-slate-300">
                    Standard Events Supported:
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5 text-gray-500 dark:text-slate-400">
                    <li>
                      <code className="font-mono text-emerald-600 dark:text-emerald-400">page()</code> (initial load)
                    </li>
                    <li>
                      <code className="font-mono text-emerald-600 dark:text-emerald-400">ViewContent</code> (product views)
                    </li>
                    <li>
                      <code className="font-mono text-emerald-600 dark:text-emerald-400">AddToCart</code> (cart adds)
                    </li>
                    <li>
                      <code className="font-mono text-emerald-600 dark:text-emerald-400">InitiateCheckout</code> (cart checkout)
                    </li>
                    <li>
                      <code className="font-mono text-emerald-600 dark:text-emerald-400">CompletePayment</code> (verified Yoco sales)
                    </li>
                  </ul>
                </div>

                <p className="leading-relaxed">
                  Attribution parameters (<code className="font-mono text-xs">ttclid</code>, <code className="font-mono text-xs">utm_source=tiktok</code>)
                  are preserved through checkout and attached to verified order records in Supabase.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 8. CATALOG DIRECT PROMO LAUNCHER */}
        <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Fast Campaign Links
            </div>
            <h3 className="text-xl font-black tracking-tight">
              Ready to post on Instagram, TikTok, or Facebook?
            </h3>
            <p className="text-xs text-white/90 leading-relaxed">
              Every campaign link opens the exact product page on KUD Store and preserves attribution
              all the way to Yoco payment confirmation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {products.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProductForPromo(products[0]);
                  setIsPromoModalOpen(true);
                }}
                className="px-5 py-3 bg-white text-gray-900 hover:bg-gray-100 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Launch Link Builder</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Social Promo Modal */}
      {selectedProductForPromo && (
        <ProductSocialPromoModal
          product={selectedProductForPromo}
          isOpen={isPromoModalOpen}
          onClose={() => setIsPromoModalOpen(false)}
        />
      )}
    </>
  );

  // Helper to render platform card
  function renderPlatformCard(
    title: string,
    metric: MarketingPlatformMetric | undefined,
    badgeGradient: string,
    emoji: string
  ) {
    const visitors = metric?.visitors || 0;
    const orders = metric?.orders || 0;
    const revenue = metric?.revenue || 0;
    const convRate = metric?.conversionRate || 0;

    return (
      <div
        key={title}
        className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{emoji}</span>
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">{title}</h4>
            </div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              {convRate.toFixed(1)}% CR
            </span>
          </div>

          <div className="pt-1">
            <span className="text-xs text-gray-400 dark:text-slate-400 block font-medium">
              Attributed Revenue
            </span>
            <p className="text-xl font-black text-gray-900 dark:text-white">
              {STORE_CONFIG.STORE_CURRENCY}
              {revenue.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-gray-400 dark:text-slate-500 block text-[10px]">Visitors</span>
            <span className="font-bold text-gray-800 dark:text-slate-200">
              {visitors.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-400 dark:text-slate-500 block text-[10px]">Paid Orders</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {orders.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Helper to render funnel
  function renderFunnelSection(funnel?: {
    productViews: number;
    addToCarts: number;
    checkoutsInitiated: number;
    purchasesCompleted: number;
  }) {
    const views = funnel?.productViews || 0;
    const carts = funnel?.addToCarts || 0;
    const checkouts = funnel?.checkoutsInitiated || 0;
    const purchases = funnel?.purchasesCompleted || 0;

    const baseCount = Math.max(views, 1);
    const cartPct = Math.min(100, Math.round((carts / baseCount) * 100));
    const checkoutPct = Math.min(100, Math.round((checkouts / baseCount) * 100));
    const purchasePct = Math.min(100, Math.round((purchases / baseCount) * 100));

    const funnelSteps = [
      {
        step: 1,
        title: 'Product Views',
        desc: 'Campaign link clicks to product pages',
        count: views,
        pct: 100,
        color: 'from-blue-500 to-indigo-500',
      },
      {
        step: 2,
        title: 'Added to Cart',
        desc: 'Customer clicked Add to Cart or Buy Now',
        count: carts,
        pct: cartPct,
        color: 'from-purple-500 to-pink-500',
      },
      {
        step: 3,
        title: 'Checkout Started',
        desc: 'Customer entered delivery address',
        count: checkouts,
        pct: checkoutPct,
        color: 'from-rose-500 to-amber-500',
      },
      {
        step: 4,
        title: 'Payment Confirmed',
        desc: 'Yoco verified successful payment',
        count: purchases,
        pct: purchasePct,
        color: 'from-emerald-500 to-teal-500',
      },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {funnelSteps.map((s, idx) => (
          <div
            key={`step-${idx}`}
            className="p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 dark:text-slate-400">
                Step {s.step}
              </span>
              <span className="text-xs font-black text-gray-900 dark:text-white">
                {s.pct}% of views
              </span>
            </div>

            <div>
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {s.count.toLocaleString()}
              </p>
              <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200 mt-0.5">
                {s.title}
              </h4>
              <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-1">{s.desc}</p>
            </div>

            {/* Progress indicator bar */}
            <div className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.max(s.pct, 4)}%` }}
                className={`h-full bg-gradient-to-r ${s.color} rounded-full`}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }
};
