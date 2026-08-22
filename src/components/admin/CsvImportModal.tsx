import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowRight,
  ChevronRight,
  Filter,
  Trash2,
  Edit3,
  FileText,
  Plus,
  ArrowUpRight,
  Check,
} from 'lucide-react';
import { Product } from '../../types';
import { STORE_CONFIG } from '../../constants/config';
import {
  parseCSVToTable,
  validateAndMapCSV,
  downloadCSVTemplate,
  ParsedImportRow,
} from '../../utils/csvImport';
import { adminService } from '../../services/adminService';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingProducts: Product[];
  categories: string[];
}

type ImportMode = 'create_and_update' | 'create_only' | 'update_only';
type TabFilter = 'all' | 'valid' | 'invalid' | 'updates' | 'creates';

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingProducts,
  categories,
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'completed'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [inputMethod, setInputMethod] = useState<'file' | 'paste'>('file');

  // Parsed and validated rows
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('create_and_update');
  const [tabFilter, setTabFilter] = useState<TabFilter>('all');
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [importResults, setImportResults] = useState<{
    createdCount: number;
    updatedCount: number;
    failedCount: number;
    errors: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('upload');
    setCsvRawText('');
    setFileName('');
    setParsedRows([]);
    setImportResults(null);
    setProgressPercent(0);
    setIsProcessing(false);
  };

  const handleFileChange = (file: File) => {
    if (!file) return;
    if (!file.name.endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
      alert('Please upload a valid CSV file.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        processCSVContent(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const processCSVContent = (content: string, name?: string) => {
    setCsvRawText(content);
    if (name) setFileName(name);

    const table = parseCSVToTable(content);
    if (table.length < 2) {
      alert('The CSV file appears to be empty or missing header columns.');
      return;
    }

    const { rows } = validateAndMapCSV(table, existingProducts, categories);
    setParsedRows(rows);
    setStep('preview');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Row counts and metrics
  const totalCount = parsedRows.length;
  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);
  const updateRows = parsedRows.filter((r) => r.isValid && r.action === 'update');
  const createRows = parsedRows.filter((r) => r.isValid && r.action === 'create');

  // Filtered rows for the preview table
  const displayedRows = useMemo(() => {
    return parsedRows.filter((row) => {
      // Tab filter
      if (tabFilter === 'valid' && !row.isValid) return false;
      if (tabFilter === 'invalid' && row.isValid) return false;
      if (tabFilter === 'updates' && (!row.isValid || row.action !== 'update')) return false;
      if (tabFilter === 'creates' && (!row.isValid || row.action !== 'create')) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = row.data.name.toLowerCase().includes(q);
        const matchesCategory = row.data.category.toLowerCase().includes(q);
        const matchesSku = (row.data.sku || '').toLowerCase().includes(q);
        const matchesBrand = row.data.brand.toLowerCase().includes(q);
        return matchesName || matchesCategory || matchesSku || matchesBrand;
      }
      return true;
    });
  }, [parsedRows, tabFilter, searchQuery]);

  // Inline editing in preview table
  const handleEditRowField = (
    rowNumber: number,
    field: 'name' | 'price' | 'stock' | 'category' | 'sku',
    value: string
  ) => {
    setParsedRows((prev) =>
      prev.map((row) => {
        if (row.rowNumber !== rowNumber) return row;

        const updatedData = { ...row.data };
        if (field === 'name') updatedData.name = value;
        if (field === 'sku') updatedData.sku = value;
        if (field === 'category') updatedData.category = value;
        if (field === 'price') {
          const p = Number(value);
          updatedData.price = isNaN(p) ? 0 : p;
        }
        if (field === 'stock') {
          const s = Number(value);
          updatedData.stock = isNaN(s) ? 0 : s;
        }

        // Re-validate row
        const newErrors = [];
        if (!updatedData.name.trim()) {
          newErrors.push({ field: 'name' as const, message: 'Product name is required.' });
        }
        if (updatedData.price <= 0 || isNaN(updatedData.price)) {
          newErrors.push({
            field: 'price' as const,
            message: 'Price must be a valid positive number.',
          });
        }
        if (updatedData.stock < 0 || isNaN(updatedData.stock)) {
          newErrors.push({
            field: 'stock' as const,
            message: 'Stock must be a non-negative number.',
          });
        }

        return {
          ...row,
          data: updatedData,
          isValid: newErrors.length === 0,
          errors: newErrors,
        };
      })
    );
  };

  const handleDeleteRow = (rowNumber: number) => {
    setParsedRows((prev) => prev.filter((r) => r.rowNumber !== rowNumber));
  };

  // Start Bulk Import Process
  const handleStartImport = async () => {
    const rowsToImport = skipInvalid ? validRows : parsedRows.filter((r) => r.isValid);

    if (rowsToImport.length === 0) {
      alert('No valid products to import. Please correct errors or upload a valid CSV.');
      return;
    }

    setStep('importing');
    setIsProcessing(true);
    setProgressPercent(15);

    try {
      const itemsPayload = rowsToImport.map((r) => ({
        action: r.action,
        id: r.matchedProductId || r.data.id,
        data: {
          name: r.data.name,
          brand: r.data.brand,
          category: r.data.category as any,
          price: r.data.price,
          originalPrice: r.data.originalPrice,
          stock: r.data.stock,
          inStock: r.data.stock > 0,
          isActive: r.data.isActive,
          condition: r.data.condition,
          sizeOrVariant: r.data.sizeOrVariant,
          description: r.data.description,
          images: r.data.images,
          sku: r.data.sku,
          isFeatured: r.data.isFeatured,
          isNewAdded: r.data.isNewAdded,
        },
      }));

      setProgressPercent(45);

      const result = await adminService.bulkImportProducts(itemsPayload, importMode);

      setProgressPercent(100);
      setImportResults({
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        failedCount: result.failedCount,
        errors: result.errors,
      });

      setStep('completed');
      onSuccess();
    } catch (err: any) {
      console.error('CSV import error:', err);
      setImportResults({
        createdCount: 0,
        updatedCount: 0,
        failedCount: rowsToImport.length,
        errors: [err?.message || 'Unexpected error during CSV bulk import.'],
      });
      setStep('completed');
    } finally {
      setIsProcessing(false);
    }
  };

  const currency = STORE_CONFIG.STORE_CURRENCY || 'R';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-[#ff6452] flex items-center justify-center font-black shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  Bulk CSV Product Import
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                  Bulk Catalog Engine
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Upload CSV files to bulk create new products or update existing inventory & pricing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2.5 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* STEP 1: UPLOAD SCREEN */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Template Download Notice Banner */}
              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300">
                      Need the standard CSV format template?
                    </h4>
                    <p className="text-[11px] text-blue-700 dark:text-blue-400/80">
                      Download our pre-formatted spreadsheet template with sample products and required columns.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={downloadCSVTemplate}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV Template</span>
                </button>
              </div>

              {/* Input Method Toggle */}
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setInputMethod('file')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    inputMethod === 'file'
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs'
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Upload File (.csv)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMethod('paste')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    inputMethod === 'paste'
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs'
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Paste CSV Text
                </button>
              </div>

              {inputMethod === 'file' ? (
                /* Drag & Drop Area */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                    dragOver
                      ? 'border-[#ff6452] bg-rose-50/40 dark:bg-rose-950/20 scale-[0.99]'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-gray-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                    accept=".csv,text/csv,text/plain"
                    className="hidden"
                  />

                  <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-[#ff6452] flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <UploadCloud className="w-8 h-8" />
                  </div>

                  <h4 className="text-base font-extrabold text-gray-900 dark:text-white">
                    Click to browse or drag and drop your CSV file here
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Supports comma-separated, semicolon-separated, or tab-delimited product spreadsheets.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-gray-400">
                    <span className="bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700 font-semibold text-gray-700 dark:text-slate-300">
                      Required: Name, Price, Stock
                    </span>
                    <span className="bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700 font-semibold text-gray-700 dark:text-slate-300">
                      Optional: SKU, Category, Brand, Images
                    </span>
                  </div>
                </div>
              ) : (
                /* Paste CSV Area */
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                    Paste raw CSV content with header row:
                  </label>
                  <textarea
                    rows={8}
                    value={csvRawText}
                    onChange={(e) => setCsvRawText(e.target.value)}
                    placeholder={`Product Name,Price,Stock,Category,SKU\nOrganic Face Oil,199.00,30,Beauty,KUD-BEAUTY-1\nEco Bamboo Cup,85.00,50,Home,KUD-HOME-2`}
                    className="w-full font-mono text-xs p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ff6452] outline-hidden resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!csvRawText.trim()}
                      onClick={() => processCSVContent(csvRawText, 'pasted_data.csv')}
                      className="px-5 py-2.5 bg-[#ff6452] hover:bg-[#ff4935] disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      Parse & Validate Text
                    </button>
                  </div>
                </div>
              )}

              {/* Column Mapping Reference Grid */}
              <div className="p-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/40">
                <h5 className="text-xs font-black text-gray-900 dark:text-white mb-2">
                  Recognized Columns & Synonyms:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60">
                    <span className="font-bold text-rose-600 dark:text-rose-400 block">Product Name *</span>
                    <span className="text-gray-500 dark:text-slate-400">
                      Header synonyms: <code>Name</code>, <code>Title</code>, <code>Product Name</code>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60">
                    <span className="font-bold text-rose-600 dark:text-rose-400 block">Price *</span>
                    <span className="text-gray-500 dark:text-slate-400">
                      Header synonyms: <code>Price</code>, <code>Selling Price</code>, <code>Unit Price</code>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60">
                    <span className="font-bold text-rose-600 dark:text-rose-400 block">Stock Quantity *</span>
                    <span className="text-gray-500 dark:text-slate-400">
                      Header synonyms: <code>Stock</code>, <code>Quantity</code>, <code>Qty</code>, <code>Inventory</code>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60">
                    <span className="font-bold text-gray-900 dark:text-white block">Product ID / SKU</span>
                    <span className="text-gray-500 dark:text-slate-400">
                      Used to match & update existing store items automatically.
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60">
                    <span className="font-bold text-gray-900 dark:text-white block">Category & Brand</span>
                    <span className="text-gray-500 dark:text-slate-400">
                      Beauty, Home, Tech, Sports, etc. Default applied if empty.
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60">
                    <span className="font-bold text-gray-900 dark:text-white block">Image URL & Description</span>
                    <span className="text-gray-500 dark:text-slate-400">
                      Direct HTTP image URLs and product feature descriptions.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATION TABLE */}
          {step === 'preview' && (
            <div className="space-y-5">
              {/* Validation Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                    Total Rows
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">{totalCount}</span>
                    <span className="text-[10px] text-gray-400">products</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                    Valid & Ready
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{validRows.length}</span>
                    <span className="text-[10px] text-emerald-600/80">passed checks</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                    Update Matches
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{updateRows.length}</span>
                    <span className="text-[10px] text-blue-600/80">matched ID/SKU</span>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    invalidRows.length > 0
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                      : 'bg-gray-50 dark:bg-slate-800/60 border-gray-100 dark:border-slate-800'
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider block ${
                      invalidRows.length > 0
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-gray-500 dark:text-slate-400'
                    }`}
                  >
                    Errors / Missing Fields
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={`text-2xl font-black ${
                        invalidRows.length > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {invalidRows.length}
                    </span>
                    <span className="text-[10px] text-gray-400">needs review</span>
                  </div>
                </div>
              </div>

              {/* Mode Selection & Import Settings */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-900 dark:text-white block">
                    Bulk Import Strategy:
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="create_and_update"
                        checked={importMode === 'create_and_update'}
                        onChange={() => setImportMode('create_and_update')}
                        className="text-[#ff6452] focus:ring-[#ff6452]"
                      />
                      <span>Create New & Update Matches</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 cursor-pointer ml-3">
                      <input
                        type="radio"
                        name="importMode"
                        value="create_only"
                        checked={importMode === 'create_only'}
                        onChange={() => setImportMode('create_only')}
                        className="text-[#ff6452] focus:ring-[#ff6452]"
                      />
                      <span>Create New Products Only</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 cursor-pointer ml-3">
                      <input
                        type="radio"
                        name="importMode"
                        value="update_only"
                        checked={importMode === 'update_only'}
                        onChange={() => setImportMode('update_only')}
                        className="text-[#ff6452] focus:ring-[#ff6452]"
                      />
                      <span>Update Existing Only</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipInvalid}
                      onChange={(e) => setSkipInvalid(e.target.checked)}
                      className="w-4 h-4 rounded-sm text-[#ff6452] focus:ring-[#ff6452]"
                    />
                    <span>Skip invalid rows and import remaining {validRows.length} valid items</span>
                  </label>
                </div>
              </div>

              {/* Table Filter Tabs and Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTabFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      tabFilter === 'all'
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200'
                    }`}
                  >
                    All Rows ({totalCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabFilter('valid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      tabFilter === 'valid'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                    }`}
                  >
                    Valid Only ({validRows.length})
                  </button>

                  {invalidRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTabFilter('invalid')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        tabFilter === 'invalid'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
                      }`}
                    >
                      Errors / Invalid ({invalidRows.length})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setTabFilter('updates')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      tabFilter === 'updates'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100'
                    }`}
                  >
                    Updates ({updateRows.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabFilter('creates')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      tabFilter === 'creates'
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100'
                    }`}
                  >
                    New Items ({createRows.length})
                  </button>
                </div>

                <div className="w-full sm:w-60">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search in parsed rows..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-hidden focus:ring-2 focus:ring-[#ff6452]"
                  />
                </div>
              </div>

              {/* Interactive Data Table Preview */}
              <div className="border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-gray-100 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-bold">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">Row</th>
                        <th className="py-2.5 px-3 w-28">Status / Action</th>
                        <th className="py-2.5 px-3 min-w-[180px]">Product Name *</th>
                        <th className="py-2.5 px-3 w-28">Price ({currency}) *</th>
                        <th className="py-2.5 px-3 w-24">Stock *</th>
                        <th className="py-2.5 px-3 w-32">Category</th>
                        <th className="py-2.5 px-3 w-28">SKU</th>
                        <th className="py-2.5 px-3 w-12 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-400 dark:text-slate-500">
                            No rows match the current filter.
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((row) => {
                          const hasNameError = row.errors.some((e) => e.field === 'name');
                          const hasPriceError = row.errors.some((e) => e.field === 'price');
                          const hasStockError = row.errors.some((e) => e.field === 'stock');

                          return (
                            <tr
                              key={row.rowNumber}
                              className={`transition-colors ${
                                !row.isValid
                                  ? 'bg-rose-50/40 dark:bg-rose-950/20'
                                  : row.action === 'update'
                                  ? 'bg-blue-50/20 dark:bg-blue-950/10'
                                  : 'hover:bg-gray-50/60 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              {/* Row Number */}
                              <td className="py-2.5 px-3 text-center text-gray-400 font-mono text-[11px]">
                                #{row.rowNumber}
                              </td>

                              {/* Action Badge & Errors */}
                              <td className="py-2.5 px-3">
                                {row.isValid ? (
                                  row.action === 'update' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-bold text-[10px]" title={`Updates: ${row.matchedProductName || 'Matched product'}`}>
                                      <RefreshCw className="w-2.5 h-2.5" />
                                      Update
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold text-[10px]">
                                      <Plus className="w-2.5 h-2.5" />
                                      Create
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold text-[10px]">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    Error
                                  </span>
                                )}
                              </td>

                              {/* Product Name */}
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.data.name}
                                  onChange={(e) =>
                                    handleEditRowField(row.rowNumber, 'name', e.target.value)
                                  }
                                  className={`w-full px-2 py-1 rounded-lg border text-xs font-semibold ${
                                    hasNameError
                                      ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                                      : 'border-transparent hover:border-gray-200 focus:border-[#ff6452] bg-transparent text-gray-900 dark:text-white'
                                  }`}
                                  placeholder="Required product name"
                                />
                                {hasNameError && (
                                  <p className="text-[10px] text-rose-600 font-bold mt-0.5">
                                    Name is required
                                  </p>
                                )}
                              </td>

                              {/* Price */}
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={row.data.price || ''}
                                  onChange={(e) =>
                                    handleEditRowField(row.rowNumber, 'price', e.target.value)
                                  }
                                  className={`w-24 px-2 py-1 rounded-lg border text-xs font-mono font-bold ${
                                    hasPriceError
                                      ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                                      : 'border-transparent hover:border-gray-200 focus:border-[#ff6452] bg-transparent text-gray-900 dark:text-white'
                                  }`}
                                  placeholder="0.00"
                                />
                                {hasPriceError && (
                                  <p className="text-[10px] text-rose-600 font-bold mt-0.5">
                                    Invalid price
                                  </p>
                                )}
                              </td>

                              {/* Stock */}
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={row.data.stock ?? ''}
                                  onChange={(e) =>
                                    handleEditRowField(row.rowNumber, 'stock', e.target.value)
                                  }
                                  className={`w-20 px-2 py-1 rounded-lg border text-xs font-mono font-bold ${
                                    hasStockError
                                      ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                                      : 'border-transparent hover:border-gray-200 focus:border-[#ff6452] bg-transparent text-gray-900 dark:text-white'
                                  }`}
                                  placeholder="0"
                                />
                                {hasStockError && (
                                  <p className="text-[10px] text-rose-600 font-bold mt-0.5">
                                    Invalid qty
                                  </p>
                                )}
                              </td>

                              {/* Category */}
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.data.category}
                                  onChange={(e) =>
                                    handleEditRowField(row.rowNumber, 'category', e.target.value)
                                  }
                                  className="w-full px-2 py-1 rounded-lg border border-transparent hover:border-gray-200 focus:border-[#ff6452] bg-transparent text-xs text-gray-700 dark:text-slate-300"
                                />
                              </td>

                              {/* SKU */}
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.data.sku || ''}
                                  onChange={(e) =>
                                    handleEditRowField(row.rowNumber, 'sku', e.target.value)
                                  }
                                  className="w-full px-2 py-1 rounded-lg border border-transparent hover:border-gray-200 focus:border-[#ff6452] bg-transparent text-xs font-mono text-gray-600 dark:text-slate-400"
                                  placeholder="SKU"
                                />
                              </td>

                              {/* Delete Row Button */}
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(row.rowNumber)}
                                  className="p-1 text-gray-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                                  title="Remove this row from import"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: IMPORTING / PROGRESS SCREEN */}
          {step === 'importing' && (
            <div className="py-12 px-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-[#ff6452] flex items-center justify-center mx-auto animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>

              <div>
                <h4 className="text-lg font-black text-gray-900 dark:text-white">
                  Importing Products to Catalog...
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Persisting batch inventory items, prices, and catalog attributes to database.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <div className="w-full h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ff6452] transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>Processing batch</span>
                  <span>{progressPercent}%</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: COMPLETED SUMMARY SCREEN */}
          {step === 'completed' && importResults && (
            <div className="py-8 px-6 text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-xl font-black text-gray-900 dark:text-white">
                  Bulk CSV Import Completed
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Product catalog and inventory updates have been applied successfully.
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-400 block">
                    Created Products
                  </span>
                  <span className="text-2xl font-black text-purple-900 dark:text-purple-200 mt-1 block">
                    +{importResults.createdCount}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 block">
                    Updated Products
                  </span>
                  <span className="text-2xl font-black text-blue-900 dark:text-blue-200 mt-1 block">
                    {importResults.updatedCount}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                  <span className="text-xs font-bold text-gray-600 dark:text-slate-400 block">
                    Failed / Skipped
                  </span>
                  <span className="text-2xl font-black text-gray-800 dark:text-slate-300 mt-1 block">
                    {importResults.failedCount}
                  </span>
                </div>
              </div>

              {/* Error messages if any */}
              {importResults.errors.length > 0 && (
                <div className="max-w-xl mx-auto p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-left">
                  <h6 className="text-xs font-black text-rose-800 dark:text-rose-300 mb-1">
                    Notices / Unprocessed items:
                  </h6>
                  <ul className="text-[11px] text-rose-700 dark:text-rose-400 space-y-1 list-disc list-inside max-h-28 overflow-y-auto">
                    {importResults.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
          <div>
            {step === 'preview' && (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                ← Upload Different CSV
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {step === 'upload' && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            {step === 'preview' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={validRows.length === 0}
                  onClick={handleStartImport}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#ff6452] hover:bg-[#ff4935] disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <span>
                    Import {skipInvalid ? validRows.length : totalCount} Products
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {step === 'completed' && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Done & View Inventory
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
