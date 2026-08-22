import { Product, ProductCategory, ProductCondition } from '../types';
import { STORE_CONFIG } from '../constants/config';
import { downloadCSV } from './csvExport';

export interface ImportValidationError {
  field: 'name' | 'price' | 'stock' | 'category' | 'sku' | 'general';
  message: string;
}

export interface ParsedImportRow {
  rowNumber: number;
  raw: Record<string, string>;
  data: {
    id?: string;
    sku?: string;
    name: string;
    brand: string;
    category: ProductCategory | string;
    price: number;
    originalPrice?: number;
    stock: number;
    isActive: boolean;
    condition?: ProductCondition;
    sizeOrVariant?: string;
    description?: string;
    images: string[];
    isFeatured?: boolean;
    isNewAdded?: boolean;
  };
  isValid: boolean;
  errors: ImportValidationError[];
  warnings: string[];
  action: 'create' | 'update';
  matchedProductId?: string;
  matchedProductName?: string;
}

/**
 * Robust RFC 4180 CSV line/table parser.
 * Handles quoted cells with escaped quotes (""), embedded commas, and CRLF line breaks.
 */
export function parseCSVToTable(csvText: string): string[][] {
  const table: string[][] = [];
  let row: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  // Normalize line endings
  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',' || char === ';' || char === '\t') {
        row.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n') {
        row.push(currentCell.trim());
        // Only push non-empty rows
        if (row.some((cell) => cell.length > 0)) {
          table.push(row);
        }
        row = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  // Handle final cell / row
  if (currentCell.length > 0 || row.length > 0) {
    row.push(currentCell.trim());
    if (row.some((cell) => cell.length > 0)) {
      table.push(row);
    }
  }

  return table;
}

/**
 * Normalizes header strings to canonical product property keys.
 */
export function normalizeColumnHeader(header: string): string {
  const clean = header.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (clean === 'id' || clean === 'productid' || clean === 'uuid' || clean === 'itemid') {
    return 'id';
  }
  if (clean === 'sku' || clean === 'productsku' || clean === 'itemsku' || clean === 'barcode' || clean === 'code') {
    return 'sku';
  }
  if (
    clean === 'name' ||
    clean === 'productname' ||
    clean === 'title' ||
    clean === 'producttitle' ||
    clean === 'itemname' ||
    clean === 'item'
  ) {
    return 'name';
  }
  if (clean === 'brand' || clean === 'brandname' || clean === 'manufacturer' || clean === 'vendor') {
    return 'brand';
  }
  if (clean === 'category' || clean === 'categoryname' || clean === 'department' || clean === 'collection') {
    return 'category';
  }
  if (
    clean === 'price' ||
    clean === 'sellingprice' ||
    clean === 'unitprice' ||
    clean.startsWith('price') ||
    clean.includes('price') && !clean.includes('original') && !clean.includes('compare')
  ) {
    return 'price';
  }
  if (
    clean === 'originalprice' ||
    clean === 'compareprice' ||
    clean === 'wasprice' ||
    clean === 'regularprice' ||
    clean === 'msrp' ||
    clean === 'listprice'
  ) {
    return 'originalPrice';
  }
  if (
    clean === 'stock' ||
    clean === 'stockquantity' ||
    clean === 'inventory' ||
    clean === 'quantity' ||
    clean === 'qty' ||
    clean === 'stockcount'
  ) {
    return 'stock';
  }
  if (clean === 'active' || clean === 'activestatus' || clean === 'status' || clean === 'isactive' || clean === 'enabled') {
    return 'isActive';
  }
  if (clean === 'condition' || clean === 'itemcondition' || clean === 'state') {
    return 'condition';
  }
  if (
    clean === 'size' ||
    clean === 'variant' ||
    clean === 'sizeorvariant' ||
    clean === 'sizevariant' ||
    clean === 'options'
  ) {
    return 'sizeOrVariant';
  }
  if (clean === 'description' || clean === 'desc' || clean === 'details' || clean === 'summary') {
    return 'description';
  }
  if (
    clean === 'image' ||
    clean === 'imageurl' ||
    clean === 'primaryimage' ||
    clean === 'primaryimageurl' ||
    clean === 'images' ||
    clean === 'photo' ||
    clean === 'picture'
  ) {
    return 'image_url';
  }
  if (clean === 'featured' || clean === 'isfeatured') {
    return 'isFeatured';
  }
  if (clean === 'new' || clean === 'newarrival' || clean === 'isnew' || clean === 'isnewadded') {
    return 'isNewAdded';
  }

  return clean;
}

