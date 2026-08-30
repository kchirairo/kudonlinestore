import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  Mail,
  Gift,
  Users,
  ShieldCheck,
  Sparkles,
  QrCode,
  Send,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Download,
  Smartphone,
  Maximize2,
  RefreshCw,
  Tag,
  Wallet,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { STORE_CONFIG } from '../constants/config';
import { ReferralRedemptionModal } from './ReferralRedemptionModal';
import { referralService } from '../services/referralService';
import { UserReferralRewardsState } from '../types';

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, showToast } = useShop();
  
  // Tabs: 'qr' (Scannable QR Code screen), 'email' (Resend direct transactional email), or 'share' (Quick links, WhatsApp, Native)
  const [activeTab, setActiveTab] = useState<'qr' | 'email' | 'share'>('qr');

  // Copy & QR state
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrColor, setQrColor] = useState<'16a34a' | '0f172a' | 'ef4444'>('16a34a');
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [isQrZoomed, setIsQrZoomed] = useState(false);

  // Redemption modal state
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [userRewards, setUserRewards] = useState<UserReferralRewardsState | null>(null);

  useEffect(() => {
    if (isOpen) {
      referralService.getUserRewards(user?.id || 'demo-user').then(setUserRewards).catch(() => {});
    }
  }, [isOpen, user?.id]);

  // Email Invitation Form State
  const [recipientEmails, setRecipientEmails] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentStatus, setEmailSentStatus] = useState<{
    success: boolean;
    message: string;
    sentCount: number;
    simulated?: boolean;
    results?: Array<{ recipientEmail: string; success: boolean; simulated?: boolean; message?: string }>;
  } | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  // Helper to parse comma/semicolon/whitespace/newline separated emails
  const parseEmailList = (input: string): string[] => {
    return Array.from(
      new Set(
        input
          .split(/[,;\s\n]+/)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.length > 3 && e.includes('@') && e.includes('.'))
      )
    );
  };

  const parsedEmails = parseEmailList(recipientEmails);

  const handleRemoveEmailChip = (emailToRemove: string) => {
    const updated = parsedEmails.filter((e) => e !== emailToRemove);
    setRecipientEmails(updated.join(', '));
  };

  const handleAddSampleEmails = () => {
    const samples = ['friend1@gmail.com', 'colleague@company.co.za', 'family@outlook.com'];
    const merged = Array.from(new Set([...parsedEmails, ...samples]));
    setRecipientEmails(merged.join(', '));
  };

  if (!isOpen) return null;

  // Generate personalized referral code and link based on user or fallback
  const referralCode = user?.id
    ? `KUD-${user.id.slice(0, 6).toUpperCase()}`
    : `KUD-VIBE${user?.fullName ? user.fullName.slice(0, 3).toUpperCase() : '2026'}`;

  const originUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://kudstore.co.za';
  const referralLink = `${originUrl}/?ref=${referralCode}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=${qrColor}&bgcolor=ffffff&data=${encodeURIComponent(
    referralLink
  )}`;

  const senderDisplayName =
    user?.fullName ||
    (user?.email ? user.email.split('@')[0] : 'Your Friend');

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = referralLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      showToast('Referral link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast('Failed to copy referral link', 'error');
    }
  };

  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(referralCode);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = referralCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedCode(true);
      showToast(`Referral code ${referralCode} copied!`, 'success');
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      showToast('Failed to copy code', 'error');
    }
  };

  const handleDownloadQr = async () => {
    try {
      setIsDownloadingQr(true);
      const res = await fetch(qrCodeUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kud-store-referral-${referralCode.toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('QR Code saved to device!', 'success');
    } catch {
      // Direct link fallback
      window.open(qrCodeUrl, '_blank');
      showToast('Opening high-res QR code image', 'info');
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: `${STORE_CONFIG.STORE_NAME} - Share the vibe!`,
      text: `Join me on ${STORE_CONFIG.STORE_NAME}! Use my referral code ${referralCode} to shop premium beauty, tech, and lifestyle items:`,
      url: referralLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User dismissed
      }
    } else {
      handleCopyLink();
    }
  };

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSentStatus(null);

    // Validate email list using the parsed email list
    const rawEmails = parseEmailList(recipientEmails);

    if (rawEmails.length === 0) {
      showToast('Please enter at least one valid recipient email address (e.g. name@domain.com)', 'error');
      return;
    }

    setIsSendingEmail(true);

    try {
      const response = await fetch('/api/send-referral-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmails: rawEmails,
          recipientName: recipientName.trim() || undefined,
          senderName: senderDisplayName,
          senderEmail: user?.email || undefined,
          referralCode,
          referralLink,
          customMessage: customMessage.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEmailSentStatus({
          success: true,
          message: data.message || `Successfully sent referral invitations to ${rawEmails.length} friend${rawEmails.length > 1 ? 's' : ''} simultaneously!`,
          sentCount: data.totalSent || rawEmails.length,
          simulated: data.simulated,
          results: data.results || rawEmails.map((em) => ({ recipientEmail: em, success: true, simulated: data.simulated })),
        });
        showToast(
          data.simulated
            ? `Referral email invitations simulated for ${rawEmails.length} recipient${rawEmails.length > 1 ? 's' : ''}`
            : `Referral invitations delivered to ${rawEmails.length} recipient${rawEmails.length > 1 ? 's' : ''} simultaneously!`,
          'success'
        );
        // Clear input on success
        setRecipientEmails('');
        setRecipientName('');
        setCustomMessage('');
      } else {
        const errorMsg = data.error || 'Failed to dispatch email invitations.';
        setEmailSentStatus({
          success: false,
          message: errorMsg,
          sentCount: 0,
        });
        showToast(errorMsg, 'error');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Network error while contacting referral email service.';
      setEmailSentStatus({
        success: false,
        message: errorMsg,
        sentCount: 0,
      });
      showToast(errorMsg, 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Hey! I've been shopping on ${STORE_CONFIG.STORE_NAME}. Use my referral link or code *${referralCode}* to get R50 off your first purchase:\n${referralLink}`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMessage}`;

  return (
    <div
      id="invite-friends-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[28px] shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Dismiss Button */}
        <button
          id="close-invite-friends-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer z-10"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header with Apple-Inspired Theme */}
        <div className="p-6 sm:p-7 text-center bg-gradient-to-b from-[#ecfdf5] via-[#ecfdf5]/40 to-transparent dark:from-emerald-950/30 dark:via-emerald-950/10">
          <div className="relative inline-block mb-3">
            <div className="w-15 h-15 sm:w-17 sm:h-17 mx-auto rounded-full bg-gradient-to-br from-[#22c55e] to-[#15803d] text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <svg
                className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow-sm"
                viewBox="0 0 44 44"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 15C10 13.8954 10.8954 13 12 13H32C33.1046 13 34 13.8954 34 15L35.5 33C35.5 35.2091 33.7091 37 31.5 37H12.5C10.2909 37 8.5 35.2091 8.5 33L10 15Z"
                  fill="white"
                />
                <path
                  d="M16 14V11C16 7.68629 18.6863 5 22 5C25.3137 5 28 7.68629 28 11V14"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="16" cy="15" r="1.5" fill="#15803d" />
                <circle cx="28" cy="15" r="1.5" fill="#15803d" />
                <path
                  d="M22 30.5L20.85 29.45C16.8 25.75 14 23.2 14 20C14 17.4 16 15.4 18.6 15.4C20.05 15.4 21.45 16.1 22 17.15C22.55 16.1 23.95 15.4 25.4 15.4C28 15.4 30 17.4 30 20C30 23.2 27.2 25.75 23.15 29.45L22 30.5Z"
                  fill="#ef4444"
                />
              </svg>
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ef4444] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
              <Sparkles className="w-3 h-3" />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Invite Friends & <span className="text-[#16a34a] dark:text-[#22c55e]">Share the Vibe</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Gift your contacts <strong>R50 OFF</strong> on their first order and earn shopping credits.
          </p>

          {/* User's Current Reward Balance & Quick Redeem Action (Hidden if admin disabled earnings or banned) */}
          {!userRewards?.hideReferralEarnings && !userRewards?.isBanned && (
            <div className="mt-3 inline-flex items-center gap-2 p-1.5 pl-3 pr-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-full border border-emerald-200 dark:border-emerald-900/50">
              <Gift className="w-3.5 h-3.5 text-[#16a34a]" />
              <span className="text-[11px] text-gray-600 dark:text-slate-300 font-medium">
                Your Rewards: <strong className="text-emerald-700 dark:text-emerald-300 font-mono font-bold">{STORE_CONFIG.STORE_CURRENCY}{userRewards?.referralBalance ?? 150}</strong>
              </span>
              <button
                id="invite-modal-quick-redeem-btn"
                type="button"
                onClick={() => setIsRedeemModalOpen(true)}
                className="px-2.5 py-1 bg-[#16a34a] hover:bg-[#15803d] text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-2xs transition-all cursor-pointer"
              >
                Redeem
              </button>
            </div>
          )}

          {/* Account Restricted Notice */}
          {userRewards?.isBanned && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-red-800 dark:text-red-300">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Your account has been restricted by store admins from sharing referral invitations.</span>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 dark:bg-slate-800 rounded-2xl max-w-sm mx-auto mt-4">
            <button
              id="tab-scan-qr-code"
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-[#16a34a]" />
              <span>Scan QR</span>
            </button>

            <button
              id="tab-send-email-invite"
              type="button"
              onClick={() => setActiveTab('email')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'email'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-[#ef4444]" />
              <span>Email</span>
            </button>

            <button
              id="tab-share-links"
              type="button"
              onClick={() => setActiveTab('share')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'share'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>Links</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 pt-0 space-y-4 max-h-[70vh] overflow-y-auto">
          {activeTab === 'qr' ? (
            /* Dedicated Interactive Scannable QR Code Screen */
            <div className="space-y-4 text-center">
              {/* Main Crisp High-Resolution QR Card */}
              <div className="relative p-5 sm:p-6 bg-gradient-to-b from-emerald-50/50 via-white to-gray-50 dark:from-emerald-950/20 dark:via-slate-800 dark:to-slate-800/60 rounded-3xl border border-emerald-100 dark:border-slate-700 shadow-sm flex flex-col items-center">
                
                {/* Visual Header Note */}
                <div className="flex items-center gap-2 mb-3.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-3.5 py-1.5 rounded-full">
                  <Smartphone className="w-3.5 h-3.5 text-[#16a34a] animate-pulse" />
                  <span>Show screen for friends to scan with their camera</span>
                </div>

                {/* The QR Container */}
                <div
                  className={`relative p-3.5 bg-white rounded-2xl shadow-md border-2 border-emerald-500/20 transition-all ${
                    isQrZoomed ? 'scale-105 shadow-xl' : 'hover:shadow-lg'
                  }`}
                >
                  <img
                    id="referral-qr-code-img"
                    src={qrCodeUrl}
                    alt={`KUD Store Referral QR Code for ${referralCode}`}
                    className="w-44 h-44 sm:w-52 sm:h-52 object-contain rounded-lg"
                    loading="eager"
                  />

                  {/* Centered Brand Bag Watermark Badge */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-md border border-emerald-100 flex items-center justify-center p-1">
                      <div className="w-full h-full rounded-full bg-[#16a34a] flex items-center justify-center text-white">
                        <Gift className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referral Code & Voucher Tag */}
                <div className="mt-3.5 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
                    Promo Code:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-xs font-mono font-extrabold text-[#15803d] dark:text-emerald-400 hover:bg-gray-50 cursor-pointer shadow-2xs"
                  >
                    <span>{referralCode}</span>
                    {copiedCode ? (
                      <Check className="w-3 h-3 text-[#16a34a]" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Color Scheme Picker */}
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                  <span className="text-[11px] font-medium">QR Color:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQrColor('16a34a')}
                      className={`w-5 h-5 rounded-full bg-[#16a34a] transition-all cursor-pointer ${
                        qrColor === '16a34a' ? 'ring-2 ring-offset-2 ring-[#16a34a] scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      title="Emerald Green QR"
                    />
                    <button
                      type="button"
                      onClick={() => setQrColor('0f172a')}
                      className={`w-5 h-5 rounded-full bg-[#0f172a] transition-all cursor-pointer ${
                        qrColor === '0f172a' ? 'ring-2 ring-offset-2 ring-[#0f172a] scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      title="Midnight Dark QR"
                    />
                    <button
                      type="button"
                      onClick={() => setQrColor('ef4444')}
                      className={`w-5 h-5 rounded-full bg-[#ef4444] transition-all cursor-pointer ${
                        qrColor === 'ef4444' ? 'ring-2 ring-offset-2 ring-[#ef4444] scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      title="Vibrant Red QR"
                    />
                  </div>
                </div>
              </div>

              {/* QR Quick Actions: Download, Zoom & Copy Link */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  id="download-referral-qr-btn"
                  type="button"
                  onClick={handleDownloadQr}
                  disabled={isDownloadingQr}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs"
                >
                  {isDownloadingQr ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#16a34a]" />
                  ) : (
                    <Download className="w-4 h-4 text-[#16a34a]" />
                  )}
                  <span>Save QR Image</span>
                </button>

                <button
                  id="copy-referral-link-qr-tab-btn"
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-md shadow-red-500/20"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : activeTab === 'email' ? (
            /* Direct Resend Transactional Email Sender Form with Comma-Separated Multi-Recipient Support */
            <div className="space-y-4">
              <form onSubmit={handleSendEmailInvite} className="space-y-3.5">
                {/* Recipient Email Input Supporting Comma-Separated Lists */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#ef4444]" />
                      <span>Recipient Email Addresses <span className="text-red-500">*</span></span>
                    </label>
                    <div className="flex items-center gap-2">
                      {parsedEmails.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                          {parsedEmails.length} contact{parsedEmails.length > 1 ? 's' : ''} detected
                        </span>
                      )}
                      {parsedEmails.length === 0 && (
                        <button
                          type="button"
                          onClick={handleAddSampleEmails}
                          className="text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                        >
                          + Quick Sample
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      id="referral-recipient-email-input"
                      required
                      rows={2}
                      placeholder="Enter emails separated by commas (e.g. friend1@gmail.com, colleague@work.co.za, sarah@yahoo.com)"
                      value={recipientEmails}
                      onChange={(e) => setRecipientEmails(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#16a34a]/30 focus:border-[#16a34a] font-mono"
                    />
                  </div>

                  {/* Render Parsed Recipient Chips */}
                  {parsedEmails.length > 0 && (
                    <div className="pt-1 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400">
                        <span className="font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#16a34a]" />
                          Will trigger simultaneously ({parsedEmails.length}):
                        </span>
                        <button
                          type="button"
                          onClick={() => setRecipientEmails('')}
                          className="text-[10px] text-gray-400 hover:text-red-500 cursor-pointer"
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700/60">
                        {parsedEmails.map((email) => (
                          <span
                            key={email}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-600 shadow-2xs group"
                          >
                            <Mail className="w-2.5 h-2.5 text-emerald-500" />
                            <span className="truncate max-w-[150px]">{email}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEmailChip(email)}
                              className="w-3.5 h-3.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-gray-400 hover:text-red-600 flex items-center justify-center cursor-pointer ml-0.5"
                              title={`Remove ${email}`}
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-400 dark:text-slate-500">
                    Tip: Paste a comma-separated list of up to 20 emails to invite multiple friends at once.
                  </p>
                </div>

                {/* Friend's Name (Optional) & Sender Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 block">
                      Greeting Name <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      id="referral-recipient-name-input"
                      type="text"
                      placeholder={parsedEmails.length > 1 ? 'e.g. Friends / Team' : 'e.g. Sarah'}
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#16a34a]/30 focus:border-[#16a34a]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 block">
                      Sender Name
                    </label>
                    <div className="px-3 py-2 bg-gray-100 dark:bg-slate-800 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 truncate border border-gray-200/60 dark:border-slate-700/60">
                      {senderDisplayName}
                    </div>
                  </div>
                </div>

                {/* Optional Custom Message Note */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 flex items-center gap-1">
                      <span>Personal Note <span className="text-gray-400 font-normal">(Optional)</span></span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCustomMessage("Hey! Check out KUD Store for trendy fashion, beauty & tech. Use my link to get R50 off!")}
                        className="text-[9px] text-gray-500 hover:text-[#16a34a] font-medium bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        Preset 1
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomMessage("Gifting you R50 discount voucher for your first KUD Store haul! Enjoy shopping!")}
                        className="text-[9px] text-gray-500 hover:text-[#16a34a] font-medium bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        Preset 2
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="referral-custom-message-input"
                    rows={2}
                    placeholder="e.g. Hey! I found this awesome South African online store. Use my link for R50 off!"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#16a34a]/30 focus:border-[#16a34a] resize-none"
                  />
                </div>

                {/* Toggle Branded Email Preview */}
                <div className="flex items-center justify-between pt-0.5">
                  <button
                    id="toggle-email-preview-btn"
                    type="button"
                    onClick={() => setShowEmailPreview(!showEmailPreview)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16a34a] hover:text-[#15803d] dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {showEmailPreview ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide Branded Template Preview</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Resend Branded Email Template</span>
                      </>
                    )}
                  </button>

                  <span className="text-[11px] text-gray-400 font-medium">
                    Powered by Resend
                  </span>
                </div>

                {/* Live Email Template Mockup Preview */}
                {showEmailPreview && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-gray-200 dark:border-slate-700 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-sm text-left">
                      {/* Email Header Mock */}
                      <div className="text-center pb-3 border-b border-gray-100 dark:border-slate-800">
                        <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-[#22c55e] to-[#15803d] text-white flex items-center justify-center shadow-xs mb-1">
                          <Gift className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-black tracking-tight text-gray-900 dark:text-white">
                          KUD STORE <span className="text-[#16a34a]">• INVITATION</span>
                        </span>
                      </div>

                      {/* Email Content Mock */}
                      <div className="py-3 space-y-2.5 text-xs text-gray-700 dark:text-slate-300">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          Hi {recipientName.trim() || (parsedEmails.length > 1 ? 'there' : 'Friend')},
                        </p>
                        <p className="text-gray-600 dark:text-slate-400 leading-relaxed">
                          <strong>{senderDisplayName}</strong> invited you to shop on KUD Store and gifted you an exclusive discount!
                        </p>

                        {customMessage.trim() && (
                          <div className="p-2.5 bg-gray-50 dark:bg-slate-800 rounded-lg border-l-2 border-[#16a34a] italic text-[11px] text-gray-700 dark:text-slate-300">
                            &ldquo;{customMessage.trim()}&rdquo;
                          </div>
                        )}

                        {/* Gift Card Mock */}
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 text-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                            Welcome Gift
                          </span>
                          <span className="text-lg font-black text-emerald-800 dark:text-emerald-300 block">
                            R50 OFF First Order
                          </span>
                          <span className="inline-block mt-1 font-mono text-[11px] font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-emerald-200 text-[#15803d] dark:text-emerald-400">
                            {referralCode}
                          </span>
                        </div>

                        {/* CTA Mock */}
                        <div className="text-center pt-1">
                          <span className="inline-block px-5 py-2 bg-[#ef4444] text-white font-bold text-xs rounded-full shadow-xs">
                            Claim R50 &amp; Shop Now &rarr;
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Feedback Banner with Individual Delivery Details */}
                {emailSentStatus && (
                  <div
                    className={`p-3.5 rounded-2xl text-xs space-y-2 ${
                      emailSentStatus.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/50'
                        : 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-900/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {emailSentStatus.success ? (
                        <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{emailSentStatus.message}</p>
                        {emailSentStatus.simulated && (
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                            Note: Configure <code>RESEND_API_KEY</code> in environment for live inbox delivery.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Breakdown of simultaneous recipients if available */}
                    {emailSentStatus.results && emailSentStatus.results.length > 0 && (
                      <div className="pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/40 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block">
                          Simultaneous Dispatch Results ({emailSentStatus.results.length}):
                        </span>
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {emailSentStatus.results.map((res, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-[11px] bg-white/80 dark:bg-slate-900/60 px-2 py-1 rounded-md font-mono"
                            >
                              <span className="truncate max-w-[200px]">{res.recipientEmail}</span>
                              <span className="flex items-center gap-1 text-[10px] font-sans font-bold text-emerald-700 dark:text-emerald-400">
                                <Check className="w-3 h-3 text-emerald-500" />
                                {res.simulated ? 'Logged' : 'Delivered'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Send Button with Simultaneous Indicator */}
                <button
                  id="send-referral-email-submit-btn"
                  type="submit"
                  disabled={isSendingEmail || parsedEmails.length === 0}
                  className="w-full py-3 px-6 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-full shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        Triggering Resend Template for {parsedEmails.length} Contact{parsedEmails.length > 1 ? 's' : ''} Simultaneously...
                      </span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        {parsedEmails.length > 1
                          ? `Send to All ${parsedEmails.length} Contacts Simultaneously`
                          : 'Send Branded Invitation Email'}
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Quick Links & Direct Share Tab */
            <div className="space-y-4">
              {/* Main Shareable Referral Link Box with Easy One-Click Copy */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 block">
                  Your Unique Referral Link
                </label>
                <div className="p-2 pl-3.5 bg-gray-50 dark:bg-slate-800/80 rounded-2xl border border-gray-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      readOnly
                      value={referralLink}
                      className="w-full bg-transparent font-mono text-xs sm:text-sm font-semibold text-gray-800 dark:text-slate-200 outline-hidden select-all"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </div>
                  <button
                    id="referral-copy-link-btn"
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-red-500/20 shrink-0 cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Referral Code Quick Copy Pill */}
              <div className="flex items-center justify-between p-3 px-4 bg-[#ecfdf5]/70 dark:bg-emerald-950/20 rounded-2xl border border-[#d1fae5] dark:border-emerald-900/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 text-[#16a34a] dark:text-[#22c55e] flex items-center justify-center font-black text-xs shadow-2xs">
                    #
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-400 block leading-tight">
                      Referral Code
                    </span>
                    <span className="text-xs sm:text-sm font-mono font-extrabold text-[#15803d] dark:text-emerald-400">
                      {referralCode}
                    </span>
                  </div>
                </div>

                <button
                  id="referral-copy-code-btn"
                  type="button"
                  onClick={handleCopyCode}
                  className="text-xs font-bold text-[#16a34a] hover:text-[#15803d] dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Instant Social / Messaging Sharing Channels */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 block">
                  Share Via Apps
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    id="referral-whatsapp-share"
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] dark:text-[#25D366] text-xs sm:text-sm font-bold transition-all"
                  >
                    <span>WhatsApp</span>
                  </a>

                  <button
                    id="referral-native-share"
                    type="button"
                    onClick={handleNativeShare}
                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Native Share</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* How It Works - 3 Step Apple Minimalist List */}
          <div className="p-4 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-white">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#16a34a] dark:text-[#22c55e]" />
                How Referral Commission Works
              </span>
              <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full">
                2 Purchases / Month Policy
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-gray-600 dark:text-slate-400 pt-1">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/60 shadow-2xs">
                <span className="font-bold text-gray-900 dark:text-white block mb-0.5">1. Invite Friend</span>
                Share link or QR code
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/60 shadow-2xs">
                <span className="font-bold text-gray-900 dark:text-white block mb-0.5">2. Friend Buys 2x</span>
                Makes ≥2 orders in a month
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/60 shadow-2xs">
                <span className="font-bold text-gray-900 dark:text-white block mb-0.5">3. Admin Allocates</span>
                R50 commission credited
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Referral Reward Redemption Modal */}
      <ReferralRedemptionModal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
        onSuccess={() => {
          referralService.getUserRewards(user?.id || 'demo-user').then(setUserRewards).catch(() => {});
        }}
      />
    </div>
  );
};

