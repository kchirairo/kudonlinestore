import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Mail,
  ShieldCheck,
  Home,
  UserCheck,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useShop } from '../context/ShopContext';
import { STORE_CONFIG } from '../constants/config';
import { SEOHead } from '../components/SEOHead';
import { getAuthRedirectUrl } from '../utils/authRedirect';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useShop();

  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authType, setAuthType] = useState<string>('signup');

  // Resend verification email state (for expired links)
  const [resendEmail, setResendEmail] = useState<string>('');
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendSuccess, setResendSuccess] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Auto redirect countdown
  const [countdown, setCountdown] = useState<number>(4);

  // Process the authentication token / code callback
  useEffect(() => {
    let isMounted = true;

    const processAuthCallback = async () => {
      try {
        const hash = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hash);

        // Check for error in query or hash
        const error = searchParams.get('error') || hashParams.get('error');
        const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
        const errorDescription =
          searchParams.get('error_description') || hashParams.get('error_description');

        const type = hashParams.get('type') || searchParams.get('type') || 'signup';
        if (isMounted) setAuthType(type);

        // If recovery type, redirect to password reset page
        if (type === 'recovery') {
          console.log('[Auth Callback] Password recovery type detected. Redirecting to /update-password');
          navigate(`/update-password${window.location.hash || window.location.search}`, { replace: true });
          return;
        }

        if (error || errorDescription) {
          console.warn('[Auth Callback] Verification error detected:', { error, errorCode, errorDescription });
          let friendlyError = 'The verification link is invalid, expired, or has already been used.';
          if (errorCode === 'otp_expired' || errorDescription?.toLowerCase().includes('expired')) {
            friendlyError = 'This email verification link has expired. Please request a new verification email below.';
          } else if (errorDescription) {
            friendlyError = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
          }
          if (isMounted) {
            setErrorMessage(friendlyError);
            setIsProcessing(false);
          }
          return;
        }

        if (!isSupabaseConfigured() || !supabase) {
          // Demo fallback
          if (isMounted) {
            setIsSuccess(true);
            setUserEmail('demo-customer@kudstore.co.za');
            setIsProcessing(false);
          }
          return;
        }

        // Check for PKCE Authorization Code in query params
        const code = searchParams.get('code');
        if (code) {
          console.log('[Auth Callback] Exchanging authorization code for session...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('[Auth Callback] Code exchange error:', exchangeError);
            if (isMounted) {
              setErrorMessage(exchangeError.message || 'Failed to verify authentication code.');
              setIsProcessing(false);
            }
            return;
          }

          if (data?.session?.user && isMounted) {
            setIsSuccess(true);
            setUserEmail(data.session.user.email || null);
            setIsProcessing(false);
            showToast('Email verified successfully! Welcome to KUD Store.', 'success');
            return;
          }
        }

        // Check active session (Supabase client parses hash tokens automatically)
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          console.warn('[Auth Callback] Session check error:', sessionErr);
        }

        if (sessionData?.session?.user) {
          if (isMounted) {
            setIsSuccess(true);
            setUserEmail(sessionData.session.user.email || null);
            setIsProcessing(false);
            showToast('Email verified successfully! Welcome to KUD Store.', 'success');
          }
          return;
        }

        // Listen for auth state change
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('[Auth Callback] Auth state event:', event);
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
            if (session?.user && isMounted) {
              setIsSuccess(true);
              setUserEmail(session.user.email || null);
              setErrorMessage(null);
              setIsProcessing(false);
            }
          }
        });

        // Delay fallback to check session once token exchange settles
        setTimeout(async () => {
          if (isMounted) {
            const { data: finalCheck } = await supabase.auth.getSession();
            if (finalCheck?.session?.user) {
              setIsSuccess(true);
              setUserEmail(finalCheck.session.user.email || null);
              setErrorMessage(null);
              setIsProcessing(false);
            } else {
              // If no session found after delay and no error was specified, show timeout message
              if (!errorMessage) {
                setErrorMessage('Unable to confirm verification session. Please sign in to verify your account.');
              }
              setIsProcessing(false);
            }
          }
        }, 1500);

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (err: any) {
        console.error('[Auth Callback] Unexpected error during verification:', err);
        if (isMounted) {
          setErrorMessage(err.message || 'An unexpected error occurred during email verification.');
          setIsProcessing(false);
        }
      }
    };

    processAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [searchParams, navigate, showToast]);

  // Resend timer countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Success auto-redirect countdown
  useEffect(() => {
    if (!isSuccess) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/account', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSuccess, navigate]);

  // Handle resending verification email
  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail || resendCooldown > 0) return;

    setIsResending(true);
    try {
      if (isSupabaseConfigured() && supabase) {
        const redirectUrl = getAuthRedirectUrl('/auth/callback');
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: resendEmail.trim(),
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
        if (error) throw error;
      }
      setResendSuccess(true);
      setResendCooldown(60);
      showToast('Verification email resent! Please check your inbox.', 'success');
    } catch (err: any) {
      console.error('[Auth Callback] Failed to resend verification:', err);
      showToast(err.message || 'Failed to resend verification email.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <SEOHead
        title={`Email Verification | ${STORE_CONFIG.STORE_NAME}`}
        description="Verify your KUD Store account email address."
        canonicalPath="/auth/callback"
        noindex={true}
      />

      <div className="max-w-md mx-auto px-4 sm:px-6 py-12 pb-28">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md space-y-6">
          {/* Header Icon */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-[#ff6452] mx-auto flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {isProcessing
                ? 'Verifying Your Account'
                : isSuccess
                ? 'Email Verified!'
                : 'Verification Failed'}
            </h1>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              {isProcessing
                ? 'Please wait while we confirm your email and set up your session...'
                : isSuccess
                ? 'Your email address has been verified. Welcome to KUD Store!'
                : 'We could not complete your email verification.'}
            </p>
          </div>

          {/* 1. Loading / Processing State */}
          {isProcessing && (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-[#ff6452] mx-auto flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Confirming authentication token with Supabase...
              </p>
            </div>
          )}

          {/* 2. Success State View */}
          {!isProcessing && isSuccess && (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-emerald-900 text-base">Verification Complete</h3>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  {userEmail ? (
                    <>
                      Account <strong className="font-bold">{userEmail}</strong> is now verified and active.
                    </>
                  ) : (
                    'Your account is now verified and ready to use.'
                  )}
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="button"
                  onClick={() => navigate('/account', { replace: true })}
                  className="w-full py-3.5 bg-[#ff6452] hover:bg-[#ff523d] text-white font-bold rounded-2xl shadow-md shadow-[#ff6452]/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Go to My Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/', { replace: true })}
                  className="w-full py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Start Shopping</span>
                </button>

                <p className="text-[11px] text-center text-gray-400">
                  Redirecting automatically in <span className="font-bold text-gray-700">{countdown}s</span>...
                </p>
              </div>
            </div>
          )}

          {/* 3. Error / Expired Link State */}
          {!isProcessing && !isSuccess && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Verification Link Expired</span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {errorMessage ||
                    'This verification link has expired or was already used. Please request a new verification email below.'}
                </p>
              </div>

              {/* Resend Verification Form */}
              <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-3">
                <h3 className="text-xs font-bold uppercase text-gray-700">Resend Verification Email</h3>
                {resendSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl">
                    A fresh verification link has been sent! Please check your inbox and spam folder.
                  </div>
                )}
                <form onSubmit={handleResendVerification} className="space-y-3">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="Enter your registered email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:border-[#ff6452] outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isResending || resendCooldown > 0}
                    className="w-full py-2.5 bg-[#ff6452] hover:bg-[#ff523d] text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Link...</span>
                      </>
                    ) : resendCooldown > 0 ? (
                      <span>Resend available in {resendCooldown}s</span>
                    ) : (
                      <span>Send New Verification Email</span>
                    )}
                  </button>
                </form>
              </div>

              <div className="text-center pt-2 space-y-2">
                <Link
                  to="/account"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#ff6452] hover:underline"
                >
                  <span>Return to Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center border-t border-gray-100 pt-4">
            <Link
              to="/"
              className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Back to KUD Store
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
