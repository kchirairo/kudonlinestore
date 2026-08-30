import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileText,
  Percent,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { InvoiceMonthlyAnalyticsData } from '../../types';
import { adminService } from '../../services/adminService';
import { STORE_CONFIG } from '../../constants/config';
import { formatCurrency } from '../../utils/taxUtils';

interface InvoiceAnalyticsChartProps {
  initialData?: InvoiceMonthlyAnalyticsData[];
}

export const InvoiceAnalyticsChart: React.FC<InvoiceAnalyticsChartProps> = ({ initialData }) => {
  const [data, setData] = useState<InvoiceMonthlyAnalyticsData[]>(initialData || []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialData || initialData.length === 0);
  const [timeframe, setTimeframe] = useState<6 | 12>(6);
  const [activeView, setActiveView] = useState<'all' | 'revenue' | 'success_rate' | 'vat'>('all');

  const loadData = async (months: number) => {
    setIsLoading(true);
    try {
      const res = await adminService.getInvoiceAnalyticsData(months);
      setData(res);
    } catch (err) {
      console.error('Failed to load invoice analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData || initialData.length === 0) {
      loadData(timeframe);
    }
  }, [timeframe]);

  // Aggregate summary totals
  const totalInvoicedPeriod = data.reduce((acc, curr) => acc + curr.totalInvoiced, 0);
  const totalPaidPeriod = data.reduce((acc, curr) => acc + curr.paidTotal, 0);
  const totalOutstandingPeriod = data.reduce((acc, curr) => acc + curr.outstandingBalance, 0);
  const totalVatPeriod = data.reduce((acc, curr) => acc + curr.vatTotal, 0);
  const totalInvoicesCount = data.reduce((acc, curr) => acc + curr.invoiceCount, 0);
  const totalPaidInvoicesCount = data.reduce((acc, curr) => acc + curr.paidCount, 0);
  const averageSuccessRate = totalInvoicesCount > 0
    ? Math.round((totalPaidInvoicesCount / totalInvoicesCount) * 100)
    : 100;

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentMonthData = data.find((d) => d.month === label || d.shortMonth === label);
      return (
        <div className="bg-gray-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-gray-700 text-xs space-y-2 backdrop-blur-md min-w-[200px]">
          <div className="flex items-center justify-between border-b border-gray-700 pb-1.5">
            <span className="font-extrabold text-[#ff6452] text-xs">{label}</span>
            <span className="text-[10px] text-gray-400 font-bold">
              {currentMonthData?.invoiceCount || 0} Invoices
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center text-gray-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ff6452]" />
                Total Invoiced:
              </span>
              <strong className="text-white font-bold">{formatCurrency(currentMonthData?.totalInvoiced || 0)}</strong>
            </div>

            <div className="flex justify-between items-center text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Paid Revenue:
              </span>
              <strong className="font-bold">{formatCurrency(currentMonthData?.paidTotal || 0)}</strong>
            </div>

            <div className="flex justify-between items-center text-amber-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Outstanding Balance:
              </span>
              <strong className="font-bold">{formatCurrency(currentMonthData?.outstandingBalance || 0)}</strong>
            </div>

            <div className="flex justify-between items-center text-blue-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                SARS 15% VAT:
              </span>
              <strong className="font-bold">{formatCurrency(currentMonthData?.vatTotal || 0)}</strong>
            </div>

            <div className="flex justify-between items-center text-purple-300 border-t border-gray-700 pt-1.5 mt-1 font-bold">
              <span>Payment Success Rate:</span>
              <span className="text-purple-400">{currentMonthData?.successRate || 0}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs space-y-6">
      {/* Header with Title and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-[#ff6452] flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
              Invoice & Financial Performance Analytics
            </h3>
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
            Visualized monthly tax invoice totals, payment conversion rates, and outstanding balances
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Filter Switcher */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-2xl p-1 border border-gray-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setActiveView('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeView === 'all'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900'
              }`}
            >
              All Metrics
            </button>
            <button
              onClick={() => setActiveView('revenue')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeView === 'revenue'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900'
              }`}
            >
              Paid vs Due
            </button>
            <button
              onClick={() => setActiveView('success_rate')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeView === 'success_rate'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900'
              }`}
            >
              Success Rate (%)
            </button>
          </div>

          {/* Timeframe Select */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-2xl p-1 border border-gray-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setTimeframe(6)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeframe === 6
                  ? 'bg-[#ff6452] text-white shadow-2xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900'
              }`}
            >
              6 Months
            </button>
            <button
              onClick={() => setTimeframe(12)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeframe === 12
                  ? 'bg-[#ff6452] text-white shadow-2xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900'
              }`}
            >
              12 Months
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-gray-50/80 dark:bg-slate-800/40 rounded-2xl p-3.5 border border-gray-100 dark:border-slate-800">
          <span className="text-[10px] font-extrabold uppercase text-gray-400 dark:text-slate-500 block">
            Total Invoiced
          </span>
          <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
            {formatCurrency(totalInvoicedPeriod)}
          </p>
          <span className="text-[10px] text-gray-400 dark:text-slate-500">
            {totalInvoicesCount} invoices issued
          </span>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-3.5 border border-emerald-100 dark:border-emerald-900/40">
          <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 block">
            Paid & Settled
          </span>
          <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
            {formatCurrency(totalPaidPeriod)}
          </p>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
            {totalPaidInvoicesCount} settled invoices
          </span>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl p-3.5 border border-amber-100 dark:border-amber-900/40">
          <span className="text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400 block">
            Outstanding Balance
          </span>
          <p className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">
            {formatCurrency(totalOutstandingPeriod)}
          </p>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
            Awaiting customer payment
          </span>
        </div>

        <div className="bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl p-3.5 border border-purple-100 dark:border-purple-900/40">
          <span className="text-[10px] font-extrabold uppercase text-purple-600 dark:text-purple-400 block">
            Avg Success Rate
          </span>
          <p className="text-lg font-black text-purple-700 dark:text-purple-300 mt-0.5">
            {averageSuccessRate}%
          </p>
          <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80">
            Payment conversion rate
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="pt-2">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-xs text-gray-400 font-bold">
            Loading invoice charts...
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-gray-400 font-bold">
            No invoice analytics data found for this timeframe.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis
                  dataKey="shortMonth"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                />
                {/* Left Axis: ZAR Currency Amount */}
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                  tickFormatter={(val) => `R${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                {/* Right Axis: Percentage (0 - 100%) */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#8b5cf6' }}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingBottom: '10px' }}
                />

                {(activeView === 'all' || activeView === 'revenue') && (
                  <>
                    <Bar
                      yAxisId="left"
                      dataKey="paidTotal"
                      name="Paid Revenue (ZAR)"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="outstandingBalance"
                      name="Outstanding Balance (ZAR)"
                      fill="#f59e0b"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                    />
                  </>
                )}

                {activeView === 'all' && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="successRate"
                    name="Success Rate (%)"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6, fill: '#ff6452' }}
                  />
                )}

                {activeView === 'success_rate' && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="successRate"
                    name="Payment Success Rate (%)"
                    stroke="#8b5cf6"
                    strokeWidth={4}
                    dot={{ r: 5, fill: '#8b5cf6', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 7, fill: '#ff6452' }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Footer Insight Banner */}
      <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-gray-500 dark:text-slate-400 border-t border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>SARS 15% VAT Accounted: {formatCurrency(totalVatPeriod)} across all settled invoices</span>
        </div>
        <div className="text-gray-400">
          Updated continuously as orders are marked Paid or reconciled via gateways
        </div>
      </div>
    </div>
  );
};