/**
 * Validates and maps parsed CSV table to strongly-typed product rows.
 */
export function validateAndMapCSV(
  table: string[][],
  existingProducts: Product[] = [],
  validCategories: string[] = ['Beauty', 'Home', 'Sports & Leisure', 'Technology', 'Books', 'Others']
): {
  rows: ParsedImportRow[];
  headers: string[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
  createCount: number;
  updateCount: number;
} {
  if (!table || table.length < 2) {
    return {
      rows: [],
      headers: [],
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
      createCount: 0,
      updateCount: 0,
    };
  }

  const rawHeaders = table[0];
  const headerMap: { [colIndex: number]: string } = {};

  rawHeaders.forEach((h, idx) => {
    headerMap[idx] = normalizeColumnHeader(h);
  });

  const parsedRows: ParsedImportRow[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let createCount = 0;
  let updateCount = 0;

  // Build lookup index for existing products by ID and SKU
  const productById = new Map<string, Product>();
  const productBySku = new Map<string, Product>();

  existingProducts.forEach((p) => {
    if (p.id) productById.set(p.id.toLowerCase(), p);
    if (p.sku) productBySku.set(p.sku.trim().toLowerCase(), p);
  });

  for (let r = 1; r < table.length; r++) {
    const rawRow = table[r];
    const rowObj: Record<string, string> = {};

    rawRow.forEach((val, idx) => {
      const canonicalKey = headerMap[idx] || `col_${idx}`;
      rowObj[canonicalKey] = val;
    });

    const errors: ImportValidationError[] = [];
    const warnings: string[] = [];

    // 1. Validate Product Name (REQUIRED)
    const rawName = (rowObj.name || '').trim();
    if (!rawName) {
      errors.push({
        field: 'name',
        message: 'Product name is required.',
      });
    }

    // 2. Validate Price (REQUIRED, must be positive number)
    const rawPriceStr = (rowObj.price || '').replace(/[^0-9.-]/g, '');
    const numPrice = Number(rawPriceStr);
    if (rawPriceStr === '' || isNaN(numPrice) || numPrice <= 0) {
      errors.push({
        field: 'price',
        message: 'Price is required and must be a valid positive number greater than 0.',
      });
    }

    // 3. Validate Stock (REQUIRED, must be non-negative integer)
    const rawStockStr = (rowObj.stock || '').replace(/[^0-9-]/g, '');
    const numStock = Number(rawStockStr);
    if (rawStockStr === '' || isNaN(numStock) || numStock < 0) {
      errors.push({
        field: 'stock',
        message: 'Stock quantity is required and must be a valid number (0 or higher).',
      });
    }

    // Parse Optional fields
    const rawOriginalPriceStr = (rowObj.originalPrice || '').replace(/[^0-9.-]/g, '');
    let originalPrice: number | undefined = undefined;
    if (rawOriginalPriceStr !== '' && !isNaN(Number(rawOriginalPriceStr))) {
      const op = Number(rawOriginalPriceStr);
      if (op > numPrice) {
        originalPrice = op;
      } else if (op > 0) {
        warnings.push('Original price is less than or equal to current price.');
      }
    }

    // Category
    let category = (rowObj.category || '').trim();
    if (!category) {
      category = validCategories[0] || 'Beauty';
      warnings.push(`Category was missing, defaulted to "${category}".`);
    }

    // Brand
    const brand = (rowObj.brand || '').trim() || 'KUD Store';

    // Condition
    let condition: ProductCondition = 'Brand New';
    const rawCondition = (rowObj.condition || '').trim().toLowerCase();
    if (rawCondition.includes('like new')) condition = 'Like New';
    else if (rawCondition.includes('refurbished')) condition = 'Refurbished';
    else if (rawCondition.includes('vintage')) condition = 'Vintage';
    else if (rawCondition.includes('good')) condition = 'Good';

    // Active Status
    let isActive = true;
    if (rowObj.isActive !== undefined) {
      const activeStr = rowObj.isActive.trim().toLowerCase();
      if (activeStr === 'false' || activeStr === '0' || activeStr === 'no' || activeStr === 'inactive' || activeStr === 'disabled') {
        isActive = false;
      }
    }

    // Image URL
    const rawImage = (rowObj.image_url || '').trim();
    const images: string[] = rawImage ? [rawImage] : [];
    if (images.length === 0) {
      warnings.push('No image URL provided; a default product placeholder will be used.');
    }

    // Check for Match / Action (Create vs Update)
    let action: 'create' | 'update' = 'create';
    let matchedProductId: string | undefined = undefined;
    let matchedProductName: string | undefined = undefined;

    const rowId = (rowObj.id || '').trim().toLowerCase();
    const rowSku = (rowObj.sku || '').trim().toLowerCase();

    if (rowId && productById.has(rowId)) {
      action = 'update';
      const existing = productById.get(rowId)!;
      matchedProductId = existing.id;
      matchedProductName = existing.name;
    } else if (rowSku && productBySku.has(rowSku)) {
      action = 'update';
      const existing = productBySku.get(rowSku)!;
      matchedProductId = existing.id;
      matchedProductName = existing.name;
    }

    const isValid = errors.length === 0;
    if (isValid) {
      validCount++;
      if (action === 'update') updateCount++;
      else createCount++;
    } else {
      invalidCount++;
    }

    parsedRows.push({
      rowNumber: r + 1,
      raw: rowObj,
      data: {
        id: matchedProductId || (rowObj.id ? rowObj.id.trim() : undefined),
        sku: rowObj.sku ? rowObj.sku.trim() : undefined,
        name: rawName || 'Untitled Product',
        brand,
        category,
        price: !isNaN(numPrice) && numPrice > 0 ? numPrice : 0,
        originalPrice,
        stock: !isNaN(numStock) && numStock >= 0 ? numStock : 0,
        isActive,
        condition,
        sizeOrVariant: rowObj.sizeOrVariant ? rowObj.sizeOrVariant.trim() : undefined,
        description: rowObj.description ? rowObj.description.trim() : undefined,
        images,
        isFeatured: rowObj.isFeatured ? ['true', '1', 'yes'].includes(rowObj.isFeatured.toLowerCase()) : false,
        isNewAdded: rowObj.isNewAdded ? ['true', '1', 'yes'].includes(rowObj.isNewAdded.toLowerCase()) : false,
      },
      isValid,
      errors,
      warnings,
      action,
      matchedProductId,
      matchedProductName,
    });
  }

  return {
    rows: parsedRows,
    headers: rawHeaders,
    totalRows: parsedRows.length,
    validCount,
    invalidCount,
    createCount,
    updateCount,
  };
}

/**
 * Generates an annotated starter CSV template for store owners to download.
 */
export function generateSampleCSVTemplate(): string {
  const currency = STORE_CONFIG.STORE_CURRENCY || 'R';
  
  const headers = [
    'Product ID (Optional for updates)',
    'SKU',
    'Product Name *',
    'Brand',
    'Category',
    `Price (${currency}) *`,
    `Original Price (${currency})`,
    'Stock Quantity *',
    'Active Status (Active/Inactive)',
    'Condition (Brand New/Like New/Refurbished)',
    'Size / Variant',
    'Primary Image URL',
    'Description',
  ];

  const sampleRows = [
    [
      '',
      'KUD-GLOW-001',
      'Hydrating Glow Serum 30ml',
      'KUD Botanicals',
      'Beauty',
      '249.99',
      '320.00',
      '45',
      'Active',
      'Brand New',
      '30ml',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80',
      'Deeply hydrating facial serum with organic hyaluronic acid and vitamin C.',
    ],
    [
      '',
      'KUD-SCENT-002',
      'Organic Lavender Soy Candle',
      'KUD Living',
      'Home',
      '189.50',
      '220.00',
      '20',
      'Active',
      'Brand New',
      '250g',
      'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=600&q=80',
      'Hand-poured 100% natural soy wax scented candle with essential oils.',
    ],
    [
      '',
      'KUD-YOGA-003',
      'Eco Non-Slip Cork Yoga Mat',
      'KUD Active',
      'Sports & Leisure',
      '450.00',
      '550.00',
      '15',
      'Active',
      'Brand New',
      'Standard 6mm',
      'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=600&q=80',
      'High-grip sustainable organic cork exercise mat with alignment markers.',
    ],
    [
      '',
      'KUD-AUDIO-004',
      'Noise-Cancelling Wireless Headphones',
      'KUD Tech',
      'Technology',
      '1299.00',
      '1499.00',
      '8',
      'Active',
      'Brand New',
      'Matte Black',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
      'Over-ear premium Bluetooth headphones with 35-hour battery life.',
    ],
  ];

  const escapeCell = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return `"${val}"`;
  };

  const csvLines = [
    headers.map(escapeCell).join(','),
    ...sampleRows.map((r) => r.map(escapeCell).join(',')),
  ];

  return csvLines.join('\r\n');
}

/**
 * Triggers downloading the sample CSV template.
 */
export function downloadCSVTemplate(): void {
  const content = generateSampleCSVTemplate();
  downloadCSV(content, 'kud_store_products_import_template.csv');
}
