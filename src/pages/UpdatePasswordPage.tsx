import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Mail,
  KeyRound,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useShop } from '../context/ShopContext';
import { STORE_CONFIG } from '../constants/config';
import { SEOHead } from '../components/SEOHead';
import { getAuthRedirectUrl } from '../utils/authRedirect';

export const UpdatePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useShop();

  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auth recovery session detection state
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(true);
  const [hasValidRecoverySession, setHasValidRecoverySession] = useState<boolean>(false);
  const [sessionUserEmail, setSessionUserEmail] = useState<string | null>(null);

  // Resend reset link sub-form state (if link expired)
  const [resendEmail, setResendEmail] = useState<string>('');
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendSent, setResendSent] = useState<boolean>(false);

  // Auto redirect countdown on success
  const [countdown, setCountdown] = useState<number>(5);

  // 1. Detect Supabase PASSWORD_RECOVERY session or URL parameters
  useEffect(() => {
    let isMounted = true;

    const checkRecoverySession = async () => {
      try {
        // Parse URL hash and search params for error indicators
        const hash = window.location.hash;
        const search = window.location.search;
        const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
        const searchParams = new URLSearchParams(search);

        const error = hashParams.get('error') || searchParams.get('error');
        const errorDescription =
          hashParams.get('error_description') || searchParams.get('error_description');

        if (error || errorDescription) {
          console.warn('[Password Recovery] Detected error in URL params:', error, errorDescription);
          if (isMounted) {
            setErrorMessage(
              decodeURIComponent(errorDescription || error || 'The password reset link is invalid or has expired.')
            );
            setHasValidRecoverySession(false);
            setIsVerifyingSession(false);
          }
          return;
        }

        if (!isSupabaseConfigured() || !supabase) {
          // Demo fallback
          if (isMounted) {
            setHasValidRecoverySession(true);
            setSessionUserEmail('demo-customer@kudstore.co.za');
            setIsVerifyingSession(false);
          }
          return;
        }

        // Check if there is an active session
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          console.warn('[Password Recovery] Error checking session:', sessionErr);
        }

        if (sessionData?.session?.user) {
          if (isMounted) {
            setHasValidRecoverySession(true);
            setSessionUserEmail(sessionData.session.user.email || null);
            setIsVerifyingSession(false);
          }
          return;
        }

        // Check user directly
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (!userErr && userData?.user) {
          if (isMounted) {
            setHasValidRecoverySession(true);
            setSessionUserEmail(userData.user.email || null);
            setIsVerifyingSession(false);
          }
          return;
        }

        // Listen for PASSWORD_RECOVERY event
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('[Password Recovery] Auth state change event:', event);
          if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
            if (isMounted) {
              setHasValidRecoverySession(true);
              setSessionUserEmail(session?.user?.email || null);
              setErrorMessage(null);
              setIsVerifyingSession(false);
            }
          }
        });

        // Small delay to allow hash token exchange to settle
        setTimeout(async () => {
          if (isMounted) {
            const { data: latestSession } = await supabase.auth.getSession();
            if (latestSession?.session?.user) {
              setHasValidRecoverySession(true);
              setSessionUserEmail(latestSession.session.user.email || null);
              setIsVerifyingSession(false);
            } else {
              setIsVerifyingSession(false);
            }
          }
        }, 1200);

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (err: any) {
        console.error('[Password Recovery] Initialization exception:', err);
        if (isMounted) {
          setErrorMessage('Unable to verify password reset token.');
          setIsVerifyingSession(false);
        }
      }
    };

    checkRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Cooldown countdown timer for resending reset email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Success countdown to redirect
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

  // Handle password update submission
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!password) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSupabaseConfigured() && supabase) {
        // Update user password via Supabase Auth API
        const { data, error } = await supabase.auth.updateUser({
          password: password,
        });

        if (error) {
          throw error;
        }

        console.log('[Password Recovery] Password updated successfully for user:', data.user?.email);
      } else {
        // Simulated local fallback
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      setIsSuccess(true);
      showToast('Your password has been updated successfully!', 'success');
    } catch (err: any) {
      console.error('[Password Recovery] Failed to update password:', err);
      const msg = err.message || 'Failed to update password. Please request a new reset link.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle resending reset password email if link was expired
  const handleResendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail || resendCooldown > 0) return;

    setIsResending(true);
    try {
      if (isSupabaseConfigured() && supabase) {
        const redirectUrl = getAuthRedirectUrl('/update-password');
        const { error } = await supabase.auth.resetPasswordForEmail(resendEmail.trim(), {
          redirectTo: redirectUrl,
        });
        if (error) throw error;
      }
      setResendSent(true);
      setResendCooldown(60);
      showToast('Password reset link sent! Please check your email.', 'success');
    } catch (err: any) {
      console.error('[Password Recovery] Failed to resend reset email:', err);
      showToast(err.message || 'Failed to send reset link.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <SEOHead
        title={`Set New Password | ${STORE_CONFIG.STORE_NAME}`}
        description="Update your KUD Store account password securely."
        canonicalPath="/update-password"
        noindex={true}
      />

      <div className="max-w-md mx-auto px-4 sm:px-6 py-12 pb-28">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md space-y-6">
          {/* Header Icon & Title */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-[#ff6452] mx-auto flex items-center justify-center font-bold shadow-xs">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {isSuccess ? 'Password Updated!' : 'Set New Password'}
            </h1>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              {isSuccess
                ? 'Your account password has been changed securely.'
                : 'Choose a strong, secure new password for your KUD Store account.'}
            </p>
          </div>

          {/* 1. Verifying Session Loading State */}
          {isVerifyingSession && (
            <div className="py-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-[#ff6452] mx-auto flex items-center justify-center">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Verifying secure password reset session...
              </p>
            </div>
          )}

          {/* 2. Success State View */}
          {!isVerifyingSession && isSuccess && (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-emerald-900 text-base">All Done!</h3>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  You can now sign in to KUD Store using your new password.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="button"
                  onClick={() => navigate('/account', { replace: true })}
                  className="w-full py-3.5 bg-[#ff6452] hover:bg-[#ff523d] text-white font-bold rounded-2xl shadow-md shadow-[#ff6452]/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <span>Go to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-[11px] text-center text-gray-400">
                  Redirecting automatically in <span className="font-bold text-gray-700">{countdown}s</span>...
                </p>
              </div>
            </div>
          )}

          {/* 3. Valid Recovery Session - Password Input Form */}
          {!isVerifyingSession && !isSuccess && hasValidRecoverySession && (
            <>
              {sessionUserEmail && (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 text-gray-500 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Updating Account</p>
                    <p className="text-xs font-semibold text-gray-800 truncate">{sessionUserEmail}</p>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-700 text-xs font-medium">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold block text-rose-800">Error Updating Password</span>
                    <p className="leading-relaxed">{errorMessage}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoFocus
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-[#ff6452] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Re-type new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-[#ff6452] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password strength tips */}
                <div className="bg-gray-50 rounded-xl p-3 text-[11px] text-gray-500 space-y-1 border border-gray-100">
                  <div className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#ff6452]" />
                    <span>Password Requirements:</span>
                  </div>
                  <ul className="list-disc list-inside pl-1 text-[11px] text-gray-500 space-y-0.5">
                    <li className={password.length >= 6 ? 'text-emerald-600 font-semibold' : ''}>
                      At least 6 characters
                    </li>
                    <li className={password && password === confirmPassword ? 'text-emerald-600 font-semibold' : ''}>
                      Both password entries must match
                    </li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-[#ff6452] hover:bg-[#ff523d] text-white font-bold rounded-2xl shadow-md shadow-[#ff6452]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </form>
            </>
          )}

          {/* 4. Expired or Invalid Link State */}
          {!isVerifyingSession && !isSuccess && !hasValidRecoverySession && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Reset Link Expired or Invalid</span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {errorMessage ||
                    'This password reset link is invalid, has expired, or was already used. Please request a fresh reset link below.'}
                </p>
              </div>

              {/* Request New Link Form */}
              <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-3">
                <h3 className="text-xs font-bold uppercase text-gray-700">Request New Reset Link</h3>
                {resendSent && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl">
                    New reset link has been dispatched! Please check your inbox and spam folder.
                  </div>
                )}
                <form onSubmit={handleResendResetEmail} className="space-y-3">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="Enter your email address"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:border-[#ff6452] outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isResending || resendCooldown > 0}
                    className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Link...</span>
                      </>
                    ) : resendCooldown > 0 ? (
                      <span>Resend available in {resendCooldown}s</span>
                    ) : (
                      <span>Send New Reset Link</span>
                    )}
                  </button>
                </form>
              </div>

              <div className="text-center pt-2">
                <Link
                  to="/account"
                  className="text-xs font-semibold text-[#ff6452] hover:underline"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}

          {/* Footer Back to Home */}
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
