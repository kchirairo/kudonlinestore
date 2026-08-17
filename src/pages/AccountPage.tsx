import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
  ShieldCheck,
  LayoutDashboard,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  Truck,
  Search,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { STORE_CONFIG } from '../constants/config';
import { SEOHead } from '../components/SEOHead';
import { getAuthRedirectUrl } from '../utils/authRedirect';
import { TrackOrderModal } from '../components/TrackOrderModal';

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, showToast } = useShop();
  const { loading: isAuthLoading, role, profile, authError } = useAuth();

  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Track Order Modal state
  const [isTrackOrderModalOpen, setIsTrackOrderModalOpen] = useState<boolean>(false);
  const [trackOrderInitialId, setTrackOrderInitialId] = useState<string>('');
  const [inlineTrackQuery, setInlineTrackQuery] = useState<string>('');

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

    if (!email || !password) {
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
            email: email.trim(),
            password,
            options: {
              data: { full_name: fullName.trim() || email.split('@')[0] },
              emailRedirectTo: redirectUrl,
            },
          });
          if (error) throw error;
          if (data.session) {
            showToast('Account created and signed in successfully!', 'success');
          } else {
            showToast('Account created! Please check your email to verify your account.', 'success');
          }
        } else {
          // 1. Authenticate with Supabase
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (authError) throw authError;

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

          // 4. Wait for profile query to finish before performing any redirect
          const returnUrl = (location.state as any)?.returnUrl || new URLSearchParams(location.search).get('returnUrl') || '/';

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
        console.error('Authentication process failed:', err);
        setLoginError(err.message || 'Authentication failed');
        showToast(err.message || 'Authentication failed', 'error');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Demo authentication mode when Supabase credentials are not configured
      setTimeout(() => {
        showToast(`Signed in in Demo Mode as ${email}`);
        setIsSubmitting(false);
        const returnUrl = (location.state as any)?.returnUrl || new URLSearchParams(location.search).get('returnUrl') || '/';
        if (localStorage.getItem('kud_store_demo_admin') === 'true') {
          console.log('Redirecting to: /admin');
          navigate('/admin', { replace: true });
        } else {
          console.log(`Redirecting to: ${returnUrl}`);
          navigate(returnUrl, { replace: true });
        }
      }, 500);
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
              <span className="inline-block text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Verified Customer
              </span>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold rounded-full transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

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

          {/* Support Banner */}
          <div className="bg-[#eff6ff] dark:bg-slate-900/90 rounded-3xl p-6 border border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Need help with an order?</h3>
              <p className="text-xs text-gray-600 dark:text-slate-300 mt-0.5">
                Contact KUD Store support at{' '}
                <a
                  href={`mailto:${STORE_CONFIG.CONTACT_EMAIL}`}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
                >
                  {STORE_CONFIG.CONTACT_EMAIL}
                </a>{' '}
                or WhatsApp{' '}
                <a
                  href={`https://wa.me/${STORE_CONFIG.WHATSAPP_SUPPORT.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center"
                >
                  {STORE_CONFIG.WHATSAPP_SUPPORT}
                </a>
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={`mailto:${STORE_CONFIG.CONTACT_EMAIL}?subject=Order%20Support%20Inquiry`}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl border border-blue-200 dark:border-slate-700 transition-colors text-center inline-flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span>Email Support</span>
              </a>
              <a
                href={`https://wa.me/${STORE_CONFIG.WHATSAPP_SUPPORT.replace(/[^0-9]/g, '')}?text=Hi%20KUD%20Store%2C%20I%20need%20help%20with%20an%20order`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors text-center inline-flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Unauthenticated User Auth Form / Forgot Password Form */
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-md space-y-6">
          {isForgotPassword ? (
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
                  Sign in to manage your {STORE_CONFIG.STORE_NAME} account and track orders.
                </p>
              </div>

              {loginError && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold block text-rose-800 dark:text-rose-200">Authentication / Profile Error</span>
                    <p className="leading-relaxed">{loginError}</p>
                  </div>
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
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-[#ff6452] hover:bg-[#ff523d] text-white font-bold rounded-2xl shadow-md shadow-[#ff6452]/20 transition-all cursor-pointer"
                >
                  {isSubmitting
                    ? 'Processing...'
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

          {/* Guest Track Order Quick Link */}
          <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
            <div className="bg-gray-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Track an Order</p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">Have an Order ID? Check status instantly</p>
                </div>
              </div>
              <button
                id="guest-track-order-btn"
                type="button"
                onClick={() => {
                  setTrackOrderInitialId('');
                  setIsTrackOrderModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-900 dark:text-white text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer shrink-0"
              >
                Track Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Track Order Modal */}
      <TrackOrderModal
        isOpen={isTrackOrderModalOpen}
        onClose={() => setIsTrackOrderModalOpen(false)}
        initialOrderId={trackOrderInitialId}
      />
    </div>
    </>
  );
};
