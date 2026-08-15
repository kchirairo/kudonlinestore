import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, RefreshCw, KeyRound, Lock } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { adminService } from '../../services/adminService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { SEOHead } from '../SEOHead';

export const AdminLayout: React.FC = () => {
  const { user, isAuthLoading } = useShop();
  const navigate = useNavigate();
  const location = useLocation();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);

  // Fetch current user's profile role from the 'profiles' table using Supabase client
  useEffect(() => {
    let isMounted = true;

    async function checkAdminAccess() {
      setIsCheckingAdmin(true);

      if (!isSupabaseConfigured() || !supabase) {
        // Fallback if Supabase credentials are not configured
        const demoAdmin = localStorage.getItem('kud_store_demo_admin') === 'true';
        if (user?.role === 'admin' || demoAdmin) {
          if (isMounted) {
            setIsAuthenticated(true);
            setIsAdmin(true);
            setIsCheckingAdmin(false);
          }
        } else if (user) {
          if (isMounted) {
            setIsAuthenticated(true);
            setIsAdmin(false);
            setIsCheckingAdmin(false);
          }
        } else {
          if (isMounted) {
            setIsAuthenticated(false);
            setIsAdmin(false);
            setIsCheckingAdmin(false);
          }
        }
        return;
      }

      try {
        // 1. Get current user from Supabase auth.getUser()
        const {
          data: { user: authUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !authUser) {
          console.log('No authenticated user found. Redirecting to: /login');
          if (isMounted) {
            setIsAuthenticated(false);
            setIsAdmin(false);
            setIsCheckingAdmin(false);
          }
          return;
        }

        console.log('Authenticated user ID:', authUser.id);

        if (isMounted) {
          setIsAuthenticated(true);
        }

        // 2. Fetch current user's profile role from 'public.profiles' table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error querying profile in AdminLayout:', profileError);
        }

        let userRole = profile?.role;

        // Fallback check via RPC if profiles query returned null role
        if (!userRole && !profileError) {
          const { data: rpcIsAdmin } = await supabase.rpc('is_admin');
          if (rpcIsAdmin === true) {
            userRole = 'admin';
          }
        }

        console.log('Profile role:', userRole || 'none');

        const isUserAdmin =
          userRole === 'admin' ||
          user?.role === 'admin' ||
          localStorage.getItem('kud_store_demo_admin') === 'true';

        if (isUserAdmin) {
          console.log('Redirecting to: /admin');
        } else {
          console.log('Redirecting to: /');
        }

        if (isMounted) {
          setIsAdmin(isUserAdmin);
          setIsCheckingAdmin(false);
        }
      } catch (err) {
        console.warn('Supabase admin check failed:', err);
        if (isMounted) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setIsCheckingAdmin(false);
        }
      }
    }

    if (!isAuthLoading) {
      checkAdminAccess();
    }

    // Subscribe to auth state changes to dynamically re-verify access
    let subscription: any = null;
    if (isSupabaseConfigured() && supabase) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
          if (isMounted) {
            setIsAuthenticated(false);
            setIsAdmin(false);
            setIsCheckingAdmin(false);
          }
        } else {
          checkAdminAccess();
        }
      });
      subscription = data.subscription;
    }

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user, isAuthLoading]);

  // Automatically redirect non-authenticated users to sign-in page (/account)
  useEffect(() => {
    if (!isCheckingAdmin && !isAuthLoading && isAuthenticated === false) {
      const redirectTimer = setTimeout(() => {
        navigate('/account', { replace: true });
      }, 1200);
      return () => clearTimeout(redirectTimer);
    }
  }, [isCheckingAdmin, isAuthLoading, isAuthenticated, navigate]);

  // Fetch pending orders count for sidebar badge
  useEffect(() => {
    if (isAdmin) {
      adminService.getOrders({ status: 'Pending' }).then((pendingOrders) => {
        setPendingOrdersCount(pendingOrders.length);
      });
    }
  }, [isAdmin, location.pathname]);

  // Determine header page title based on current path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/admin') return 'Dashboard Overview';
    if (path.startsWith('/admin/orders')) return 'Order Management';
    if (path.startsWith('/admin/products/new')) return 'Add New Product';
    if (path.includes('/edit')) return 'Edit Product';
    if (path.startsWith('/admin/products')) return 'Product Inventory';
    if (path.startsWith('/admin/categories')) return 'Product Categories';
    if (path.startsWith('/admin/customers')) return 'Customer Directory';
    if (path.startsWith('/admin/settings')) return 'Store Configuration';
    return 'Admin Portal';
  };

  // 1. Loading state
  if (isAuthLoading || isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#ff6452] mx-auto flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-gray-900 text-base">Checking account...</h3>
            <p className="text-xs text-gray-400">Verifying profile role and permissions</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Redirect to /login
  if (isAuthenticated === false) {
    return <Navigate to="/login" replace />;
  }

  // 3. Authenticated but user does NOT have the 'admin' role: Render unauthorized access message instead of outlet
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-gray-100 shadow-sm max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900">Unauthorized Access</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Your profile (<span className="font-bold text-gray-800">{user?.email || 'User'}</span>) does not have the <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800 font-mono text-[11px]">admin</code> role in the <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800 font-mono text-[11px]">profiles</code> table.
            </p>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left space-y-1">
            <p className="text-[11px] font-bold text-amber-900">Administrator Setup Note:</p>
            <p className="text-[11px] text-amber-800 leading-normal">
              To grant your profile full admin status in Supabase, update your row in <code className="font-mono">profiles</code>: <br />
              <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px] font-mono text-amber-950">
                UPDATE profiles SET role = 'admin' WHERE id = '{user?.id}';
              </code>
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-[#ff6452] hover:bg-[#ff4935] text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Customer Store</span>
            </button>

            <button
              onClick={() => {
                localStorage.setItem('kud_store_demo_admin', 'true');
                window.location.reload();
              }}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-[#ff6452]" />
              <span>Bypass to Demo Admin View</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authenticated with 'admin' role: Render admin layout and route outlet
  return (
    <>
      <SEOHead
        title="Admin Portal | KUD Store"
        description="Administrative management portal."
        canonicalPath="/admin"
        noindex={true}
      />
      <div className="min-h-screen bg-gray-50/50 flex">
        {/* Sidebar Navigation */}
        <AdminSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          pendingOrdersCount={pendingOrdersCount}
        />

        {/* Main Content Wrap */}
        <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
          <AdminHeader
            onToggleSidebar={() => setIsSidebarOpen(true)}
            title={getPageTitle()}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
};

