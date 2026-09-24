import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, ProtectedAdminRoute } from './context/AuthContext';
import { ShopProvider } from './context/ShopContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { ToastContainer } from './components/Toast';

import { HomePage } from './pages/HomePage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CategoryDetailsPage } from './pages/CategoryDetailsPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { FavouritesPage } from './pages/FavouritesPage';
import { WishlistPage } from './pages/WishlistPage';
import { SearchPage } from './pages/SearchPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AccountPage } from './pages/AccountPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailsPage } from './pages/OrderDetailsPage';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';

// Admin Layout & Pages
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminOrderDetailsPage } from './pages/admin/AdminOrderDetailsPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminAddProductPage } from './pages/admin/AdminAddProductPage';
import { AdminEditProductPage } from './pages/admin/AdminEditProductPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import { AdminCustomerDetailsPage } from './pages/admin/AdminCustomerDetailsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminInvoicesPage } from './pages/admin/AdminInvoicesPage';
import { AdminMarketingAnalyticsPage } from './pages/admin/AdminMarketingAnalyticsPage';
import { AdminBannersPage } from './pages/admin/AdminBannersPage';
import { AdminNotificationsPage } from './pages/admin/AdminNotificationsPage';
import { marketingService } from './services/marketingService';

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  React.useEffect(() => {
    marketingService.initializePixels();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans antialiased selection:bg-[#ff6452] selection:text-white flex flex-col transition-colors duration-200">
      {/* Customer Header (Hidden on Admin routes) */}
      {!isAdminRoute && <Header />}

      {/* Main View Routes */}
      <main className="flex-1">
        <Routes>
          {/* Customer Storefront Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/category/:slug" element={<CategoryDetailsPage />} />
          <Route path="/categories/:slug" element={<CategoryDetailsPage />} />
          <Route path="/product/:id" element={<ProductDetailsPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/favourites" element={<FavouritesPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/login" element={<AccountPage />} />
          <Route path="/signup" element={<AccountPage />} />
          <Route path="/register" element={<AccountPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/verify-email" element={<AuthCallbackPage />} />
          <Route path="/verify" element={<AuthCallbackPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route path="/reset-password" element={<UpdatePasswordPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailsPage />} />

          {/* Protected Admin Portal Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <AdminLayout />
              </ProtectedAdminRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="notifications" element={<AdminNotificationsPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:id" element={<AdminOrderDetailsPage />} />
            <Route path="invoices" element={<AdminInvoicesPage />} />
            <Route path="marketing" element={<AdminMarketingAnalyticsPage />} />
            <Route path="analytics" element={<AdminMarketingAnalyticsPage />} />
            <Route path="banners" element={<AdminBannersPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/new" element={<AdminAddProductPage />} />
            <Route path="products/:id/edit" element={<AdminEditProductPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="customers" element={<AdminCustomersPage />} />
            <Route path="customers/:id" element={<AdminCustomerDetailsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Routes>
      </main>

      {/* Fixed 5-Item Bottom Navigation (Hidden on Admin routes) */}
      {!isAdminRoute && <BottomNavigation />}

      {/* Global Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ShopProvider>
            <AppContent />
          </ShopProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
