import { Product } from '../types';
import { STORE_CONFIG } from '../constants/config';

/**
 * Escapes a cell value for standard CSV formatting (RFC 4180).
 * Handles double quotes, commas, line breaks, and null/undefined values.
 */
export function formatCSVCell(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }
  
  let str = String(value);
  // If string contains quotes, commas, newlines or carriage returns, wrap in quotes and escape internal quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }
  
  return `"${str}"`;
}

export interface CSVExportOptions {
  filename?: string;
  currencySymbol?: string;
  includeTimestamp?: boolean;
}

/**
 * Converts an array of Product objects into a formatted CSV string.
 */
export function generateProductsCSV(
  products: Product[],
  options: CSVExportOptions = {}
): string {
  const currency = options.currencySymbol || STORE_CONFIG.STORE_CURRENCY || 'GHS';

  const headers = [
    'Product ID',
    'SKU',
    'Product Name',
    'Brand',
    'Category',
    `Price (${currency})`,
    `Original Price (${currency})`,
    'Discount (%)',
    'Stock Quantity',
    'Stock Status',
    'Active Status',
    'Condition',
    'Size / Variant',
    'Featured',
    'New Arrival',
    'Rating (Stars)',
    'Review Count',
    'Primary Image URL',
    'Created Date',
    'Description',
  ];

  const rows = products.map((product) => {
    const stockQty = product.stock ?? (product.inStock ? 10 : 0);
    const stockStatus =
      stockQty === 0
        ? 'Out of Stock'
        : stockQty <= 5
        ? `Low Stock (${stockQty} remaining)`
        : 'In Stock';

    const discount =
      product.discountPercentage ||
      (product.originalPrice && product.originalPrice > product.price
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0);

    const primaryImage =
      (Array.isArray(product.images) &&
        product.images.find((u) => typeof u === 'string' && u.trim().length > 0)) ||
      (typeof (product as any).image_url === 'string' && (product as any).image_url.trim()) ||
      (typeof (product as any).image === 'string' && (product as any).image.trim()) ||
      '';

    const createdFormatted = product.createdAt
      ? new Date(product.createdAt).toISOString().split('T')[0]
      : '';

    return [
      formatCSVCell(product.id),
      formatCSVCell(product.sku || 'N/A'),
      formatCSVCell(product.name),
      formatCSVCell(product.brand || 'N/A'),
      formatCSVCell(product.category),
      formatCSVCell(product.price.toFixed(2)),
      formatCSVCell(product.originalPrice ? product.originalPrice.toFixed(2) : ''),
      formatCSVCell(discount > 0 ? `${discount}%` : '0%'),
      formatCSVCell(stockQty),
      formatCSVCell(stockStatus),
      formatCSVCell(product.isActive !== false ? 'Active' : 'Inactive'),
      formatCSVCell(product.condition || 'Brand New'),
      formatCSVCell(product.sizeOrVariant || ''),
      formatCSVCell(product.isFeatured ? 'Yes' : 'No'),
      formatCSVCell(product.isNewAdded ? 'Yes' : 'No'),
      formatCSVCell(product.rating ? product.rating.toFixed(1) : '5.0'),
      formatCSVCell(product.reviewCount ?? 0),
      formatCSVCell(primaryImage),
      formatCSVCell(createdFormatted),
      formatCSVCell(product.description || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Triggers a browser download of the generated CSV content as a file.
 */
export function downloadCSV(csvContent: string, defaultFilename: string): void {
  // UTF-8 BOM for accurate character encoding recognition in Excel/Sheets
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', defaultFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * High-level helper to export product inventory directly to a CSV file.
 */
export function exportProductsToCSV(
  products: Product[],
  options: CSVExportOptions = {}
): { count: number; filename: string } {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = options.filename || `inventory_export_${dateStr}.csv`;
  
  const csvData = generateProductsCSV(products, options);
  downloadCSV(csvData, filename);

  return {
    count: products.length,
    filename,
  };
}
