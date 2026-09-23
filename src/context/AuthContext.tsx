import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { adminService } from '../services/adminService';

export interface AuthContextType {
  user: any | null;
  profile: any | null;
  role: 'customer' | 'admin' | null;
  accountStatus: 'active' | 'on_hold' | 'disabled' | null;
  loading: boolean;
  isAdmin: boolean;
  authError: string | null;
  isGoogleAuthEnabled: boolean;
  setIsGoogleAuthEnabled: (enabled: boolean) => void;
  refreshGoogleAuthSetting: () => Promise<boolean>;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  accountStatus: null,
  loading: true,
  isAdmin: false,
  authError: null,
  isGoogleAuthEnabled: true,
  setIsGoogleAuthEnabled: () => {},
  refreshGoogleAuthSetting: async () => true,
  signOut: async () => {},
  refetchProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [role, setRole] = useState<'customer' | 'admin' | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Google Auth Visibility Setting from Supabase settings table
  const [isGoogleAuthEnabled, setIsGoogleAuthEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('kud_store_settings_google_auth');
      if (stored !== null) return stored === 'true';
      const genStored = localStorage.getItem('kud_store_settings_general_settings');
      if (genStored) {
        const parsed = JSON.parse(genStored);
        if (parsed.isGoogleAuthEnabled !== undefined) return Boolean(parsed.isGoogleAuthEnabled);
        if (parsed.enableGoogleAuth !== undefined) return Boolean(parsed.enableGoogleAuth);
      }
    } catch {
      // ignore
    }
    return true;
  });

  const isFetchingRef = useRef<boolean>(false);

  // Fetch isGoogleAuthEnabled from Supabase settings table upon app initialization
  const refreshGoogleAuthSetting = useCallback(async (): Promise<boolean> => {
    try {
      const enabled = await adminService.getGoogleAuthEnabled();
      setIsGoogleAuthEnabled(enabled);
      localStorage.setItem('kud_store_settings_google_auth', String(enabled));
      return enabled;
    } catch (err) {
      console.warn('[AuthProvider] Error loading isGoogleAuthEnabled setting:', err);
      return true;
    }
  }, []);

  useEffect(() => {
    refreshGoogleAuthSetting();
  }, [refreshGoogleAuthSetting]);

  const fetchUserAndProfile = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) {
      setUser(null);
      setProfile(null);
      setRole(null);
      setLoading(false);
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setAuthError(null);

      // 1. Authoritatively get authenticated user from Supabase session
      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !authUser) {
        setUser(null);
        setProfile(null);
        setRole(null);
        setLoading(false);
        return;
      }

      console.log('Authenticated user ID:', authUser.id);

      // 2. Query user's profile: public.profiles where id = authenticatedUser.id
      let { data: profileRow, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileErr) {
        console.error('Error querying profile from public.profiles:', profileErr);
      }

      // Check account status: if customer account is disabled, revoke session immediately
      if (profileRow?.account_status === 'disabled') {
        console.warn(`[AuthProvider] User account ${authUser.id} is disabled. Signing out.`);
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setRole(null);
        setAuthError(
          profileRow.disabled_reason
            ? `Your account has been disabled: ${profileRow.disabled_reason}`
            : 'Your account has been disabled by store administration.'
        );
        setLoading(false);
        return;
      }

      let fetchedRole: 'customer' | 'admin' | null = profileRow?.role || null;

      // Fallback check via RPC if role is missing in profile row
      if (!fetchedRole) {
        try {
          const { data: rpcIsAdmin } = await supabase.rpc('is_admin');
          if (rpcIsAdmin === true) {
            fetchedRole = 'admin';
          } else {
            fetchedRole = 'customer';
          }
        } catch {
          fetchedRole = 'customer';
        }
      }

      // Auto-upsert profile row if missing in public.profiles
      if (!profileRow) {
        try {
          const defaultName =
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            authUser.email?.split('@')[0] ||
            'User';
          const defaultAvatar =
            authUser.user_metadata?.avatar_url ||
            authUser.user_metadata?.picture ||
            null;
          const userPhone =
            authUser.user_metadata?.phone ||
            authUser.user_metadata?.phone_number ||
            authUser.phone ||
            '';
          const userAge =
            authUser.user_metadata?.age !== undefined && authUser.user_metadata?.age !== null
              ? Number(authUser.user_metadata.age)
              : null;
          const userGender = authUser.user_metadata?.gender || null;

          const profilePayload: any = {
            id: authUser.id,
            full_name: defaultName,
            role: fetchedRole || 'customer',
            phone: userPhone,
            referral_rewards_enabled: false,
            created_at: new Date().toISOString(),
          };
          if (userAge !== null && !isNaN(userAge)) {
            profilePayload.age = userAge;
          }
          if (userGender) {
            profilePayload.gender = userGender;
          }

          let createdProfile = null;
          const { data: upsertData, error: upsertErr } = await supabase
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'id' })
            .select('*')
            .maybeSingle();

          if (upsertErr) {
            const { data: fallbackData } = await supabase
              .from('profiles')
              .upsert(
                {
                  id: authUser.id,
                  full_name: defaultName,
                  role: fetchedRole || 'customer',
                  phone: userPhone,
                  referral_rewards_enabled: false,
                  created_at: new Date().toISOString(),
                },
                { onConflict: 'id' }
              )
              .select('*')
              .maybeSingle();
            createdProfile = fallbackData;
          } else {
            createdProfile = upsertData;
          }

          if (createdProfile) {
            profileRow = createdProfile;
            if (createdProfile.role) {
              fetchedRole = createdProfile.role;
            }
          }
        } catch (upsertErr) {
          console.warn('Profile auto-creation warning:', upsertErr);
        }
      }

      const resolvedProfile = profileRow || { id: authUser.id, role: fetchedRole };
      if (resolvedProfile) {
        if (!resolvedProfile.phone && (authUser.user_metadata?.phone || authUser.phone)) {
          resolvedProfile.phone = authUser.user_metadata?.phone || authUser.phone;
        }
        if ((resolvedProfile.age === undefined || resolvedProfile.age === null) && authUser.user_metadata?.age) {
          resolvedProfile.age = Number(authUser.user_metadata.age);
        }
        if (!resolvedProfile.gender && authUser.user_metadata?.gender) {
          resolvedProfile.gender = authUser.user_metadata.gender;
        }
      }

      console.log('Profile role:', fetchedRole);

      setUser(authUser);
      setProfile(resolvedProfile);
      setRole(fetchedRole);
    } catch (err: any) {
      console.error('Error loading auth user and profile:', err);
      setAuthError(err.message || 'Error loading profile');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setProfile(null);
      setRole(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }, []);

  useEffect(() => {
    fetchUserAndProfile();

    if (isSupabaseConfigured() && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED' ||
          event === 'INITIAL_SESSION' ||
          event === 'PASSWORD_RECOVERY'
        ) {
          fetchUserAndProfile();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [fetchUserAndProfile]);

  const isAdmin = useMemo(
    () => role === 'admin',
    [role]
  );

  const accountStatus = useMemo<'active' | 'on_hold' | 'disabled' | null>(() => {
    if (!profile) return null;
    if (profile.account_status === 'disabled') return 'disabled';
    if (profile.account_status === 'on_hold') return 'on_hold';
    return 'active';
  }, [profile]);

  const contextValue = useMemo(
    () => ({
      user,
      profile,
      role,
      accountStatus,
      loading,
      isAdmin,
      authError,
      isGoogleAuthEnabled,
      setIsGoogleAuthEnabled,
      refreshGoogleAuthSetting,
      signOut: handleSignOut,
      refetchProfile: fetchUserAndProfile,
    }),
    [
      user,
      profile,
      role,
      accountStatus,
      loading,
      isAdmin,
      authError,
      isGoogleAuthEnabled,
      setIsGoogleAuthEnabled,
      refreshGoogleAuthSetting,
      handleSignOut,
      fetchUserAndProfile,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

/**
 * Protected Route Wrapper to prevent customer dashboard flash
 * Displays "Checking account..." loading screen while role is being verified
 */
export const ProtectedAdminRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, role, loading, isAdmin } = useAuth();

  // Show simple loading screen while authentication and profile role are loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#ff6452] mx-auto flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-gray-900 text-base">Checking account...</h3>
            <p className="text-xs text-gray-400">Verifying session and profile permissions</p>
          </div>
        </div>
      </div>
    );
  }

  // 1. Not authenticated -> Redirect to /login
  if (!user) {
    console.warn('Unauthenticated access attempt to /admin. Redirecting to: /login');
    return <Navigate to="/login?returnUrl=/admin" replace />;
  }

  // 2. Authenticated but role !== 'admin' -> Redirect to customer home '/'
  if (!isAdmin || role !== 'admin') {
    console.warn(`Access denied to /admin: Authenticated user role "${role}" is not admin. Redirecting to: /`);
    return <Navigate to="/" replace />;
  }

  // 3. Authenticated Admin -> Render children or Outlet
  return children ? <>{children}</> : <Outlet />;
};
