import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  UserCheck,
  CreditCard,
  Database,
  Mail,
  Trash2,
  FileText,
  ArrowLeft,
  ExternalLink,
  Printer,
  Phone,
  MessageSquare,
  Globe,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { STORE_CONFIG } from '../constants/config';
import { SEOHead } from '../components/SEOHead';

const EFFECTIVE_DATE = 'October 5, 2026';
const PUBLIC_STORE_URL = 'https://kudstore.netlify.app';

export const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();
  const { generalSettings, user } = useShop();

  const storeName = generalSettings?.storeName || STORE_CONFIG.STORE_NAME || 'KUD Store';
  const contactEmail = generalSettings?.contactEmail || STORE_CONFIG.CONTACT_EMAIL;
  const contactPhone = generalSettings?.contactPhone || STORE_CONFIG.CONTACT_PHONE;
  const whatsappNumber = generalSettings?.whatsappSupport || STORE_CONFIG.WHATSAPP_SUPPORT;
  const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');

  const sections = [
    { id: 'identity', title: '1. Store Identity & Contact Details' },
    { id: 'accounts-auth', title: '2. Account Registration, Authentication & Google Sign-In' },
    { id: 'personal-data', title: '3. Customer Profile & Personal Data Collected' },
    { id: 'delivery-orders', title: '4. Delivery Addresses, Cart & Order Processing' },
    { id: 'yoco-payments', title: '5. Yoco Payment Processing & Transaction Data' },
    { id: 'supabase-infrastructure', title: '6. Supabase Database & Authentication Infrastructure' },
    { id: 'order-emails', title: '7. Transactional Order Emails & Notifications' },
    { id: 'local-storage', title: '8. Browser Local Storage, Session Storage & Cookies' },
    { id: 'analytics-pixels', title: '9. Attribution Analytics & Marketing Pixels' },
    { id: 'third-party-providers', title: '10. Third-Party Service Providers' },
    { id: 'security', title: '11. Information Security Measures' },
    { id: 'data-retention', title: '12. Data Retention Policy' },
    { id: 'account-deletion', title: '13. Account & Personal Data Deletion' },
    { id: 'privacy-rights', title: '14. Your Privacy Rights (POPIA & Global Standards)' },
    { id: 'childrens-privacy', title: '15. Children’s Privacy' },
    { id: 'policy-changes', title: '16. Changes to This Privacy Policy' },
  ];

  const deletionEmailHref = `mailto:${contactEmail}?subject=${encodeURIComponent(
    `Account & Personal Data Deletion Request - ${storeName}`
  )}&body=${encodeURIComponent(
    `Hello ${storeName} Privacy Team,\n\nPlease permanently delete my customer account and associated personal data.\n\nRegistered Email Address: ${
      user?.email || '[Enter your registered email]'
    }\nFull Name: ${user?.fullName || '[Enter your full name]'}\n\nThank you.`
  )}`;

  return (
    <>
      <SEOHead
        title={`Privacy Policy | ${storeName}`}
        description={`Official Privacy Policy for ${storeName}. Learn how we collect, protect, process, and delete customer data, orders, and Yoco payments in South Africa.`}
        canonicalPath="/privacy-policy"
      />

      <div className="min-h-screen bg-gray-50/60 dark:bg-slate-950 pb-28">
        {/* Top Navigation Bar */}
        <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-600 dark:text-slate-300 hover:text-[#ff6452] dark:hover:text-[#ff6452] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-4 text-xs sm:text-sm">
              <Link
                to="/terms-and-conditions"
                className="font-semibold text-gray-600 dark:text-slate-300 hover:text-[#ff6452] dark:hover:text-[#ff6452] hover:underline transition-colors"
              >
                Terms &amp; Conditions
              </Link>
              <span className="text-gray-300 dark:text-slate-700" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 font-semibold text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Print or save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Document Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#ff6452] uppercase tracking-wider mb-3">
              <ShieldCheck className="w-4 h-4" />
              <span>Legal &amp; Data Protection Disclosure</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              Privacy Policy
            </h1>

            <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              This Privacy Policy explains how <strong>{storeName}</strong> (&ldquo;KUD Store&rdquo;, &ldquo;we&rdquo;,
              &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses, stores, shares, and protects your personal
              information when you use our e-commerce web application (
              <a
                href={`${PUBLIC_STORE_URL}/privacy-policy`}
                className="text-[#ff6452] hover:underline font-medium"
              >
                {PUBLIC_STORE_URL}
              </a>
              ) and mobile application.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-slate-400">
              <span>
                Effective Date: <strong className="text-gray-800 dark:text-slate-200">{EFFECTIVE_DATE}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Jurisdiction: <strong className="text-gray-800 dark:text-slate-200">Republic of South Africa (POPIA Compliant)</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Contact: <strong className="text-gray-800 dark:text-slate-200">{contactEmail}</strong>
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Table of Contents Sidebar */}
          <aside className="lg:col-span-4 xl:col-span-4">
            <nav
              aria-label="Privacy Policy Table of Contents"
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 lg:sticky lg:top-24 space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                <FileText className="w-4 h-4 text-[#ff6452]" />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-white">
                  Contents
                </h2>
              </div>

              <ol className="space-y-2 text-xs">
                {sections.map((sec) => (
                  <li key={sec.id}>
                    <a
                      href={`#${sec.id}`}
                      className="text-gray-600 dark:text-slate-400 hover:text-[#ff6452] dark:hover:text-[#ff6452] transition-colors block py-0.5 leading-snug"
                    >
                      {sec.title}
                    </a>
                  </li>
                ))}
              </ol>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
                <Link
                  to="/account#delete-account"
                  className="w-full py-2.5 px-3 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account &amp; Data</span>
                </Link>
              </div>
            </nav>
          </aside>

          {/* Policy Article */}
          <article className="lg:col-span-8 xl:col-span-8 space-y-6">
            {/* Section 1: Store Identity */}
            <section
              id="identity"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                1. Store Identity &amp; Contact Details
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <strong>{storeName}</strong> operates as an online retail marketplace in the Republic of South Africa,
                offering electronics, beauty products, home essentials, fashion, and customizable goods with nationwide
                delivery. For the purposes of the South African Protection of Personal Information Act, 2013 (Act No. 4
                of 2013) (&ldquo;POPIA&rdquo;) and Google Play Store developer policies, {storeName} is the Responsible
                Party (Data Controller) for personal information collected through this application.
              </p>
              <address className="not-italic bg-gray-50 dark:bg-slate-800/60 rounded-xl p-4 border border-gray-100 dark:border-slate-800 text-xs sm:text-sm text-gray-700 dark:text-slate-300 space-y-2">
                <div className="font-bold text-gray-900 dark:text-white">{storeName} — Privacy &amp; Customer Support</div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#ff6452] shrink-0" />
                  <span>
                    Email:{' '}
                    <a href={`mailto:${contactEmail}`} className="text-[#ff6452] font-semibold hover:underline">
                      {contactEmail}
                    </a>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#ff6452] shrink-0" />
                  <span>Telephone: {contactPhone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    WhatsApp Support:{' '}
                    <a
                      href={`https://wa.me/${cleanWhatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                    >
                      {whatsappNumber}
                    </a>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Web URL:{' '}
                    <a href={PUBLIC_STORE_URL} className="text-blue-600 dark:text-blue-400 hover:underline">
                      {PUBLIC_STORE_URL}
                    </a>
                  </span>
                </div>
              </address>
            </section>

            {/* Section 2: Account Registration & Auth */}
            <section
              id="accounts-auth"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-[#ff6452] shrink-0" />
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  2. Account Registration, Authentication &amp; Google Sign-In
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                Customers may browse products without signing in, or register an account to place orders, track
                deliveries, save wishlist items, and participate in our referral rewards program. We support the
                following authentication methods powered by Supabase Authentication:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  <strong>Email &amp; Password Authentication:</strong> When you create an account using your email
                  address and password, we send an email confirmation link to verify your identity. Passwords are
                  cryptographically hashed by Supabase Auth and are never visible to or stored in plain text by{' '}
                  {storeName}.
                </li>
                <li>
                  <strong>Google Sign-In (OAuth 2.0):</strong> When enabled and selected by you (&ldquo;Continue with
                  Google&rdquo;), we authenticate your session via Google OAuth. We receive only your basic Google
                  account profile identifiers (your name, email address, and profile avatar URL if provided) to create
                  or sign in to your {storeName} customer profile. We do not access your Google contacts, drive files,
                  or private workspace data.
                </li>
                <li>
                  <strong>Apple Sign-In (OAuth):</strong> Where enabled and selected by you, Apple OAuth provides your
                  verified email address (or Apple private relay email) and name for authentication.
                </li>
              </ul>
            </section>

            {/* Section 3: Personal Data Collected */}
            <section
              id="personal-data"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                3. Customer Profile &amp; Personal Data Collected
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                We collect only the personal information that you voluntarily provide when registering an account,
                updating your profile, or completing an order:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  <strong>Identity &amp; Contact Information:</strong> Full name, email address, and South African
                  mobile/telephone number (used for order updates and courier delivery coordination).
                </li>
                <li>
                  <strong>Profile Demographics:</strong> Age (minimum age 13) and gender selection (Male/Female)
                  provided during account sign-up or profile editing in the Account dashboard.
                </li>
                <li>
                  <strong>Customer Reviews &amp; Product Customizations:</strong> Star ratings, written review comments,
                  optional review photos, and customization inputs (such as custom engraving text, print position,
                  selected dimensions, or reference images uploaded to our storage bucket for customized merchandise).
                </li>
                <li>
                  <strong>Referral &amp; Wallet Records:</strong> If you use our Invite Friends &amp; Referral Rewards
                  feature, we record your referral code, invited friend email invitations, earned referral commissions,
                  discount vouchers, and digital store wallet balance.
                </li>
              </ul>
            </section>

            {/* Section 4: Delivery & Orders */}
            <section
              id="delivery-orders"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                4. Delivery Addresses, Cart &amp; Order Processing
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                To fulfill and deliver your purchases across South Africa, we collect and process:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  <strong>Delivery Address Details:</strong> Recipient full name, street address line, city/town, South
                  African province, postal code, contact phone number, and optional delivery instructions.
                </li>
                <li>
                  <strong>Cart &amp; Wishlist Data:</strong> Products, quantities, variants, and custom options added to
                  your shopping cart or saved to your customer wishlist.
                </li>
                <li>
                  <strong>Order Fulfilment &amp; Courier Sharing:</strong> Your delivery name, physical delivery
                  address, and contact phone number are shared strictly as necessary with our South African courier
                  partners (such as The Courier Guy and Aramex) to dispatch and deliver your parcel.
                </li>
              </ul>
            </section>

            {/* Section 5: Yoco Payments */}
            <section
              id="yoco-payments"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-[#ff6452] shrink-0" />
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  5. Yoco Payment Processing &amp; Transaction Data
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                Online card and electronic payments are processed through <strong>Yoco</strong> (Yoco Technologies (Pty)
                Ltd) using Yoco&rsquo;s secure Hosted Checkout infrastructure, as well as other configured checkout
                methods (such as Instant EFT, PayFast, Cash on Delivery, or KUD Store Wallet credit where enabled).
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  <strong>No Storage of Card Credentials:</strong> {storeName} <strong>never</strong> collects, views,
                  processes, or stores your raw credit/debit card number, CVV security code, PIN, or online banking
                  passwords. When you pay via Yoco, you are redirected to Yoco&rsquo;s PCI-DSS compliant hosted payment
                  page.
                </li>
                <li>
                  <strong>Transaction Records Stored:</strong> We store only the order number, itemized subtotal,
                  delivery fee, discounts, VAT/tax amount, total amount in ZAR, payment method name, payment status (
                  <code>pending</code>, <code>paid</code>, <code>failed</code>, <code>cancelled</code>), Yoco checkout
                  identifier (<code>yoco_checkout_id</code>), verified payment reference ID, and payment timestamp (
                  <code>paid_at</code>).
                </li>
                <li>
                  <strong>Server-Side Payment Verification:</strong> Payment confirmations are verified server-to-server
                  via cryptographically signed Yoco webhooks (HMAC-SHA256) and direct Yoco Checkout API verification to
                  prevent tampering or fraudulent transactions.
                </li>
              </ul>
            </section>

            {/* Section 6: Supabase Infrastructure */}
            <section
              id="supabase-infrastructure"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-[#ff6452] shrink-0" />
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  6. Supabase Database &amp; Authentication Infrastructure
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                Our application uses <strong>Supabase</strong> as our cloud database, authentication, serverless Edge
                Function, and media storage provider:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  Customer accounts, profiles, orders, order items, wishlists, reviews, notifications, and notification
                  preferences are stored in PostgreSQL database tables protected by PostgreSQL Row-Level Security (RLS)
                  policies.
                </li>
                <li>
                  RLS policies enforce that authenticated customers can only read, update, or delete their own personal
                  records, notifications, and preferences.
                </li>
                <li>
                  Uploaded product customization images and review media are stored in dedicated Supabase Storage
                  buckets.
                </li>
              </ul>
            </section>

            {/* Section 7: Order Emails & Notifications */}
            <section
              id="order-emails"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                7. Transactional Order Emails &amp; Notifications
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                We use your email address and account notification system to send essential service communications:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  <strong>Transactional Emails:</strong> Account verification links, password reset emails, purchase
                  confirmation emails, PDF tax invoices, and referral reward notices.
                </li>
                <li>
                  <strong>In-App &amp; Push Notifications:</strong> Real-time notifications for order placement
                  (&ldquo;Order Placed&rdquo;), Yoco payment confirmation (&ldquo;Payment Successful&rdquo; or
                  &ldquo;Payment Failed&rdquo;), order status updates, shipping/collection readiness, and delivery
                  completion. You can customize or disable specific notification categories at any time in your
                  Notification Preferences modal.
                </li>
                <li>
                  <strong>Web Push Subscriptions:</strong> Browser push notifications are off by default and are only
                  activated if you explicitly grant browser notification permission. If enabled, your browser&rsquo;s
                  push endpoint and public encryption keys (<code>p256dh</code> and <code>auth</code>) are stored in our{' '}
                  <code>push_subscriptions</code> table and can be revoked at any time.
                </li>
              </ul>
            </section>

            {/* Section 8: Cookies & Local Storage */}
            <section
              id="local-storage"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                8. Browser Local Storage, Session Storage &amp; Cookies
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                {storeName} uses standard browser <code>localStorage</code> and <code>sessionStorage</code> to keep the
                application fast, reliable, and functional across page reloads:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  <strong>Authentication Session:</strong> Supabase Auth stores session tokens locally so you stay
                  signed in until you sign out or your session expires.
                </li>
                <li>
                  <strong>Shopping Cart &amp; Wishlist Cache:</strong> Cart items (<code>kud_store_cart</code>), saved
                  favourites, and recent product searches are stored locally so your bag is preserved while browsing.
                </li>
                <li>
                  <strong>Checkout Recovery &amp; UI Preferences:</strong> Active pending checkout order IDs (
                  <code>kud_pending_checkout_order_id</code>) in <code>sessionStorage</code> prevent duplicate order
                  creation during Yoco payment redirects, and your light/dark display theme preference is saved in{' '}
                  <code>localStorage</code>.
                </li>
              </ul>
            </section>

            {/* Section 9: Analytics & Marketing Pixels */}
            <section
              id="analytics-pixels"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                9. Attribution Analytics &amp; Marketing Pixels
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                To understand how customers discover our products and measure campaign effectiveness:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  <strong>First-Party UTM Attribution:</strong> When you visit {storeName} via a campaign link
                  containing UTM parameters (such as <code>utm_source</code>, <code>utm_medium</code>, or{' '}
                  <code>utm_campaign</code>), we record those campaign parameters with your session and order to measure
                  store performance.
                </li>
                <li>
                  <strong>Optional Meta Pixel &amp; TikTok Pixel:</strong> Our platform supports optional integration
                  with Meta Pixel (Facebook/Instagram) and TikTok Pixel when configured and enabled by store
                  administration. When active, these pixels record standard e-commerce events (<code>PageView</code>,{' '}
                  <code>ViewContent</code>, <code>AddToCart</code>, <code>InitiateCheckout</code>, and{' '}
                  <code>Purchase</code>). We do not sell your personal information to third-party data brokers.
                </li>
              </ul>
            </section>

            {/* Section 10: Third-Party Service Providers */}
            <section
              id="third-party-providers"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                10. Third-Party Service Providers
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                We share data only with trusted infrastructure and fulfilment partners required to operate {storeName}:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  <strong>Supabase Inc.:</strong> Database hosting, user authentication, serverless functions, and file
                  storage.
                </li>
                <li>
                  <strong>Yoco Technologies (Pty) Ltd:</strong> Secure online card and electronic payment processing in
                  South Africa.
                </li>
                <li>
                  <strong>Google LLC / Apple Inc.:</strong> Optional OAuth 2.0 single sign-on authentication when
                  chosen by the user.
                </li>
                <li>
                  <strong>South African Courier Partners (The Courier Guy / Aramex):</strong> Nationwide door-to-door
                  parcel delivery and tracking.
                </li>
                <li>
                  <strong>Netlify / Cloud Hosting Infrastructure:</strong> Secure web application hosting and content
                  delivery.
                </li>
              </ul>
            </section>

            {/* Section 11: Security Measures */}
            <section
              id="security"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-[#ff6452] shrink-0" />
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  11. Information Security Measures
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                We implement technical and organizational safeguards designed to protect your personal data against
                unauthorized access, alteration, or disclosure:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>All data transmitted between your device and our servers is encrypted using HTTPS/TLS.</li>
                <li>
                  Database tables enforce strict Row-Level Security (RLS) and tamper-prevention triggers so customers
                  can access only their own data.
                </li>
                <li>
                  Order prices, stock availability, and discount calculations are validated server-side before checkout.
                </li>
                <li>
                  Payment gateway secret keys and database service-role keys are strictly isolated on the server and are
                  never exposed in client-side code.
                </li>
              </ul>
            </section>

            {/* Section 12: Data Retention */}
            <section
              id="data-retention"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                12. Data Retention Policy
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                We retain your personal profile information for as long as your customer account remains active or as
                needed to provide you with our services. When you delete your account:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  Your personal profile details (full name, email, phone number, age, gender, saved address), wishlist
                  items, notifications, notification preferences, and push subscriptions are permanently deleted.
                </li>
                <li>
                  In accordance with South African tax and accounting laws (including the Tax Administration Act, No. 28
                  of 2011), historical financial transaction and invoice amounts are retained in an{' '}
                  <strong>anonymized</strong> format (with your personal name, email, phone number, and street address
                  redacted) strictly for statutory audit and tax compliance.
                </li>
              </ul>
            </section>

            {/* Section 13: Account & Personal Data Deletion */}
            <section
              id="account-deletion"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border-2 border-rose-200 dark:border-rose-900/60 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-5 h-5 text-[#ff6452] shrink-0" />
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  13. Account &amp; Personal Data Deletion
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                You have the right to delete your {storeName} account and associated personal data at any time. We
                provide two convenient methods to complete account deletion:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 space-y-2.5">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Option A: Instant In-App Self-Service Deletion
                  </h3>
                  <ol className="list-decimal pl-4 space-y-1 text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                    <li>
                      Sign in to your account at{' '}
                      <Link to="/account" className="text-[#ff6452] font-semibold hover:underline">
                        /account
                      </Link>
                      .
                    </li>
                    <li>
                      Scroll to the <strong>Privacy, Legal &amp; Account Deletion</strong> section at the bottom of your
                      Account page.
                    </li>
                    <li>
                      Click <strong>Delete Account &amp; Personal Data</strong> and confirm by typing{' '}
                      <code>DELETE</code>.
                    </li>
                  </ol>
                  <div className="pt-1">
                    <Link
                      to="/account#delete-account"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#ff6452] hover:bg-[#ff523d] text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Go to Account Deletion</span>
                    </Link>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 space-y-2.5">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Option B: Web / Email Deletion Request (No Login Required)
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                    If you have uninstalled the app or cannot sign in, you may request permanent deletion of your
                    account and personal data by emailing our privacy team from your registered email address. Requests
                    are processed within 7 business days.
                  </p>
                  <div className="pt-1">
                    <a
                      href={deletionEmailHref}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Request Deletion via Email</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 14: Privacy Rights */}
            <section
              id="privacy-rights"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                14. Your Privacy Rights (POPIA &amp; Global Standards)
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                Under the Protection of Personal Information Act (POPIA) and applicable privacy laws, you have the right
                to:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  <strong>Access &amp; Portability:</strong> Request confirmation of what personal information we hold
                  about you and view your profile, order history, and tax invoices directly in your Account dashboard.
                </li>
                <li>
                  <strong>Correction &amp; Updating:</strong> Update your name, phone number, age, gender, and delivery
                  address at any time using the <em>Personal &amp; Contact Details</em> editor on your Account page.
                </li>
                <li>
                  <strong>Withdraw Consent &amp; Manage Notifications:</strong> Opt out of specific notification types
                  or revoke browser push notifications through the Notification Preferences settings.
                </li>
                <li>
                  <strong>Deletion / Erasure:</strong> Permanently delete your account and personal data as described in
                  Section 13.
                </li>
                <li>
                  <strong>Lodge a Complaint:</strong> Contact us directly at{' '}
                  <a href={`mailto:${contactEmail}`} className="text-[#ff6452] font-semibold hover:underline">
                    {contactEmail}
                  </a>{' '}
                  or lodge a complaint with the Information Regulator (South Africa) at{' '}
                  <span className="font-mono text-xs">inforegulator.org.za</span>.
                </li>
              </ul>
            </section>

            {/* Section 15: Children's Privacy */}
            <section
              id="childrens-privacy"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                15. Children&rsquo;s Privacy
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                {storeName} is not directed to children under the age of 13, and our account registration form enforces
                a minimum age requirement of 13 years. Customers under the age of 18 may only place orders with the
                involvement and consent of a parent or legal guardian. If we learn that we have inadvertently collected
                personal information from a child under 13 without parental consent, we will promptly delete that
                information. Please contact us at{' '}
                <a href={`mailto:${contactEmail}`} className="text-[#ff6452] font-semibold hover:underline">
                  {contactEmail}
                </a>{' '}
                if you believe a child under 13 has provided personal data to us.
              </p>
            </section>

            {/* Section 16: Policy Changes */}
            <section
              id="policy-changes"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                16. Changes to This Privacy Policy
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our store features, payment
                providers, or legal requirements. When we make material changes, we will update the{' '}
                <strong>Effective Date</strong> at the top of this page. Continued use of {storeName} after any update
                constitutes acceptance of the revised Privacy Policy.
              </p>
              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500 dark:text-slate-400">
                <span>Effective Date: {EFFECTIVE_DATE}</span>
                <Link
                  to="/terms-and-conditions"
                  className="font-bold text-[#ff6452] hover:underline inline-flex items-center gap-1"
                >
                  <span>Read Terms &amp; Conditions</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </section>
          </article>
        </div>
      </div>
    </>
  );
};
