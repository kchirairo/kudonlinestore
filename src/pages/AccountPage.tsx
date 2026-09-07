import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  ShoppingBag,
  Package,
  Heart,
  LogOut,
  Mail,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  Truck,
  Search,
  Share2,
  Gift,
  Tag,
  Wallet,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  Bell,
  BellRing,
  X,
  Calendar,
  Snowflake,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { STORE_CONFIG } from '../constants/config';
import { SEOHead } from '../components/SEOHead';
import { getAuthRedirectUrl } from '../utils/authRedirect';
import { TrackOrderModal } from '../components/TrackOrderModal';
import { CustomerProfileDetailsCard } from '../components/CustomerProfileDetailsCard';
import { CustomerOrderHelpCard } from '../components/CustomerOrderHelpCard';
import { CustomerReferralBanner } from '../components/CustomerReferralBanner';
import { InviteFriendsModal } from '../components/InviteFriendsModal';
import { ReferralRedemptionModal } from '../components/ReferralRedemptionModal';
import { LoyaltyTiersCard } from '../components/LoyaltyTiersCard';
import { TopReferrersLeaderboard } from '../components/TopReferrersLeaderboard';
import {
  referralService,
  getVoucherExpiryStatus,
  getEffectiveCustomerReferralSettings,
} from '../services/referralService';

import { UserReferralRewardsState, StoreReferralGlobalConfig, RedemptionType } from '../types';

/**
 * Clean Authentic Google "G" Brand Icon
 */
