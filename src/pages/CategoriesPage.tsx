import React from 'react';
import { Link } from 'react-router-dom';
import { STORE_CONFIG } from '../constants/config';
import { ProductCategory } from '../types';
import { SEOHead } from '../components/SEOHead';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { categoryToSlug, getCategorySeoMeta, getSiteUrl } from '../utils/seo';
import { ArrowRight, Grid, Sparkles, CheckCircle2 } from 'lucide-react';

const CATEGORY_IMAGES: Record<string, string> = {
  Beauty: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
  Home: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
  'Sports & Leisure': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
  Technology: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
  Books: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
  Others: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
};

export const CategoriesPage: React.FC = () => {
  const siteUrl = getSiteUrl();

  const categoriesJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Product Categories at ${STORE_CONFIG.STORE_NAME}`,
    description: 'Explore verified authentic categories with fast delivery in South Africa.',
    itemListElement: STORE_CONFIG.CATEGORY_LIST.map((cat, idx) => ({
      '@type': 'SiteNavigationElement',
      position: idx + 1,
      name: cat,
      url: `${siteUrl}/category/${categoryToSlug(cat)}`,
    })),
  };

  return (
    <>
      <SEOHead
        title={`All Product Categories | ${STORE_CONFIG.STORE_NAME} South Africa`}
        description="Browse all product categories at KUD Store South Africa. Shop Beauty, Home, Sports & Leisure, Technology, and Books with secure Yoco checkout and courier delivery."
        canonicalPath="/categories"
        jsonLd={categoriesJsonLd}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28">
        <div className="mb-4">
          <Breadcrumbs items={[{ label: 'Categories' }]} />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <Grid className="w-6 h-6 text-[#ff6452]" />
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Product Categories
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Explore our curated South African catalog with verified authentic brands and transparent ZAR pricing.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {STORE_CONFIG.CATEGORY_LIST.map((cat) => {
            const meta = getCategorySeoMeta(cat);
            const slug = categoryToSlug(cat);
            const imageUrl = CATEGORY_IMAGES[cat] || CATEGORY_IMAGES.Others;

            return (
              <Link
                key={cat}
                to={`/category/${slug}`}
                className="group relative h-52 sm:h-64 rounded-3xl overflow-hidden border border-gray-100 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-end text-white"
                aria-label={`Explore ${cat} category in South Africa`}
              >
                <img
                  src={imageUrl}
                  alt={`${cat} collection at ${STORE_CONFIG.STORE_NAME} South Africa`}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/40 to-transparent p-6 flex items-end">
                  <div className="w-full flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold tracking-tight text-white">
                        {cat}
                      </h2>
                      <p className="text-xs text-gray-200 mt-1 line-clamp-1">
                        {meta.heading}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-[#ff6452] group-hover:text-white transition-colors flex-shrink-0 ml-3">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};

