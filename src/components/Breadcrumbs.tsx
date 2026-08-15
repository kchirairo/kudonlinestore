import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { BreadcrumbItem, generateBreadcrumbJsonLd, getSiteUrl } from '../utils/seo';

export interface BreadcrumbsProps {
  items: {
    label: string;
    to?: string;
  }[];
  includeHome?: boolean;
}

/**
 * Breadcrumbs component with crawlable links and BreadcrumbList JSON-LD
 */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, includeHome = true }) => {
  const siteUrl = getSiteUrl();

  const allItems = includeHome
    ? [{ label: 'Home', to: '/' }, ...items]
    : items;

  // Build items array for Schema.org JSON-LD
  const schemaItems: BreadcrumbItem[] = allItems.map((item) => ({
    name: item.label,
    url: item.to ? `${siteUrl}${item.to === '/' ? '' : item.to}` : siteUrl,
  }));

  const breadcrumbJsonLd = generateBreadcrumbJsonLd(schemaItems);

  return (
    <>
      {/* Schema.org Breadcrumb JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Visual Accessible Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="py-2.5 px-0.5 text-xs text-gray-500 overflow-x-auto no-scrollbar whitespace-nowrap">
        <ol className="flex items-center gap-1.5 list-none m-0 p-0">
          {allItems.map((item, idx) => {
            const isLast = idx === allItems.length - 1;
            const isFirst = idx === 0 && includeHome;

            return (
              <li key={idx} className="inline-flex items-center gap-1.5 flex-shrink-0">
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}

                {isLast || !item.to ? (
                  <span
                    className="font-bold text-gray-900 max-w-[200px] sm:max-w-xs truncate inline-block"
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.to}
                    className="hover:text-[#ff6452] font-medium text-gray-600 transition-colors inline-flex items-center gap-1"
                  >
                    {isFirst && <Home className="w-3.5 h-3.5" />}
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
};
