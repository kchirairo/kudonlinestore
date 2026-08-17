import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface AuthContextType {
  user: any | null;
  profile: any | null;
  role: 'customer' | 'admin' | null;
  loading: boolean;
  isAdmin: boolean;
  authError: string | null;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  isAdmin: false,
  authError: null,
  signOut: async () => {},
  refetchProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [role, setRole] = useState<'customer' | 'admin' | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  const fetchUserAndProfile = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) {
      // Demo login check if Supabase is not configured
      const isDemoAdmin = localStorage.getItem('kud_store_demo_admin') === 'true';
      const isDemoUser = localStorage.getItem('kud_store_demo_user') === 'true';
      if (isDemoAdmin) {
        setUser({ id: 'demo-admin-id', email: 'admin@kudstore.com' });
        setProfile({ id: 'demo-admin-id', role: 'admin', full_name: 'Demo Admin' });
        setRole('admin');
      } else if (isDemoUser) {
        setUser({ id: 'demo-customer-id', email: 'customer@kudstore.co.za' });
        setProfile({ id: 'demo-customer-id', role: 'customer', full_name: 'Sipho Dlamini (Demo)' });
        setRole('customer');
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setAuthError(null);

      // 1. Get authenticated user from supabase.auth.getUser()
      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !authUser) {
        const isDemoAdmin = localStorage.getItem('kud_store_demo_admin') === 'true';
        const isDemoUser = localStorage.getItem('kud_store_demo_user') === 'true';
        if (isDemoAdmin) {
          setUser({ id: 'demo-admin-id', email: 'admin@kudstore.com' });
          setProfile({ id: 'demo-admin-id', role: 'admin', full_name: 'Demo Admin' });
          setRole('admin');
        } else if (isDemoUser) {
          setUser({ id: 'demo-customer-id', email: 'customer@kudstore.co.za' });
          setProfile({ id: 'demo-customer-id', role: 'customer', full_name: 'Sipho Dlamini (Demo)' });
          setRole('customer');
        } else {
          setUser(null);
          setProfile(null);
          setRole(null);
        }
        setLoading(false);
        return;
      }

      console.log('Authenticated user ID:', authUser.id);

      // 2. Query user's profile: public.profiles where id = authenticatedUser.id select role
      let { data: profileRow, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileErr) {
        console.error('Error querying profile from public.profiles:', profileErr);
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
            authUser.email?.split('@')[0] ||
            'User';

          const { data: createdProfile } = await supabase
            .from('profiles')
            .upsert(
              {
                id: authUser.id,
                full_name: defaultName,
                role: fetchedRole || 'customer',
                phone: authUser.phone || '',
                created_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            )
            .select('*')
            .maybeSingle();

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

      console.log('Profile role:', fetchedRole);

      setUser(authUser);
      setProfile(profileRow || { id: authUser.id, role: fetchedRole });
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
      localStorage.removeItem('kud_store_demo_admin');
      localStorage.removeItem('kud_store_demo_user');
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
    () => role === 'admin' || localStorage.getItem('kud_store_demo_admin') === 'true',
    [role]
  );

  const contextValue = useMemo(
    () => ({
      user,
      profile,
      role,
      loading,
      isAdmin,
      authError,
      signOut: handleSignOut,
      refetchProfile: fetchUserAndProfile,
    }),
    [user, profile, role, loading, isAdmin, authError, handleSignOut, fetchUserAndProfile]
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
  if (!user && !localStorage.getItem('kud_store_demo_admin')) {
    console.log('Unauthenticated access attempt to /admin. Redirecting to: /login');
    return <Navigate to="/login" replace />;
  }

  // 2. Authenticated but role !== 'admin' -> Redirect to customer home '/'
  if (!isAdmin && role !== 'admin') {
    console.log(`Authenticated user role "${role}" is not admin. Redirecting to: /`);
    return <Navigate to="/" replace />;
  }

  // 3. Authenticated Admin -> Render children or Outlet
  return children ? <>{children}</> : <Outlet />;
};