const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, showToast, generalSettings, isAccountDisabled, accountStatus, disabledReason } = useShop();
  const { loading: isAuthLoading, role, refetchProfile, isGoogleAuthEnabled: authGoogleAuthEnabled } = useAuth();

  // Check if admin has enabled or disabled Google social authentication (from AuthContext or ShopContext)
  const isGoogleAuthEnabled =
    authGoogleAuthEnabled !== undefined
      ? authGoogleAuthEnabled
      : generalSettings?.isGoogleAuthEnabled !== false && generalSettings?.enableGoogleAuth !== false;

  // Initialize sign up mode from pathname or query param
  const [isSignUp, setIsSignUp] = useState<boolean>(() => {
    const search = new URLSearchParams(location.search);
    return (
      location.pathname.includes('signup') ||
      location.pathname.includes('register') ||
      search.get('mode') === 'signup' ||
      search.get('tab') === 'signup'
    );
  });

  // Keep isSignUp in sync when routing changes (e.g. /login vs /signup vs /register)
  useEffect(() => {
    const search = new URLSearchParams(location.search);
    if (
      location.pathname.includes('signup') ||
      location.pathname.includes('register') ||
      search.get('mode') === 'signup' ||
      search.get('tab') === 'signup'
    ) {
      setIsSignUp(true);
    } else if (
      location.pathname.includes('login') ||
      search.get('mode') === 'login' ||
      search.get('tab') === 'login'
    ) {
      setIsSignUp(false);
    }
  }, [location.pathname, location.search]);
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Email confirmation & pending verification states
  const [signupPendingVerification, setSignupPendingVerification] = useState<boolean>(false);
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState<boolean>(false);

  // Track Order Modal state (for authenticated customer profile)
  const [isTrackOrderModalOpen, setIsTrackOrderModalOpen] = useState<boolean>(false);
  const [trackOrderInitialId, setTrackOrderInitialId] = useState<string>('');
  const [inlineTrackQuery, setInlineTrackQuery] = useState<string>('');

  // Invite Friends Modal state
  const [isInviteFriendsModalOpen, setIsInviteFriendsModalOpen] = useState<boolean>(false);

  // Referral Reward Redemption Modal State
  const [isRedemptionModalOpen, setIsRedemptionModalOpen] = useState<boolean>(false);
  const [redemptionInitialType, setRedemptionInitialType] = useState<RedemptionType>('discount_voucher');
  const [userRewards, setUserRewards] = useState<UserReferralRewardsState | null>(null);
  const [globalReferralConfig, setGlobalReferralConfig] = useState<StoreReferralGlobalConfig | null>(null);
  const [copiedVoucherId, setCopiedVoucherId] = useState<string | null>(null);
  const [showVoucherHistory, setShowVoucherHistory] = useState<boolean>(false);

  // Expiration notifications state
  const [hasDismissedExpiryBanner, setHasDismissedExpiryBanner] = useState<boolean>(false);
  const [hasTriggeredExpiryToast, setHasTriggeredExpiryToast] = useState<boolean>(false);

  // Effective referral permissions and visibility
  const effectiveReferral = getEffectiveCustomerReferralSettings(userRewards, globalReferralConfig);

  // Active expiring vouchers calculation
  const activeVouchers = userRewards?.vouchers?.filter((v) => v.status === 'active') || [];
  const expiringVouchers = activeVouchers.filter((v) => getVoucherExpiryStatus(v.voucherExpiry).isExpiringSoon);
  const hasExpiringVouchers = expiringVouchers.length > 0;

  // Load user rewards and global referral configuration
  const fetchUserRewards = async () => {
    try {
      const cfg = await referralService.getStoreReferralConfig();
      setGlobalReferralConfig(cfg);
      if (user) {
        const data = await referralService.getUserRewards(user.id);
        setUserRewards(data);
      }
    } catch (e) {
      console.warn('Error fetching rewards on account page:', e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserRewards();
    }
  }, [user]);

  // Trigger toast alert once on account page load if any vouchers are approaching expiration
  useEffect(() => {
    if (userRewards && !hasTriggeredExpiryToast && hasExpiringVouchers) {
      setHasTriggeredExpiryToast(true);
      const firstExp = expiringVouchers[0];
      const expiryInfo = getVoucherExpiryStatus(firstExp.voucherExpiry);
      showToast(
        `⏳ Reward Expiry Alert: Voucher ${firstExp.voucherCode} (${STORE_CONFIG.STORE_CURRENCY}${firstExp.amount} OFF) ${expiryInfo.badgeLabel.toLowerCase()}! Use it in your cart before it lapses.`,
        'info'
      );
    }
  }, [userRewards, hasTriggeredExpiryToast, hasExpiringVouchers]);

  const handleCheckExpiryAlerts = () => {
    if (hasExpiringVouchers) {
      const firstExp = expiringVouchers[0];
      const expiryInfo = getVoucherExpiryStatus(firstExp.voucherExpiry);
      showToast(
        `⚠️ Expiry Alert: Voucher ${firstExp.voucherCode} (${STORE_CONFIG.STORE_CURRENCY}${firstExp.amount} OFF) ${expiryInfo.badgeLabel.toLowerCase()}!`,
        'info'
      );
    } else {
      showToast('All your reward vouchers and loyalty credits are up to date with plenty of time remaining!', 'success');
    }
  };

  const handleOpenRedeemModal = (type: RedemptionType = 'discount_voucher') => {
    setRedemptionInitialType(type);
    setIsRedemptionModalOpen(true);
  };

  const handleCopyVoucher = async (code: string, id: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      } else {
        const ta = document.createElement('textarea');
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedVoucherId(id);
      showToast(`Voucher code "${code}" copied!`, 'success');
      setTimeout(() => setCopiedVoucherId(null), 2500);
    } catch {
      showToast('Failed to copy voucher', 'error');
    }
  };

  // Forgot Password / Reset state
  const [resetEmail, setResetEmail] = useState<string>('');
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);
  const [resetSentSuccess, setResetSentSuccess] = useState<boolean>(false);
  const [resetCooldown, setResetCooldown] = useState<number>(0);

  // Cooldown timer for sending reset password emails
  useEffect(() => {
    if (resetCooldown <= 0) return;
    const interval = setInterval(() => {
      setResetCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resetCooldown]);

  // Cooldown timer for resending signup confirmation email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Check for OAuth error returned in URL query or hash params
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const errorDesc =
        searchParams.get('error_description') ||
        hashParams.get('error_description') ||
        searchParams.get('error') ||
        hashParams.get('error');

      if (errorDesc) {
        const decoded = decodeURIComponent(errorDesc.replace(/\+/g, ' '));
        setLoginError(decoded);
        showToast(decoded, 'error');
        // Clean up URL parameters cleanly
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  // Google OAuth Handler
  const handleGoogleSignIn = async () => {
    if (isGoogleLoading || isSubmitting || isResendingConfirmation) return;
    setIsGoogleLoading(true);
    setLoginError(null);

    try {
      if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase authentication is not configured.');
      }

      console.log('[Google Auth] Initiating signInWithOAuth for Google');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://kudstore.netlify.app',
        },
      });

      if (error) {
        throw error;
      }
      // Browser automatically navigates to Google Auth Provider page
    } catch (err: any) {
      console.error('[Google Auth] OAuth initiation failed:', err);
      const msg = err?.message || 'Failed to initiate Google sign in. Please try again.';
      setLoginError(msg);
      showToast(msg, 'error');
      setIsGoogleLoading(false);
    }
  };

  // Resend Confirmation Email Handler
  const handleResendConfirmationEmail = async (targetEmailAddress?: string) => {
    const target = (targetEmailAddress || signupEmail || unconfirmedEmail || email).trim().toLowerCase();
    if (!target || isResendingConfirmation || resendCooldown > 0) return;

    setIsResendingConfirmation(true);
    setLoginError(null);

    try {
      if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase authentication is not configured.');
      }

      const redirectUrl = getAuthRedirectUrl('/auth/callback');
      console.log('[Auth] Resending signup confirmation to:', target, 'redirectTo:', redirectUrl);

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: target,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        throw error;
      }

      // Apply 40-second cooldown only after a successful email/resend request, not before
      setResendCooldown(40);
      showToast(`Verification email resent to ${target}. Please check your inbox and spam folder.`, 'success');
    } catch (err: any) {
      console.error('[Auth] Resend confirmation failed:', err);
      const msg = err?.message || 'Failed to resend confirmation email. Please check the email address and try again.';
      setLoginError(msg);
      showToast(msg, 'error');
      // Cooldown is NOT applied if the request fails
    } finally {
      setIsResendingConfirmation(false);
    }
  };

  // Handle requesting password reset email
  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || resetCooldown > 0) return;

    setIsSendingReset(true);
    setLoginError(null);

    try {
      if (isSupabaseConfigured() && supabase) {
        // Point redirectTo explicitly to the KUD Store /update-password page
        const redirectUrl = getAuthRedirectUrl('/update-password');
        console.log('[Auth] Requesting password reset for email:', resetEmail, 'redirectTo:', redirectUrl);

        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
          redirectTo: redirectUrl,
        });

        if (error) throw error;
      }

      setResetSentSuccess(true);
      setResetCooldown(60); // 60 seconds cooldown to prevent spamming
      showToast('Password reset link sent! Check your inbox and spam folder.', 'success');
    } catch (err: any) {
      console.error('[Auth] Failed to send password reset email:', err);
      const msg = err.message || 'Failed to send password reset link. Please try again later.';
      setLoginError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSendingReset(false);
    }
  };

  // Demo account identifiers for instant developer/reviewer access
  const isDemoAdminAccount = (e: string) => {
    const val = e.trim().toLowerCase();
    return val === 'admin@kudstore.com' || val === 'admin@kudstore.co.za' || val === 'admin@demo.com';
  };

  const isDemoCustomerAccount = (e: string) => {
    const val = e.trim().toLowerCase();
    return (
      val === 'customer@kudstore.co.za' ||
      val === 'customer@kudstore.com' ||
      val === 'demo@kudstore.co.za' ||
      val === 'demo@kudstore.com' ||
      val === 'sipho@example.co.za' ||
      val === 'test@kudstore.co.za'
    );
  };

  const handleQuickDemoLogin = async (targetRole: 'admin' | 'customer') => {
    setIsSubmitting(true);
    setLoginError(null);
    setUnconfirmedEmail(null);
    try {
      if (targetRole === 'admin') {
        localStorage.setItem('kud_store_demo_admin', 'true');
        localStorage.removeItem('kud_store_demo_user');
        setEmail('admin@kudstore.com');
      } else {
        localStorage.setItem('kud_store_demo_user', 'true');
        localStorage.removeItem('kud_store_demo_admin');
        setEmail('customer@kudstore.co.za');
      }
      await refetchProfile();
      showToast(
        targetRole === 'admin'
          ? 'Signed in successfully as Administrator!'
          : 'Signed in successfully as Customer!',
        'success'
      );
      const returnUrl =
        (location.state as any)?.returnUrl ||
        new URLSearchParams(location.search).get('returnUrl') ||
        (targetRole === 'admin' ? '/admin' : '/');
      navigate(targetRole === 'admin' ? '/admin' : returnUrl, { replace: true });
    } catch (demoErr) {
      console.error('Quick demo login error:', demoErr);
      showToast('Could not initialize session. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is already authenticated and has admin role, redirect immediately to /admin to prevent flash
  useEffect(() => {
    if (!isAuthLoading && user) {
      if (role === 'admin' || user.role === 'admin') {
        console.log('Authenticated admin user on login page. Redirecting to: /admin');
        navigate('/admin', { replace: true });
      }
    }
  }, [user, role, isAuthLoading, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setUnconfirmedEmail(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      showToast('Please enter both email and password.', 'error');
      return;
    }

    setIsSubmitting(true);

    if (isSupabaseConfigured() && supabase) {
      try {
        if (isSignUp) {
          const redirectUrl = getAuthRedirectUrl('/auth/callback');
          console.log('[Auth] Signing up with emailRedirectTo:', redirectUrl);
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: { full_name: fullName.trim() || cleanEmail.split('@')[0] },
              emailRedirectTo: redirectUrl,
            },
          });

          // If Supabase returns an error, throw it so actual error is displayed
          if (error) throw error;

          // Check if identity is empty (user already exists in some Supabase configs)
          if (data.user && data.user.identities && data.user.identities.length === 0) {
            const existingMsg = 'An account with this email address already exists. Please sign in or reset your password.';
            setLoginError(existingMsg);
            showToast(existingMsg, 'error');
            return;
          }

          if (data.session) {
            showToast('Account created and signed in successfully!', 'success');
            await refetchProfile();
            const returnUrl =
              (location.state as any)?.returnUrl ||
              new URLSearchParams(location.search).get('returnUrl') ||
              '/';
            navigate(returnUrl, { replace: true });
          } else {
            // Email confirmation required flow
            setSignupEmail(cleanEmail);
            setSignupPendingVerification(true);
            // Apply 40-second cooldown only after a successful signup email dispatch
            setResendCooldown(40);
            showToast('Account created. Please check your email to confirm your account.', 'success');
          }
        } else {
          // Check if user is entering a demo email
          const isDemoAdmin = isDemoAdminAccount(cleanEmail);
          const isDemoCustomer = isDemoCustomerAccount(cleanEmail);

          // 1. Authenticate with Supabase
          let authError: any = null;

          try {
            const res = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });
            authError = res.error;
          } catch (supabaseCatchErr: any) {
            authError = supabaseCatchErr;
          }

          if (authError) {
            // If Supabase Auth rejected known demo credentials, apply demo session fallback
            if (isDemoAdmin || isDemoCustomer) {
              console.log('[Auth] Supabase auth fallback activated for demo account:', cleanEmail);
              if (isDemoAdmin) {
                localStorage.setItem('kud_store_demo_admin', 'true');
                localStorage.removeItem('kud_store_demo_user');
              } else {
                localStorage.setItem('kud_store_demo_user', 'true');
                localStorage.removeItem('kud_store_demo_admin');
              }
              await refetchProfile();
              showToast(`Signed in successfully as ${isDemoAdmin ? 'Administrator' : 'Customer'}!`, 'success');
              const returnUrl =
                (location.state as any)?.returnUrl ||
                new URLSearchParams(location.search).get('returnUrl') ||
                (isDemoAdmin ? '/admin' : '/');
              navigate(isDemoAdmin ? '/admin' : returnUrl, { replace: true });
              return;
            }
            throw authError;
          }

          // 2. Get the authenticated user from supabase.auth.getUser()
          const {
            data: { user: authenticatedUser },
            error: userFetchError,
          } = await supabase.auth.getUser();

          if (userFetchError || !authenticatedUser) {
            throw new Error('Failed to retrieve authenticated user context.');
          }

          console.log('Authenticated user ID:', authenticatedUser.id);

          // 3. Query the user's profile: public.profiles where id = authenticatedUser.id select role
          let { data: profileRow, error: profileErr } = await supabase
            .from('profiles')
            .select('role, full_name, phone')
            .eq('id', authenticatedUser.id)
            .maybeSingle();

          if (profileErr) {
            console.error('Error fetching profile for user:', profileErr);
          }

          let userRole = profileRow?.role;

          // Fallback check via is_admin RPC if profile role is not found
          if (!userRole) {
            try {
              const { data: rpcIsAdmin } = await supabase.rpc('is_admin');
              if (rpcIsAdmin === true) {
                userRole = 'admin';
              } else {
                userRole = 'customer';
              }
            } catch {
              userRole = 'customer';
            }
          }

          // If profile row doesn't exist yet, attempt to upsert one safely
          if (!profileRow) {
            try {
              const profileFullName =
                authenticatedUser.user_metadata?.full_name ||
                authenticatedUser.email?.split('@')[0] ||
                'User';

              const { data: insertedProfile } = await supabase
                .from('profiles')
                .upsert(
                  {
                    id: authenticatedUser.id,
                    full_name: profileFullName,
                    role: userRole || 'customer',
                    phone: authenticatedUser.phone || '',
                    created_at: new Date().toISOString(),
                  },
                  { onConflict: 'id' }
                )
                .select('*')
                .maybeSingle();

              if (insertedProfile) {
                profileRow = insertedProfile;
                if (insertedProfile.role) {
                  userRole = insertedProfile.role;
                }
              }
            } catch (upsertErr) {
              console.warn('Unable to auto-create profile row:', upsertErr);
            }
          }

          console.log('Profile role:', userRole || 'none');
          await refetchProfile();

          // 4. Wait for profile query to finish before performing any redirect
          const returnUrl =
            (location.state as any)?.returnUrl ||
            new URLSearchParams(location.search).get('returnUrl') ||
            '/';

          if (userRole === 'admin') {
            console.log('Redirecting to: /admin');
            showToast('Signed in successfully as Admin!');
            navigate('/admin', { replace: true });
          } else if (userRole === 'customer') {
            console.log(`Redirecting customer to: ${returnUrl}`);
            showToast('Signed in successfully!');
            navigate(returnUrl, { replace: true });
          } else {
            console.log(`No admin role found. Redirecting to: ${returnUrl}`);
            showToast('Signed in successfully!');
            navigate(returnUrl, { replace: true });
          }
        }
      } catch (err: any) {
        console.warn('Authentication process result:', err);
        const rawMsg = err?.message || 'Authentication failed';
        let friendlyMsg = rawMsg;

        if (
          rawMsg.toLowerCase().includes('invalid login credentials') ||
          rawMsg.toLowerCase().includes('invalid_credentials')
        ) {
          friendlyMsg =
            'Invalid email or password. Please verify your details, create a new account, or use 1-Click Demo Access below.';
        } else if (
          rawMsg.toLowerCase().includes('email not confirmed') ||
          rawMsg.toLowerCase().includes('email_not_confirmed')
        ) {
          setUnconfirmedEmail(cleanEmail);
          friendlyMsg =
            'Your email address has not been confirmed yet. Please check your inbox or resend the confirmation email below.';
        } else if (rawMsg.toLowerCase().includes('user already registered')) {
          friendlyMsg =
            'An account with this email already exists. Please sign in or reset your password.';
        }

        setLoginError(friendlyMsg);
        showToast(friendlyMsg, 'error');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setTimeout(async () => {
        showToast(`Signed in as ${cleanEmail}`);
        const returnUrl =
          (location.state as any)?.returnUrl ||
          new URLSearchParams(location.search).get('returnUrl') ||
          '/';
        navigate(returnUrl, { replace: true });
        setIsSubmitting(false);
      }, 300);
    }
  };

  // Loading state while checking authentication and profile role
  if (isAuthLoading || (isSubmitting && !loginError)) {
    return (
      <>
        <SEOHead
          title={`My Account | ${STORE_CONFIG.STORE_NAME}`}
          description="Customer account management."
          canonicalPath="/account"
          noindex={true}
        />
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm max-w-sm w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Checking account...</h3>
              <p className="text-xs text-gray-400 dark:text-slate-400">Verifying session and user profile role</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title={user ? `Account Profile | ${STORE_CONFIG.STORE_NAME}` : `Sign In / Register | ${STORE_CONFIG.STORE_NAME}`}
        description="Access your KUD Store customer account and track your orders in South Africa."
        canonicalPath="/account"
        noindex={true}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28">
      {user ? (
        /* Authenticated User Dashboard */
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] flex items-center justify-center font-black text-2xl border-2 border-white dark:border-slate-800 shadow-sm">
              {user.fullName ? user.fullName[0].toUpperCase() : 'K'}
            </div>
            <div className="flex-1 space-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {user.fullName || 'KUD Shopper'}
              </h1>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="account-header-invite-btn"
                onClick={() => setIsInviteFriendsModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#ecfdf5] hover:bg-[#d1fae5] dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-[#15803d] dark:text-emerald-400 text-xs font-bold rounded-full transition-colors cursor-pointer border border-[#d1fae5] dark:border-emerald-800/80 shadow-2xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Invite Friends</span>
              </button>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold rounded-full transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Account Status Notice if On Hold or Disabled */}
          {isAccountDisabled && (
            <div
              id="customer-account-status-alert-banner"
              className={`p-5 rounded-3xl border shadow-xs flex items-start gap-4 ${
                accountStatus === 'on_hold'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  accountStatus === 'on_hold'
                    ? 'bg-amber-500 text-white'
                    : 'bg-red-600 text-white'
                }`}
              >
                {accountStatus === 'on_hold' ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base">
                    {accountStatus === 'on_hold'
                      ? 'Account Placed On Hold'
                      : 'Account Disabled by Administrator'}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      accountStatus === 'on_hold'
                        ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
                        : 'bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    {accountStatus === 'on_hold' ? 'On Hold' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs opacity-90 leading-relaxed">
                  {disabledReason
                    ? `Administrative note: "${disabledReason}". `
                    : accountStatus === 'on_hold'
                    ? 'Your account purchasing privileges have been temporarily paused. '
                    : 'Your account purchasing privileges have been disabled. '}
                  Adding products to your cart and placing new orders are currently restricted. Your existing order history and purchase records remain fully safe and accessible below.
                </p>
              </div>
            </div>
          )}

          {/* Customer Personal & Contact Details Card */}
          <CustomerProfileDetailsCard />

          {/* Minimalist Apple-Inspired Customer Referral Banner */}
          <CustomerReferralBanner
            onInviteClick={() => setIsInviteFriendsModalOpen(true)}
          />

          {/* Approaching Reward & Voucher Expiration Alert Banner */}
          {!effectiveReferral.hideWallet && hasExpiringVouchers && !hasDismissedExpiryBanner && (
            <div
              id="loyalty-rewards-expiry-alert-banner"
              className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 dark:from-amber-950/50 dark:via-rose-950/40 dark:to-amber-950/50 border-2 border-amber-400 dark:border-amber-600/70 rounded-[24px] p-4 sm:p-5 shadow-md shadow-amber-500/5 relative overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 animate-pulse">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider bg-amber-200/80 dark:bg-amber-900/80 px-2 py-0.5 rounded-md">
                        Reward Expiry Alert
                      </span>
                      <span className="text-xs text-rose-700 dark:text-rose-400 font-extrabold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                        {expiringVouchers.length} {expiringVouchers.length === 1 ? 'Reward Voucher' : 'Reward Vouchers'} Expiring Soon
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-800 dark:text-slate-200 mt-1 font-medium">
                      Your voucher <strong className="font-mono text-amber-900 dark:text-amber-200 font-bold">{expiringVouchers[0]?.voucherCode}</strong> ({STORE_CONFIG.STORE_CURRENCY}{expiringVouchers[0]?.amount} OFF) {getVoucherExpiryStatus(expiringVouchers[0]?.voucherExpiry).badgeLabel.toLowerCase()}. Use it now before your earned discount expires!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {expiringVouchers[0]?.voucherCode && (
                    <button
                      type="button"
                      onClick={() => handleCopyVoucher(expiringVouchers[0].voucherCode!, expiringVouchers[0].id)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-amber-900 dark:text-amber-300 text-xs font-bold rounded-xl border border-amber-300 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate('/cart')}
                    className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Use in Cart</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasDismissedExpiryBanner(true)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    title="Dismiss alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Referral Rewards & Digital Store Wallet Management Card */}
          {!effectiveReferral.hideWallet && (
            <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 sm:p-7 border border-gray-100 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#15803d] text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                      Referral Rewards &amp; Wallet
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#15803d] dark:text-emerald-400 text-[10px] font-extrabold tracking-wider uppercase">
                      Live Balance
                    </span>
                    {hasExpiringVouchers && (
                      <button
                        type="button"
                        onClick={handleCheckExpiryAlerts}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 text-[10px] font-black border border-rose-300 dark:border-rose-800 animate-pulse cursor-pointer hover:bg-rose-200 transition-colors"
                        title="Click to check expiry alerts"
                      >
                        <BellRing className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                        <span>{expiringVouchers.length} Expiring Soon</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Convert your earned referral balance into discount vouchers or digital store credit.
                  </p>
                </div>
              </div>

              {/* Main Action Buttons */}
              <div className="flex items-center gap-2">
                {!effectiveReferral.isBanned && (
                  <button
                    id="redeem-reward-account-btn"
                    type="button"
                    onClick={() => handleOpenRedeemModal('discount_voucher')}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-xs sm:text-sm rounded-full shadow-md shadow-red-500/20 hover:shadow-lg transition-all cursor-pointer select-none"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Redeem Rewards</span>
                  </button>
                )}

                <button
                  id="wallet-credit-account-btn"
                  type="button"
                  onClick={() => handleOpenRedeemModal('wallet_credit')}
                  disabled={effectiveReferral.isBanned}
                  className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-full border border-blue-200 dark:border-blue-900/50 transition-all cursor-pointer disabled:opacity-50"
                  title="Convert to Store Wallet"
                >
                  <Wallet className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Account Ban Notice if Restricted */}
            {effectiveReferral.isBanned && (
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-red-900 dark:text-red-300">
                    Referral & Loyalty Program Restricted
                  </h4>
                  <p className="text-[11px] text-red-700 dark:text-red-400 mt-0.5">
                    Your account has been restricted by store administration from inviting new friends and redeeming referral rewards.
                    {userRewards?.banReason ? ` Reason: "${userRewards.banReason}"` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Earnings Frozen Notice if Frozen */}
            {userRewards?.isEarningsFrozen && !effectiveReferral.isBanned && (
              <div className="p-4 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900 rounded-2xl flex items-start gap-3">
                <Snowflake className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-cyan-900 dark:text-cyan-200">
                    Referral Earnings Temporarily Frozen
                  </h4>
                  <p className="text-[11px] text-cyan-700 dark:text-cyan-300 mt-0.5">
                    Your referral rewards balance has been frozen by store administration. Reward conversions and redemptions are temporarily paused.
                    {userRewards?.frozenReason ? ` Reason: "${userRewards.frozenReason}"` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Balances Grid: Referral Earnings + Store Wallet */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Balance 1: Available Referral Earnings */}
              {!effectiveReferral.hideEarnings ? (
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                  userRewards?.isEarningsFrozen
                    ? 'bg-gradient-to-br from-cyan-50/70 to-slate-50 dark:from-cyan-950/30 dark:to-slate-800/60 border-cyan-200 dark:border-cyan-900/60'
                    : 'bg-gradient-to-br from-[#ecfdf5] to-emerald-50/40 dark:from-emerald-950/30 dark:to-slate-800/60 border-emerald-200/80 dark:border-emerald-900/50'
                }`}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                        userRewards?.isEarningsFrozen ? 'text-cyan-800 dark:text-cyan-300' : 'text-emerald-800 dark:text-emerald-300'
                      }`}>
                        Available Referral Rewards
                      </span>
                      {userRewards?.isEarningsFrozen && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-cyan-200/70 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-200">
                          Frozen
                        </span>
                      )}
                    </div>
                    <span className={`text-2xl font-black font-mono ${
                      userRewards?.isEarningsFrozen ? 'text-cyan-950 dark:text-cyan-100' : 'text-emerald-900 dark:text-emerald-200'
                    }`}>
                      {STORE_CONFIG.STORE_CURRENCY}{(userRewards?.referralBalance ?? 0).toLocaleString()}
                    </span>
                    {userRewards?.isEarningsFrozen ? (
                      <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-bold block mt-0.5 flex items-center gap-1">
                        <Snowflake className="w-3 h-3 text-cyan-600" />
                        Redemptions paused by admin
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-0.5">
                        Ready to redeem
                      </span>
                    )}
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-2xs ${
                    userRewards?.isEarningsFrozen
                      ? 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300'
                      : 'bg-white dark:bg-slate-800 text-[#16a34a] dark:text-emerald-400'
                  }`}>
                    {userRewards?.isEarningsFrozen ? (
                      <Snowflake className="w-5 h-5" />
                    ) : (
                      <Tag className="w-5 h-5" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                      Referral Rewards
                    </span>
                    <span className="text-sm font-bold text-gray-600 dark:text-slate-300 mt-1 block">
                      Earnings Hidden
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      Display disabled by store admin
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-slate-700 text-gray-400 flex items-center justify-center shadow-2xs">
                    <EyeOff className="w-5 h-5" />
                  </div>
                </div>
              )}

              {/* Balance 2: Store Digital Wallet */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/40 dark:from-blue-950/30 dark:to-slate-800/60 border border-blue-200/80 dark:border-blue-900/50 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider block">
                    KUD Store Wallet
                  </span>
                  <span className="text-2xl font-black text-blue-900 dark:text-blue-200 font-mono">
                    {STORE_CONFIG.STORE_CURRENCY}{(userRewards?.walletBalance ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-blue-700 dark:text-blue-400 block mt-0.5">
                    Applies at checkout
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>

              {/* Balance 3: Total Successful Invites */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider block">
                    Friends Joined
                  </span>
                  <span className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                    {userRewards?.successfulReferralsCount ?? 0}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 block mt-0.5">
                    {!effectiveReferral.hideEarnings ? `Lifetime: ${STORE_CONFIG.STORE_CURRENCY}${(userRewards?.totalEarned ?? 0)} earned` : 'Verified referrals'}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 flex items-center justify-center shadow-2xs">
                  <Share2 className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Active Claimed Vouchers List */}
            {userRewards?.vouchers && userRewards.vouchers.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-white">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#16a34a]" />
                    Your Active Redeemed Vouchers ({userRewards.vouchers.filter((v) => v.status === 'active').length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowVoucherHistory(!showVoucherHistory)}
                    className="text-[11px] font-semibold text-[#16a34a] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showVoucherHistory ? 'Hide History' : 'View Full History'}</span>
                    {showVoucherHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {userRewards.vouchers
                    .filter((v) => v.status === 'active' || showVoucherHistory)
                    .map((voucher) => {
                      const expiryStatus = getVoucherExpiryStatus(voucher.voucherExpiry);
                      const isUrgent = voucher.status === 'active' && expiryStatus.isExpiringSoon;

                      return (
                        <div
                          key={voucher.id}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                            isUrgent
                              ? 'bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-amber-500/10 dark:from-amber-950/30 dark:to-slate-800 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400/30'
                              : voucher.status === 'active'
                              ? 'bg-[#ecfdf5]/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                              : 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 opacity-70'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-black text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
                                {voucher.voucherCode}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                  voucher.status === 'active'
                                    ? isUrgent
                                      ? expiryStatus.badgeColorClass
                                      : 'bg-[#16a34a] text-white'
                                    : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-400'
                                }`}
                              >
                                {isUrgent ? expiryStatus.badgeLabel : voucher.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[11px] font-extrabold text-gray-700 dark:text-slate-300">
                                {STORE_CONFIG.STORE_CURRENCY}{voucher.amount} OFF Discount
                              </span>
                              {voucher.voucherExpiry && (
                                <span className="text-[10px] text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-gray-400" />
                                  <span>Exp: {expiryStatus.formattedExpiry}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {voucher.voucherCode && voucher.status === 'active' && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                id={`copy-voucher-${voucher.id}`}
                                type="button"
                                onClick={() => handleCopyVoucher(voucher.voucherCode!, voucher.id)}
                                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-200 dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              >
                                {copiedVoucherId === voucher.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-[#16a34a]" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => navigate('/cart')}
                                className="px-2.5 py-1.5 bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                                title="Use voucher in cart"
                              >
                                <span>Use</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Loyalty & Reward Tiers Progress Section */}
          {effectiveReferral.isProgramEnabled && effectiveReferral.referral_rewards_enabled && (
            <LoyaltyTiersCard
              referralsCount={userRewards?.successfulReferralsCount ?? 0}
              expiringVouchersCount={expiringVouchers.length}
              onInviteClick={
                !effectiveReferral.hideInvite && !effectiveReferral.isBanned
                  ? () => setIsInviteFriendsModalOpen(true)
                  : undefined
              }
              onRedeemClick={
                !effectiveReferral.isBanned
                  ? () => handleOpenRedeemModal('discount_voucher')
                  : undefined
              }
            />
          )}

          {/* Gamified Top Referrers Leaderboard */}
          {effectiveReferral.isProgramEnabled && effectiveReferral.allowLeaderboard && (
            <TopReferrersLeaderboard
              userRewards={userRewards}
              userName={user?.fullName || user?.email?.split('@')[0] || 'You'}
              onInviteClick={
                !effectiveReferral.hideInvite && !effectiveReferral.isBanned
                  ? () => setIsInviteFriendsModalOpen(true)
                  : undefined
              }
              onRedeemClick={
                !effectiveReferral.isBanned
                  ? () => handleOpenRedeemModal('discount_voucher')
                  : undefined
              }
            />
          )}


          {/* Quick Dashboard Links */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <button
              id="account-my-orders-btn"
              onClick={() => navigate('/orders')}
              className="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/80 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-slate-800 text-left flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 transition-all group cursor-pointer shadow-2xs"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Package className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">My Orders</h3>
                <p className="text-xs text-gray-400 dark:text-slate-400 truncate">View order history</p>
              </div>
            </button>

            <button
              id="account-track-order-btn"
              onClick={() => {
                setTrackOrderInitialId('');
                setIsTrackOrderModalOpen(true);
              }}
              className="bg-white dark:bg-slate-900 hover:bg-rose-50/40 dark:hover:bg-rose-950/20 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/60 text-left flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 transition-all group cursor-pointer shadow-2xs"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base flex items-center gap-1.5">
                  <span>Track Order</span>
                </h3>
                <p className="text-xs text-gray-400 dark:text-slate-400 truncate">Check live status</p>
              </div>
            </button>

            <button
              id="account-favourites-btn"
              onClick={() => navigate('/favourites')}
              className="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/80 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-slate-800 text-left flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 transition-all group cursor-pointer shadow-2xs"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Favourites</h3>
                <p className="text-xs text-gray-400 dark:text-slate-400 truncate">Saved items</p>
              </div>
            </button>

            <button
              id="account-cart-btn"
              onClick={() => navigate('/cart')}
              className="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/80 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-slate-800 text-left flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 transition-all group cursor-pointer shadow-2xs"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Cart</h3>
                <p className="text-xs text-gray-400 dark:text-slate-400 truncate">Manage items</p>
              </div>
            </button>
          </div>

          {/* Quick Order Lookup Banner */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#ff6452]" />
                  <h3 className="text-base font-black text-gray-900 dark:text-white">Quick Order Tracker</h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Enter any Order ID or Reference Number to view delivery updates in real-time.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inlineTrackQuery.trim()) {
                    setTrackOrderInitialId(inlineTrackQuery.trim());
                    setIsTrackOrderModalOpen(true);
                  }
                }}
                className="flex items-center gap-2 w-full md:w-auto"
              >
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="account-quick-track-input"
                    type="text"
                    placeholder="Enter Order ID (e.g. KUD-...)"
                    value={inlineTrackQuery}
                    onChange={(e) => setInlineTrackQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-[#ff6452] outline-hidden font-medium"
                  />
                </div>
                <button
                  id="account-quick-track-submit-btn"
                  type="submit"
                  disabled={!inlineTrackQuery.trim()}
                  className="px-4 py-2 bg-[#ff6452] hover:bg-[#ff523d] text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                >
                  <span>Track</span>
                </button>
              </form>
            </div>
          </div>

          {/* Dynamic Customer Order Help & Support Card */}
          <CustomerOrderHelpCard />
        </div>
      ) : (
        /* Unauthenticated User Auth Form / Forgot Password Form / Signup Verification Pending */
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-md space-y-6">
          {signupPendingVerification ? (
            /* Signup Pending Email Verification Screen */
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] mx-auto flex items-center justify-center font-bold shadow-xs">
                  <Mail className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  Check Your Inbox
                </h1>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 text-emerald-800 dark:text-emerald-300 text-xs font-medium space-y-1">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Account created</span>
                  </div>
                  <p className="leading-relaxed">
                    Please check your email to confirm your account.
                  </p>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  We've sent a verification link to{' '}
                  <strong className="font-bold text-gray-900 dark:text-white">{signupEmail}</strong>.
                  Please click the link in the email to activate your account and start shopping.
                </p>
              </div>

              {loginError && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold block text-rose-800 dark:text-rose-200">Notice</span>
                    <p className="leading-relaxed">{loginError}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleResendConfirmationEmail(signupEmail)}
                  disabled={isResendingConfirmation || resendCooldown > 0}
                  className="w-full py-3.5 bg-[#ff6452] hover:bg-[#ff523d] text-white font-bold rounded-2xl shadow-md shadow-[#ff6452]/20 transition-all cursor-pointer disabled:opacity-50 text-xs flex items-center justify-center gap-2"
                >
                  {isResendingConfirmation ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Email...</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    <span>Resend available in {resendCooldown}s</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Resend confirmation email</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSignupPendingVerification(false);
                    setIsSignUp(false);
                    setLoginError(null);
                  }}
                  className="w-full py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-bold rounded-2xl transition-colors cursor-pointer text-center"
                >
                  Back to Sign In
                </button>
              </div>

              <div className="text-center border-t border-gray-100 dark:border-slate-800 pt-4">
                <p className="text-[11px] text-gray-400 dark:text-slate-500">
                  Didn't receive the email? Check your spam/junk folder.
                </p>
              </div>
            </div>
          ) : isForgotPassword ? (
            /* Forgot Password / Request Reset Link Form */
            <>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] mx-auto flex items-center justify-center font-bold shadow-xs">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  Reset Password
                </h1>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {loginError && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold block text-rose-800 dark:text-rose-200">Error Sending Reset Link</span>
                    <p className="leading-relaxed">{loginError}</p>
                  </div>
                </div>
              )}

              {resetSentSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-start gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold block text-emerald-900 dark:text-emerald-200">Reset Link Sent!</span>
                    <p className="leading-relaxed">
                      We've sent a password reset link to <strong className="font-bold">{resetEmail}</strong>. Please check your inbox and spam folder.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 dark:text-slate-400 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="sipho@example.co.za"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-[#ff6452] dark:focus:border-[#ff6452] outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingReset || resetCooldown > 0}
                  className="w-full py-3.5 bg-[#ff6452] hover:bg-[#ff523d] text-white font-bold rounded-2xl shadow-md shadow-[#ff6452]/20 transition-all cursor-pointer disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {isSendingReset ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending Link...</span>
                    </>
                  ) : resetCooldown > 0 ? (
                    <span>Resend available in {resetCooldown}s</span>
                  ) : (
                    <span>Send Password Reset Link</span>
                  )}
                </button>
              </form>

              <div className="text-center border-t border-gray-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setLoginError(null);
                  }}
                  className="text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </>
          ) : (
            /* Sign In / Sign Up Form */
            <>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] mx-auto flex items-center justify-center font-bold">
                  <User className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  {isSignUp ? 'Create an Account' : 'Welcome Back'}
                </h1>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {isSignUp
                    ? 'Join KUD Store to enjoy effortless shopping and rewards.'
                    : `Sign in to manage your ${STORE_CONFIG.STORE_NAME} account and track orders.`}
                </p>
              </div>

              {/* Google OAuth Button (Controlled by Admin Settings) */}
              {isGoogleAuthEnabled && (
                <div className="space-y-4 pt-1">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading || isSubmitting || isResendingConfirmation}
                    className="w-full py-3 px-4 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2.5 shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {isGoogleLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-[#ff6452] animate-spin" />
                        <span>Connecting to Google...</span>
                      </>
                    ) : (
                      <>
                        <GoogleIcon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                        <span>Continue with Google</span>
                      </>
                    )}
                  </button>

                  {/* Clean Divider */}
                  <div className="relative flex items-center justify-center">
                    <div className="w-full border-t border-gray-200 dark:border-slate-800" />
                    <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                      or continue with email
                    </span>
                  </div>
                </div>
              )}

              {loginError && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-2xl p-4 space-y-3 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold block text-rose-900 dark:text-rose-200 text-sm">
                        {isSignUp ? 'Sign Up Notice' : 'Sign In Notice'}
                      </span>
                      <p className="leading-relaxed text-gray-700 dark:text-slate-300">{loginError}</p>
                    </div>
                  </div>

                  {unconfirmedEmail && (
                    <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/50">
                      <button
                        type="button"
                        onClick={() => handleResendConfirmationEmail(unconfirmedEmail)}
                        disabled={isResendingConfirmation || resendCooldown > 0}
                        className="w-full py-2 bg-[#ff6452] hover:bg-[#ff523d] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isResendingConfirmation ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending Email...</span>
                          </>
                        ) : resendCooldown > 0 ? (
                          <span>Resend available in {resendCooldown}s</span>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Resend confirmation email</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {!isSignUp && !unconfirmedEmail && (
                    <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/50 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUp(true);
                          setLoginError(null);
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-rose-100/50 dark:hover:bg-slate-700 text-[#ff6452] font-bold rounded-lg border border-rose-200 dark:border-slate-700 transition-colors cursor-pointer text-xs"
                      >
                        Create account with this email
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(email);
                          setIsForgotPassword(true);
                          setLoginError(null);
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-semibold rounded-lg border border-gray-200 dark:border-slate-700 transition-colors cursor-pointer text-xs"
                      >
                        Reset password
                      </button>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 dark:text-slate-400 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Sipho Dlamini"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-[#ff6452] dark:focus:border-[#ff6452] outline-hidden"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 dark:text-slate-400 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="sipho@example.co.za"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setResetEmail(e.target.value);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-[#ff6452] dark:focus:border-[#ff6452] outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase text-gray-500 dark:text-slate-400">
                      Password
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(email);
                          setIsForgotPassword(true);
                          setLoginError(null);
                        }}
                        className="text-xs font-semibold text-[#ff6452] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-[#ff6452] dark:focus:border-[#ff6452] outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isGoogleLoading}
                  className="w-full py-3.5 bg-[#ff6452] hover:bg-[#ff523d] text-white font-bold rounded-2xl shadow-md shadow-[#ff6452]/20 transition-all cursor-pointer disabled:opacity-50 text-sm"
                >
                  {isSubmitting
                    ? isSignUp
                      ? 'Creating Account...'
                      : 'Signing In...'
                    : isSignUp
                    ? 'Create Account'
                    : 'Sign In'}
                </button>
              </form>

              <div className="text-center border-t border-gray-100 dark:border-slate-800 pt-4">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setLoginError(null);
                    setUnconfirmedEmail(null);
                  }}
                  className="text-xs font-semibold text-[#ff6452] hover:underline cursor-pointer"
                >
                  {isSignUp
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Sign Up"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modals - Accessible inside customer profile */}
      {user && (
        <>
          <TrackOrderModal
            isOpen={isTrackOrderModalOpen}
            onClose={() => setIsTrackOrderModalOpen(false)}
            initialOrderId={trackOrderInitialId}
          />
          <InviteFriendsModal
            isOpen={isInviteFriendsModalOpen}
            onClose={() => setIsInviteFriendsModalOpen(false)}
          />
          <ReferralRedemptionModal
            isOpen={isRedemptionModalOpen}
            onClose={() => setIsRedemptionModalOpen(false)}
            initialType={redemptionInitialType}
            onSuccess={() => {
              fetchUserRewards();
            }}
          />
        </>
      )}
    </div>
    </>
  );
};
