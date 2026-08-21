import React, { useEffect } from 'react';
import { STORE_CONFIG } from '../constants/config';
import { getSiteUrl } from '../utils/seo';

export interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogType?: 'website' | 'product' | 'article';
  ogImage?: string;
  ogImageAlt?: string;
  noindex?: boolean;
  productPrice?: number;
  productCurrency?: string;
  productAvailability?: boolean;
  jsonLd?: Record<string, any> | Record<string, any>[];
}

/**
 * SEOHead component
 * Injects and updates meta tags, canonical links, OpenGraph, Twitter, and Schema.org JSON-LD structured data into document.head.
 */
export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  canonicalPath,
  ogType = 'website',
  ogImage,
  ogImageAlt,
  noindex = false,
  productPrice,
  productCurrency = 'ZAR',
  productAvailability,
  jsonLd,
}) => {
  useEffect(() => {
    // 1. Set document title
    const formattedTitle = title
      ? `${title}`
      : `${STORE_CONFIG.STORE_NAME} - ${STORE_CONFIG.STORE_TAGLINE} | South Africa`;
    document.title = formattedTitle;

    const defaultDesc =
      description ||
      'Shop authentic products online across South Africa. Secure Yoco checkout, nationwide door-to-door courier delivery, and everyday value at KUD Store.';

    // Helper to safely create or update a meta tag
    const setMetaTag = (attributeName: 'name' | 'property', attributeValue: string, content: string | null) => {
      let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (content !== null && content !== undefined) {
        if (!element) {
          element = document.createElement('meta');
          element.setAttribute(attributeName, attributeValue);
          document.head.appendChild(element);
        }
        element.setAttribute('content', content);
      } else if (element) {
        element.remove();
      }
    };

    // Helper for link tags (e.g. canonical)
    const setLinkTag = (rel: string, href: string | null) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (href) {
        if (!element) {
          element = document.createElement('link');
          element.setAttribute('rel', rel);
          document.head.appendChild(element);
        }
        element.setAttribute('href', href);
      } else if (element) {
        element.remove();
      }
    };

    // 2. Standard Meta Tags
    setMetaTag('name', 'description', defaultDesc);
    setMetaTag('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    setMetaTag('name', 'geo.region', 'ZA');
    setMetaTag('name', 'geo.placename', 'South Africa');

    // 3. Canonical URL
    const siteUrl = getSiteUrl();
    const currentPath = canonicalPath || window.location.pathname;
    const fullCanonicalUrl = `${siteUrl}${currentPath === '/' ? '' : currentPath}`;
    setLinkTag('canonical', fullCanonicalUrl);

    // 4. Open Graph Tags
    setMetaTag('property', 'og:site_name', STORE_CONFIG.STORE_NAME);
    setMetaTag('property', 'og:locale', 'en_ZA');
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:title', formattedTitle);
    setMetaTag('property', 'og:description', defaultDesc);
    setMetaTag('property', 'og:url', fullCanonicalUrl);

    const defaultImage =
      ogImage || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80';
    setMetaTag('property', 'og:image', defaultImage);
    if (ogImageAlt || title) {
      setMetaTag('property', 'og:image:alt', ogImageAlt || title || STORE_CONFIG.STORE_NAME);
    }

    // Product specific OpenGraph tags
    if (ogType === 'product' && productPrice !== undefined) {
      setMetaTag('property', 'product:price:amount', String(productPrice));
      setMetaTag('property', 'product:price:currency', productCurrency);
      if (productAvailability !== undefined) {
        setMetaTag('property', 'product:availability', productAvailability ? 'in stock' : 'out of stock');
      }
    } else {
      setMetaTag('property', 'product:price:amount', null);
      setMetaTag('property', 'product:price:currency', null);
      setMetaTag('property', 'product:availability', null);
    }

    // 5. Twitter Card Tags
    setMetaTag('name', 'twitter:card', ogImage ? 'summary_large_image' : 'summary');
    setMetaTag('name', 'twitter:title', formattedTitle);
    setMetaTag('name', 'twitter:description', defaultDesc);
    setMetaTag('name', 'twitter:image', defaultImage);

    // 6. Schema.org JSON-LD Structured Data
    const scriptId = 'kud-schema-jsonld';
    let scriptElement = document.getElementById(scriptId);

    if (jsonLd) {
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.id = scriptId;
        scriptElement.setAttribute('type', 'application/ld+json');
        document.head.appendChild(scriptElement);
      }
      scriptElement.textContent = typeof jsonLd === 'string' ? jsonLd : JSON.stringify(jsonLd, null, 2);
    } else if (scriptElement) {
      scriptElement.remove();
    }

    return () => {
      // Cleanup custom JSON-LD when component unmounts
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [
    title,
    description,
    canonicalPath,
    ogType,
    ogImage,
    ogImageAlt,
    noindex,
    productPrice,
    productCurrency,
    productAvailability,
    typeof jsonLd === 'object' && jsonLd !== null ? JSON.stringify(jsonLd) : jsonLd,
  ]);

  return null;
};
