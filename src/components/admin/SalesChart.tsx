import React from 'react';
import { SalesDataPoint } from '../../types';
import { STORE_CONFIG } from '../../constants/config';
import { TrendingUp, DollarSign } from 'lucide-react';

interface SalesChartProps {
  data: SalesDataPoint[];
}

export const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 bg-gray-50 rounded-2xl flex items-center justify-center text-xs text-gray-400 font-medium">
        No sales data available for this period.
      </div>
    );
  }

  const maxSales = Math.max(...data.map((d) => d.sales), 1000);
  const totalPeriodSales = data.reduce((sum, d) => sum + d.sales, 0);
  const totalPeriodOrders = data.reduce((sum, d) => sum + d.ordersCount, 0);

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#ff6452]" />
            <h3 className="text-base font-black text-gray-900 tracking-tight">
              Sales Performance
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Paid orders revenue over the last 7 days</p>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Period Revenue
            </span>
            <span className="text-lg font-black text-gray-900">
              {STORE_CONFIG.STORE_CURRENCY}
              {totalPeriodSales.toLocaleString()}
            </span>
          </div>
          <div className="h-8 w-px bg-gray-100" />
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Orders
            </span>
            <span className="text-lg font-black text-gray-900">{totalPeriodOrders}</span>
          </div>
        </div>
      </div>

      {/* SVG Bar / Area Chart */}
      <div className="pt-2">
        <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 px-2">
          {data.map((item, idx) => {
            const heightPercent = Math.max(10, Math.round((item.sales / maxSales) * 100));

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[11px] font-extrabold text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white px-2 py-0.5 rounded-md whitespace-nowrap shadow-xs">
                  {STORE_CONFIG.STORE_CURRENCY}
                  {item.sales.toLocaleString()}
                </div>

                <div className="w-full bg-gray-100 rounded-2xl overflow-hidden h-full max-h-[140px] flex items-end">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-[#ff6452] group-hover:bg-[#ff4935] transition-all rounded-t-2xl relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                  </div>
                </div>

                <span className="text-[11px] font-bold text-gray-500 truncate max-w-full">
                  {item.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
