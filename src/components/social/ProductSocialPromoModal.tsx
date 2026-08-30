import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Share2,
  Download,
  Sparkles,
  MessageCircle,
  Tag,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Product } from '../../types';
import { buildSocialCampaignUrl, getPlatformBadgeConfig } from '../../utils/utmTracker';
import { STORE_CONFIG } from '../../constants/config';

interface ProductSocialPromoModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

type PlatformTab = 'instagram' | 'tiktok' | 'facebook' | 'whatsapp' | 'custom';

export const ProductSocialPromoModal: React.FC<ProductSocialPromoModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<PlatformTab>('instagram');
  const [campaignName, setCampaignName] = useState<string>('flash_drop');
  const [medium, setMedium] = useState<string>('story');
  const [contentTag, setContentTag] = useState<string>('hero_cta');
  const [promoCode, setPromoCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showQr, setShowQr] = useState<boolean>(false);

  // Set default medium whenever platform changes
  useEffect(() => {
    if (activeTab === 'instagram') setMedium('story');
    else if (activeTab === 'tiktok') setMedium('bio_link');
    else if (activeTab === 'facebook') setMedium('feed_post');
    else if (activeTab === 'whatsapp') setMedium('chat_share');
    else setMedium('custom_campaign');
  }, [activeTab]);

  // Compute exact product campaign URL
  const campaignUrl = buildSocialCampaignUrl({
    productId: product.id,
    platform: activeTab === 'custom' ? 'social' : activeTab,
    campaign: campaignName || 'spring_sale',
    medium,
    content: contentTag,
    discountCode: promoCode,
  });

  // Generate QR Code image when URL changes or QR is toggled
  useEffect(() => {
    if (!campaignUrl) return;
    QRCode.toDataURL(campaignUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('QR code generation error:', err));
  }, [campaignUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(campaignUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback prompt
      window.prompt('Copy campaign link:', campaignUrl);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🛍️ Check out *${product.name}* at ${STORE_CONFIG.STORE_NAME} for ${STORE_CONFIG.STORE_CURRENCY}${product.price}!\n\nDirect product link: ${campaignUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleFacebookShare = () => {
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(campaignUrl)}`;
    window.open(fbShareUrl, '_blank', 'width=600,height=450');
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `kud-qr-${product.id}-${activeTab}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const badge = getPlatformBadgeConfig(activeTab === 'custom' ? 'other' : activeTab);

  return (
    <div
      id="product-social-promo-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="product-social-promo-modal-card"
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-[#ff6452] flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Social Commerce & Campaign Link
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Generate trackable product links with full UTM attribution
              </p>
            </div>
          </div>
          <button
            id="close-social-promo-modal-btn"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product summary snippet */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
          {product.images && product.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-slate-700 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-slate-700 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#ff6452]">{product.brand || 'KUD Store'}</p>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {product.name}
            </h4>
            <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
              {STORE_CONFIG.STORE_CURRENCY}
              {product.price.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tabs for platforms */}
        <div className="px-6 pt-4 border-b border-gray-100 dark:border-slate-800 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            id="tab-promo-instagram"
            type="button"
            onClick={() => setActiveTab('instagram')}
            className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'instagram'
                ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Instagram
          </button>
          <button
            id="tab-promo-tiktok"
            type="button"
            onClick={() => setActiveTab('tiktok')}
            className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'tiktok'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            TikTok
          </button>
          <button
            id="tab-promo-facebook"
            type="button"
            onClick={() => setActiveTab('facebook')}
            className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'facebook'
                ? 'bg-[#1877F2] text-white shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Facebook
          </button>
          <button
            id="tab-promo-whatsapp"
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'whatsapp'
                ? 'bg-[#25D366] text-white shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            WhatsApp
          </button>
          <button
            id="tab-promo-custom"
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'custom'
                ? 'bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Custom UTM
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Preset placement / medium selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
              Campaign Preset & Placement
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activeTab === 'instagram' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMedium('story');
                      setCampaignName('ig_story_drop');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      medium === 'story'
                        ? 'border-pink-500 bg-pink-50/50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    📸 Instagram Story
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMedium('bio_link');
                      setCampaignName('ig_bio_link');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      medium === 'bio_link'
                        ? 'border-pink-500 bg-pink-50/50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    🔗 Bio / Linktree
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMedium('reel_post');
                      setCampaignName('ig_reels_promo');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      medium === 'reel_post'
                        ? 'border-pink-500 bg-pink-50/50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    🎬 Reels / Feed
                  </button>
                </>
              )}

              {activeTab === 'tiktok' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMedium('bio_link');
                      setCampaignName('tiktok_bio_drop');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      medium === 'bio_link'
                        ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    🎵 TikTok Bio Link
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMedium('video_caption');
                      setCampaignName('tiktok_trending');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      medium === 'video_caption'
                        ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    📹 Video Caption
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMedium('spark_ad');
                      setCampaignName('tiktok_ads_push');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      medium === 'spark_ad'
                        ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    ⚡ TikTok Spark Ad
                  </button>
                </>
              )}

              {activeTab === 'facebook' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMedium('feed_post');
                      setCampaignName('fb_page_post');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      medium === 'feed_post'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    📘 Page Feed Post
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMedium('fb_story');
                      setCampaignName('fb_stories');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      medium === 'fb_story'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    📱 Facebook Story
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMedium('group_post');
                      setCampaignName('fb_community');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      medium === 'group_post'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    👥 Community Group
                  </button>
                </>
              )}

              {activeTab === 'whatsapp' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMedium('chat_share');
                      setCampaignName('wa_customer_direct');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      medium === 'chat_share'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    💬 Direct Chat Share
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMedium('wa_status');
                      setCampaignName('wa_status_update');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      medium === 'wa_status'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    ⭕ WhatsApp Status
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMedium('wa_broadcast');
                      setCampaignName('wa_vip_broadcast');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      medium === 'wa_broadcast'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    📢 Broadcast List
                  </button>
                </>
              )}

              {activeTab === 'custom' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMedium('influencer_promo');
                      setCampaignName('influencer_drop');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      medium === 'influencer_promo'
                        ? 'border-gray-900 dark:border-white bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    🌟 Influencer Collab
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMedium('email_newsletter');
                      setCampaignName('weekly_curated');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      medium === 'email_newsletter'
                        ? 'border-gray-900 dark:border-white bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    📧 Newsletter Feature
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMedium('paid_ad');
                      setCampaignName('retargeting_v1');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      medium === 'paid_ad'
                        ? 'border-gray-900 dark:border-white bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    🎯 Paid Retargeting
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Campaign details customization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Campaign Name (utm_campaign)
              </label>
              <input
                id="input-promo-campaign-name"
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. spring_sale"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Promo Code Tag (Optional)
              </label>
              <div className="relative">
                <input
                  id="input-promo-code"
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="e.g. TIKTOK10"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452]"
                />
                <Tag className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Generated URL Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                Direct Trackable Product URL
              </label>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Opens exact product page
              </span>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-slate-800/80 rounded-2xl border border-gray-200 dark:border-slate-700 flex items-center gap-2">
              <input
                id="input-generated-campaign-url"
                readOnly
                value={campaignUrl}
                className="w-full bg-transparent text-xs font-mono text-gray-800 dark:text-slate-200 focus:outline-hidden"
              />
              <button
                id="copy-campaign-url-btn"
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-slate-100'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* QR Code toggle and view */}
          <div className="border border-gray-100 dark:border-slate-800 rounded-2xl p-4 bg-gray-50/50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  Mobile QR Code for Stories & Print
                </span>
              </div>
              <button
                id="toggle-qr-code-view-btn"
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="text-xs font-semibold text-[#ff6452] hover:underline"
              >
                {showQr ? 'Hide QR' : 'Show QR Code'}
              </button>
            </div>

            {showQr && qrDataUrl && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-200">
                  <img src={qrDataUrl} alt="Campaign QR Code" className="w-28 h-28" />
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <p className="text-xs text-gray-600 dark:text-slate-400">
                    Scan with any smartphone camera to open this product directly on{' '}
                    <span className="font-bold text-gray-900 dark:text-white">
                      {STORE_CONFIG.STORE_NAME}
                    </span>
                    .
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200 text-xs font-bold hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download QR Code (.png)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {activeTab === 'whatsapp' && (
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="px-4 py-2 bg-[#25D366] text-white rounded-xl text-xs font-bold hover:bg-[#20ba59] transition-colors flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Share on WhatsApp
              </button>
            )}
            {activeTab === 'facebook' && (
              <button
                type="button"
                onClick={handleFacebookShare}
                className="px-4 py-2 bg-[#1877F2] text-white rounded-xl text-xs font-bold hover:bg-[#166fe5] transition-colors flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" /> Share on Facebook
              </button>
            )}
            <a
              href={campaignUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Test Link in New Tab
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
