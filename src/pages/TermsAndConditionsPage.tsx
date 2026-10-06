import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Scale,
  ShoppingBag,
  CreditCard,
  Truck,
  RotateCcw,
  ShieldAlert,
  UserCheck,
  Lock,
  Trash2,
  ArrowLeft,
  ExternalLink,
  Printer,
  Mail,
  Phone,
  MessageSquare,
  Globe,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { STORE_CONFIG } from '../constants/config';
import { SEOHead } from '../components/SEOHead';

const EFFECTIVE_DATE = 'October 5, 2026';
const PUBLIC_STORE_URL = 'https://kudstore.netlify.app';

export const TermsAndConditionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { generalSettings } = useShop();

  const storeName = generalSettings?.storeName || STORE_CONFIG.STORE_NAME || 'KUD Store';
  const contactEmail = generalSettings?.contactEmail || STORE_CONFIG.CONTACT_EMAIL;
  const contactPhone = generalSettings?.contactPhone || STORE_CONFIG.CONTACT_PHONE;
  const whatsappNumber = generalSettings?.whatsappSupport || STORE_CONFIG.WHATSAPP_SUPPORT;
  const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');
  const standardFee = generalSettings?.deliveryFee ?? STORE_CONFIG.DELIVERY_FEE;
  const expressFee = generalSettings?.expressDeliveryFee ?? STORE_CONFIG.EXPRESS_DELIVERY_FEE;
  const freeThreshold = generalSettings?.freeDeliveryThreshold ?? STORE_CONFIG.FREE_DELIVERY_THRESHOLD;

  const sections = [
    { id: 'use-of-service', title: '1. Use of KUD Store & Agreement to Terms' },
    { id: 'account-responsibilities', title: '2. Account Registration & Responsibilities' },
    { id: 'products-pricing', title: '3. Products, Pricing & Stock Availability' },
    { id: 'orders-acceptance', title: '4. Orders, Customizations & Order Acceptance' },
    { id: 'yoco-payments', title: '5. Payments Through Yoco & Checkout Methods' },
    { id: 'delivery-shipping', title: '6. Delivery, Shipping & Collection' },
    { id: 'returns-refunds', title: '7. Returns, Cancellations & Refunds' },
    { id: 'pricing-errors', title: '8. Product Information & Pricing Errors' },
    { id: 'prohibited-use', title: '9. Prohibited Conduct & Misuse of Service' },
    { id: 'intellectual-property', title: '10. Intellectual Property Rights' },
    { id: 'limitation-liability', title: '11. Disclaimers & Limitation of Liability' },
    { id: 'third-party-services', title: '12. Third-Party Services & Links' },
    { id: 'account-termination', title: '13. Account Suspension, Termination & Deletion' },
    { id: 'changes-to-terms', title: '14. Changes to These Terms' },
    { id: 'governing-law', title: '15. Governing Law & Jurisdiction' },
    { id: 'contact-info', title: '16. Contact Information' },
  ];

  return (
    <>
      <SEOHead
        title={`Terms & Conditions | ${storeName}`}
        description={`Official Terms and Conditions for ${storeName}. Review our policies on orders, Yoco payments, South African courier delivery, returns, and customer accounts.`}
        canonicalPath="/terms-and-conditions"
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
                to="/privacy-policy"
                className="font-semibold text-gray-600 dark:text-slate-300 hover:text-[#ff6452] dark:hover:text-[#ff6452] hover:underline transition-colors"
              >
                Privacy Policy
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
              <Scale className="w-4 h-4" />
              <span>Customer Service Agreement</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              Terms &amp; Conditions
            </h1>

            <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to and use of the{' '}
              <strong>{storeName}</strong> web application (
              <a
                href={`${PUBLIC_STORE_URL}/terms-and-conditions`}
                className="text-[#ff6452] hover:underline font-medium"
              >
                {PUBLIC_STORE_URL}
              </a>
              ) and mobile application, including all product purchases, account features, and Yoco payment transactions.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-slate-400">
              <span>
                Effective Date: <strong className="text-gray-800 dark:text-slate-200">{EFFECTIVE_DATE}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Jurisdiction:{' '}
                <strong className="text-gray-800 dark:text-slate-200">
                  Republic of South Africa (CPA &amp; ECTA Compliant)
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Currency: <strong className="text-gray-800 dark:text-slate-200">South African Rand (ZAR / R)</strong>
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Table of Contents Sidebar */}
          <aside className="lg:col-span-4 xl:col-span-4">
            <nav
              aria-label="Terms and Conditions Table of Contents"
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
                  to="/privacy-policy"
                  className="w-full py-2.5 px-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5 text-[#ff6452]" />
                  <span>View Privacy Policy</span>
                </Link>
              </div>
            </nav>
          </aside>

          {/* Terms Article */}
          <article className="lg:col-span-8 xl:col-span-8 space-y-6">
            {/* 1. Use of KUD Store */}
            <section
              id="use-of-service"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                1. Use of KUD Store &amp; Agreement to Terms
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                By accessing, browsing, registering an account on, or placing an order through{' '}
                <strong>{storeName}</strong>, you agree to be bound by these Terms &amp; Conditions and our{' '}
                <Link to="/privacy-policy" className="text-[#ff6452] font-semibold hover:underline">
                  Privacy Policy
                </Link>
                . If you do not agree with any part of these Terms, please discontinue use of the application. Users
                must be at least 13 years of age to create an account, and customers under 18 years of age may only
                place orders with the consent and supervision of a parent or legal guardian.
              </p>
            </section>

            {/* 2. Account Responsibilities */}
            <section
              id="account-responsibilities"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-[#ff6452] shrink-0" />
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  2. Account Registration &amp; Responsibilities
                </h2>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  <strong>Accurate Information:</strong> You agree to provide true, accurate, and complete information
                  (including your full name, valid email address, South African contact telephone number, and delivery
                  address) when registering or checking out.
                </li>
                <li>
                  <strong>Credential Confidentiality:</strong> Whether you sign in via Email/Password, Google Sign-In,
                  or Apple Sign-In, you are responsible for maintaining the confidentiality of your login credentials
                  and for all activities conducted under your account.
                </li>
                <li>
                  <strong>Referral Program Integrity:</strong> Participation in the {storeName} Invite Friends &amp;
                  Referral Rewards program is subject to anti-abuse verification. Self-referrals, duplicate fake
                  accounts, or fraudulent orders to claim referral commissions or vouchers are strictly prohibited and
                  will result in reward forfeiture or account suspension.
                </li>
              </ul>
            </section>

            {/* 3. Products, Pricing & Availability */}
            <section
              id="products-pricing"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-[#ff6452] shrink-0" />
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  3. Products, Pricing &amp; Stock Availability
                </h2>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  <strong>Currency &amp; VAT:</strong> All prices displayed on {storeName} are quoted in South African
                  Rand (ZAR / R). Applicable Value-Added Tax (VAT) is calculated and itemized clearly during checkout
                  and on official tax invoices where enabled.
                </li>
                <li>
                  <strong>Stock Availability:</strong> All products and variants are offered subject to stock
                  availability. Adding an item to your shopping cart or wishlist does not reserve stock until checkout
                  and payment verification are completed.
                </li>
                <li>
                  <strong>Product Condition:</strong> Product listings specify whether an item is <code>Brand New</code>
                  , <code>Like New</code>, or <code>Refurbished</code>, along with applicable warranty or return
                  eligibility details.
                </li>
              </ul>
            </section>

            {/* 4. Orders & Order Acceptance */}
            <section
              id="orders-acceptance"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                4. Orders, Customizations &amp; Order Acceptance
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                When you place an order at checkout, your order constitutes an offer to purchase the selected products
                under these Terms:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  <strong>Order Confirmation:</strong> An order is accepted once payment is verified (or confirmed for
                  approved Cash on Delivery orders) and you receive an in-app notification (&ldquo;Order Placed&rdquo;
                  / &ldquo;Payment Successful&rdquo;) and order reference number.
                </li>
                <li>
                  <strong>Custom &amp; Personalized Products:</strong> For products where you submit custom text,
                  dimensions, print positions, or custom uploaded reference images, please verify all spelling and
                  specifications carefully before checkout. You warrant that any image or text you upload does not
                  infringe third-party copyrights or trademarks.
                </li>
                <li>
                  <strong>Right to Cancel or Refuse:</strong> We reserve the right to refuse or cancel an order prior to
                  dispatch if stock is unavailable, payment cannot be verified, an obvious pricing error occurred, or
                  the customer account has been placed on hold or disabled for security reasons. If you have already
                  paid for a cancelled order, we will issue a full refund.
                </li>
              </ul>
            </section>

            {/* 5. Payments through Yoco */}
            <section
              id="yoco-payments"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-[#ff6452] shrink-0" />
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  5. Payments Through Yoco &amp; Checkout Methods
                </h2>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  <strong>Yoco Secure Hosted Checkout:</strong> Online card and electronic payments are processed via{' '}
                  <strong>Yoco</strong> (Yoco Technologies (Pty) Ltd). By selecting Yoco at checkout, you agree to
                  complete payment through Yoco&rsquo;s secure payment gateway.
                </li>
                <li>
                  <strong>Payment Status &amp; Verification:</strong> Orders paid via Yoco remain in{' '}
                  <code>pending</code> payment status until confirmed by Yoco&rsquo;s server-side webhook or API
                  verification. If a Yoco payment fails or is cancelled, your order payment status will be recorded as{' '}
                  <code>failed</code> or <code>cancelled</code> and you may retry payment from your Order Details page
                  or checkout.
                </li>
                <li>
                  <strong>Coupons &amp; Referral Wallet Credits:</strong> Promotional discount codes, referral reward
                  vouchers, and {storeName} Wallet balances are subject to minimum order thresholds, expiration dates,
                  and server-side validation at the time of checkout.
                </li>
              </ul>
            </section>

            {/* 6. Delivery & Shipping */}
            <section
              id="delivery-shipping"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-[#ff6452] shrink-0" />
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  6. Delivery, Shipping &amp; Collection
                </h2>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  <strong>Nationwide South African Delivery:</strong> We deliver across all nine South African provinces
                  (Gauteng, Western Cape, KwaZulu-Natal, Eastern Cape, Free State, Limpopo, Mpumalanga, North West, and
                  Northern Cape) via trusted courier partners including The Courier Guy and Aramex.
                </li>
                <li>
                  <strong>Delivery Fees &amp; Free Shipping Threshold:</strong> Unless otherwise specified at checkout,
                  standard delivery is charged at <strong>R{standardFee}</strong> (estimated{' '}
                  {generalSettings?.estimatedStandardDays || '2 - 4 Business Days'}) and express delivery at{' '}
                  <strong>R{expressFee}</strong> (estimated{' '}
                  {generalSettings?.estimatedExpressDays || '1 - 2 Business Days'}). Orders exceeding{' '}
                  <strong>R{freeThreshold}</strong> qualify for free standard delivery when enabled.
                </li>
                <li>
                  <strong>Order Tracking &amp; Status Notifications:</strong> You will receive real-time notifications
                  when your order status changes, when your parcel is shipped or ready for collection (&ldquo;Order
                  Update&rdquo;), and when your order is delivered (&ldquo;Order Delivered&rdquo;).
                </li>
                <li>
                  <strong>Risk of Loss:</strong> Risk in the products passes to you upon physical delivery of the parcel
                  to your nominated delivery address or upon collection.
                </li>
              </ul>
            </section>

            {/* 7. Returns & Refunds */}
            <section
              id="returns-refunds"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-5 h-5 text-[#ff6452] shrink-0" />
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  7. Returns, Cancellations &amp; Refunds
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                In accordance with the South African Consumer Protection Act, No. 68 of 2008 (&ldquo;CPA&rdquo;) and the
                Electronic Communications and Transactions Act, No. 25 of 2002 (&ldquo;ECTA&rdquo;):
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  <strong>Standard Return Window:</strong> Eligible non-customized products may be returned within the
                  return period specified on the product listing (typically 7 to 30 days from delivery), provided the
                  item is unused, undamaged, and in its original packaging with all accessories and tags intact.
                </li>
                <li>
                  <strong>Defective or Incorrect Goods:</strong> If a product is delivered damaged, defective, or
                  materially different from what was ordered, please notify our support team via email or WhatsApp. We
                  will arrange a replacement, repair, or full refund at no additional courier cost to you.
                </li>
                <li>
                  <strong>Exceptions to Returns:</strong> For hygiene and statutory reasons, opened beauty/personal care
                  products and custom-made or personalized items (engraved or custom-printed to your specifications)
                  cannot be returned unless proven defective in manufacturing.
                </li>
              </ul>
            </section>

            {/* 8. Product Information & Pricing Errors */}
            <section
              id="pricing-errors"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                8. Product Information &amp; Pricing Errors
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                While we take every care to ensure that product descriptions, specifications, photographs, and prices on{' '}
                {storeName} are accurate, inadvertent typographical or system errors may occasionally occur. In the
                event of an obvious error in pricing or product description, we will notify you as soon as possible and
                give you the option to reconfirm your order at the correct price or cancel the order for a full 100%
                refund.
              </p>
            </section>

            {/* 9. Prohibited Use */}
            <section
              id="prohibited-use"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-[#ff6452] shrink-0" />
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  9. Prohibited Conduct &amp; Misuse of Service
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                You agree not to misuse the {storeName} application. Prohibited activities include:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  Attempting to manipulate product prices, discount vouchers, wallet balances, or checkout payloads.
                </li>
                <li>
                  Using unauthorized payment cards, conducting fraudulent transactions, or abusing chargebacks.
                </li>
                <li>
                  Uploading unlawful, defamatory, offensive, or malware-infected files in product reviews or product
                  customization uploads.
                </li>
                <li>
                  Attempting to bypass Supabase Row-Level Security (RLS), probe administrative routes (
                  <code>/admin</code>), or disrupt application servers.
                </li>
              </ul>
            </section>

            {/* 10. Intellectual Property */}
            <section
              id="intellectual-property"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                10. Intellectual Property Rights
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                All branding, logos, software code, user interface designs, graphics, and product catalog compilations
                on {storeName} are the intellectual property of {storeName} or its licensors and are protected by South
                African and international copyright and trademark laws. You may not copy, scrape, reproduce, or
                redistribute any part of our platform without prior written permission.
              </p>
            </section>

            {/* 11. Limitation of Liability */}
            <section
              id="limitation-liability"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                11. Disclaimers &amp; Limitation of Liability
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                To the maximum extent permitted by applicable South African law (including the Consumer Protection Act),{' '}
                {storeName} shall not be liable for indirect, incidental, or consequential damages arising out of your
                use of the application or delays caused by third-party telecommunications, power outages, or courier
                disruptions beyond our reasonable control. Nothing in these Terms limits any mandatory consumer rights
                that cannot lawfully be excluded under South African law.
              </p>
            </section>

            {/* 12. Third-Party Services */}
            <section
              id="third-party-services"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                12. Third-Party Services &amp; Links
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                Our application integrates with third-party providers including <strong>Yoco</strong> (payment
                processing), <strong>Supabase</strong> (cloud authentication and database infrastructure),{' '}
                <strong>Google / Apple</strong> (optional OAuth sign-in), and <strong>WhatsApp</strong> (customer
                support links). Your use of those third-party services is subject to their respective terms and privacy
                policies.
              </p>
            </section>

            {/* 13. Account Termination */}
            <section
              id="account-termination"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-5 h-5 text-[#ff6452] shrink-0" />
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  13. Account Suspension, Termination &amp; Deletion
                </h2>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <li>
                  <strong>Customer-Initiated Account Deletion:</strong> You may permanently delete your account and
                  associated personal data at any time through the self-service <strong>Delete Account</strong> option on
                  your{' '}
                  <Link to="/account#delete-account" className="text-[#ff6452] font-semibold hover:underline">
                    Account Page
                  </Link>{' '}
                  or by contacting{' '}
                  <a href={`mailto:${contactEmail}`} className="text-[#ff6452] font-semibold hover:underline">
                    {contactEmail}
                  </a>
                  .
                </li>
                <li>
                  <strong>Administrative Hold or Suspension:</strong> Store administration may place an account{' '}
                  <code>on_hold</code> or <code>disabled</code> status if fraudulent activity, referral abuse, or breach
                  of these Terms is detected. If your account is placed on hold or disabled, existing order history
                  remains accessible and you may contact support to appeal.
                </li>
              </ul>
            </section>

            {/* 14. Changes to the Terms */}
            <section
              id="changes-to-terms"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                14. Changes to These Terms
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                We may revise these Terms &amp; Conditions from time to time to reflect operational, legal, or
                regulatory updates. The updated version will be posted at{' '}
                <code>{PUBLIC_STORE_URL}/terms-and-conditions</code> with a revised Effective Date. Orders placed prior
                to any amendment remain governed by the Terms in effect at the time the order was placed.
              </p>
            </section>

            {/* 15. Governing Law */}
            <section
              id="governing-law"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                15. Governing Law &amp; Jurisdiction
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                These Terms &amp; Conditions and all transactions conducted through {storeName} are governed by and
                construed in accordance with the laws of the <strong>Republic of South Africa</strong>, including the
                Consumer Protection Act (CPA), the Electronic Communications and Transactions Act (ECTA), and the
                Protection of Personal Information Act (POPIA).
              </p>
            </section>

            {/* 16. Contact Information */}
            <section
              id="contact-info"
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4 scroll-mt-24"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                16. Contact Information
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                For questions regarding these Terms &amp; Conditions, orders, payments, or returns, please contact us:
              </p>
              <address className="not-italic bg-gray-50 dark:bg-slate-800/60 rounded-xl p-4 border border-gray-100 dark:border-slate-800 text-xs sm:text-sm text-gray-700 dark:text-slate-300 space-y-2">
                <div className="font-bold text-gray-900 dark:text-white">{storeName} Customer &amp; Legal Support</div>
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
                    WhatsApp:{' '}
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
                    Website:{' '}
                    <a href={PUBLIC_STORE_URL} className="text-blue-600 dark:text-blue-400 hover:underline">
                      {PUBLIC_STORE_URL}
                    </a>
                  </span>
                </div>
              </address>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500 dark:text-slate-400">
                <span>Effective Date: {EFFECTIVE_DATE}</span>
                <Link
                  to="/privacy-policy"
                  className="font-bold text-[#ff6452] hover:underline inline-flex items-center gap-1"
                >
                  <span>Read Privacy Policy</span>
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
