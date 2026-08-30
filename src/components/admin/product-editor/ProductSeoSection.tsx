import React, { useState } from 'react';
import {
  Globe,
  Search,
  Sparkles,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  Plus,
  X,
} from 'lucide-react';
import { STORE_CONFIG } from '../../../constants/config';

interface ProductSeoSectionProps {
  productName: string;
  seoTitle: string;
  setSeoTitle: (val: string) => void;
  metaDescription: string;
  setMetaDescription: (val: string) => void;
  slug: string;
  setSlug: (val: string) => void;
  focusKeywords: string[];
  setFocusKeywords: React.Dispatch<React.SetStateAction<string[]>>;
  fullDescription: string;
  imagesCount: number;
}

export const ProductSeoSection: React.FC<ProductSeoSectionProps> = ({
  productName,
  seoTitle,
  setSeoTitle,
  metaDescription,
  setMetaDescription,
  slug,
  setSlug,
  focusKeywords,
  setFocusKeywords,
  fullDescription,
  imagesCount,
}) => {
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [keywordInput, setKeywordInput] = useState<string>('');

  // Effective values fallback to product name/description if not explicitly filled
  const effectiveTitle = seoTitle.trim() || (productName ? `${productName} | KUD Store` : 'Product Title | KUD Store');
  const effectiveDescription =
    metaDescription.trim() ||
    (fullDescription
      ? fullDescription.substring(0, 155) + (fullDescription.length > 155 ? '...' : '')
      : 'Buy this high-quality product online at KUD Store. Fast delivery across South Africa and secure payment options.');
  const effectiveSlug =
    slug.trim() ||
    (productName
      ? productName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      : 'product-slug');

  // Handle Focus Keyword addition
  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (trimmed && !focusKeywords.includes(trimmed)) {
      setFocusKeywords([...focusKeywords, trimmed]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setFocusKeywords(focusKeywords.filter((k) => k !== kwToRemove));
  };

  // SEO Health Checks Calculation
  const titleLength = effectiveTitle.length;
  const descLength = effectiveDescription.length;
  const wordCount = fullDescription.trim().split(/\s+/).filter(Boolean).length;

  const isTitleOptimal = titleLength >= 30 && titleLength <= 65;
  const isDescOptimal = descLength >= 80 && descLength <= 160;
  const isDescriptionLongEnough = wordCount >= 30;
  const hasImages = imagesCount > 0;

  // Check if primary focus keyword is in title & description
  const primaryKw = focusKeywords[0] || '';
  const isKwInTitle = primaryKw ? effectiveTitle.toLowerCase().includes(primaryKw) : true;
  const isKwInDesc = primaryKw ? effectiveDescription.toLowerCase().includes(primaryKw) : true;

  const checks = [
    {
      label: 'SEO Title length optimal (30-65 chars)',
      passed: isTitleOptimal,
      tip: `Current: ${titleLength} characters`,
    },
    {
      label: 'Meta Description length optimal (80-160 chars)',
      passed: isDescOptimal,
      tip: `Current: ${descLength} characters`,
    },
    {
      label: 'Product description detail (at least 30 words)',
      passed: isDescriptionLongEnough,
      tip: `Current: ${wordCount} words`,
    },
    {
      label: 'Product has high-resolution media attached',
      passed: hasImages,
      tip: `${imagesCount} images uploaded`,
    },
    ...(primaryKw
      ? [
          {
            label: `Focus keyword "${primaryKw}" in SEO title`,
            passed: isKwInTitle,
            tip: isKwInTitle ? 'Found in title' : 'Missing in title',
          },
          {
            label: `Focus keyword "${primaryKw}" in meta description`,
            passed: isKwInDesc,
            tip: isKwInDesc ? 'Found in description' : 'Missing in description',
          },
        ]
      : []),
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const seoScore = Math.round((passedCount / checks.length) * 100);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold border border-sky-100 dark:border-sky-900/60">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                Search Engine Optimization (SEO)
              </h2>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                  seoScore >= 80
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : seoScore >= 50
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                }`}
              >
                SEO Score: {seoScore}%
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Control how this product ranks and previews on Google, Bing, WhatsApp, and social networks.
            </p>
          </div>
        </div>
      </div>

      {/* Google SERP Live Preview Widget */}
      <div className="p-5 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-200/80 dark:border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-sky-600" />
            <span>Live Google Search Result Preview</span>
          </span>

          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                previewDevice === 'desktop'
                  ? 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
              title="Desktop SERP Preview"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                previewDevice === 'mobile'
                  ? 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
              title="Mobile SERP Preview"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* The Google Card Representation */}
        <div
          className={`p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 transition-all font-sans ${
            previewDevice === 'mobile' ? 'max-w-sm mx-auto shadow-md' : 'shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400 mb-1 truncate">
            <div className="w-4 h-4 rounded-full bg-[#ff6452] text-white flex items-center justify-center font-bold text-[8px]">
              K
            </div>
            <span className="font-semibold text-gray-800 dark:text-slate-200">kudstore.co.za</span>
            <span>› product › {effectiveSlug}</span>
          </div>

          <h3 className="text-sm font-medium text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer line-clamp-1 leading-snug">
            {effectiveTitle}
          </h3>

          <p className="text-xs text-[#4d5156] dark:text-[#bdc1c6] mt-1 line-clamp-2 leading-relaxed">
            {effectiveDescription}
          </p>
        </div>
      </div>

      {/* SEO Form Inputs */}
      <div className="space-y-4">
        {/* SEO Page Title */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-gray-800 dark:text-slate-200">
            <label>SEO Title Tag</label>
            <span
              className={`text-[11px] font-bold ${
                isTitleOptimal
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-500'
              }`}
            >
              {effectiveTitle.length}/60 characters (Optimal: 30-60)
            </span>
          </div>
          <input
            type="text"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            placeholder={productName ? `${productName} | KUD Store` : 'Enter custom SEO Title...'}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-sky-500"
          />
        </div>

        {/* Meta Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-gray-800 dark:text-slate-200">
            <label>Meta Description</label>
            <span
              className={`text-[11px] font-bold ${
                isDescOptimal
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-500'
              }`}
            >
              {effectiveDescription.length}/160 characters (Optimal: 80-160)
            </span>
          </div>
          <textarea
            rows={3}
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="Custom meta description for search engines..."
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-sky-500"
          />
        </div>

        {/* URL Handle / Slug */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
            URL Handle / Permaslug
          </label>
          <div className="flex items-center">
            <span className="px-3.5 py-2.5 bg-gray-100 dark:bg-slate-800 border border-r-0 border-gray-200 dark:border-slate-700 rounded-l-2xl text-xs text-gray-500 dark:text-slate-400 font-mono">
              /product/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) =>
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '-')
                    .replace(/-+/g, '-')
                )
              }
              placeholder={effectiveSlug}
              className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-r-2xl text-xs font-mono text-gray-900 dark:text-white focus:outline-hidden focus:border-sky-500"
            />
          </div>
        </div>

        {/* Focus Search Keywords */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
            Focus Keywords for Ranking
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. noise cancelling headphones, bluetooth earbuds..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddKeyword();
                }
              }}
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-sky-500"
            />
            <button
              type="button"
              onClick={handleAddKeyword}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Add Keyword
            </button>
          </div>

          {focusKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {focusKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-full text-xs font-bold"
                >
                  <span>{kw}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(kw)}
                    className="hover:text-sky-900 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SEO Health Checklist Audit */}
      <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-2.5">
        <h4 className="text-xs font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
          SEO Health Checklist
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {checks.map((c, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-700 text-xs"
            >
              <div className="flex items-center gap-2">
                {c.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <span className="font-semibold text-gray-800 dark:text-slate-200">
                  {c.label}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-medium shrink-0 ml-2">
                {c.tip}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
