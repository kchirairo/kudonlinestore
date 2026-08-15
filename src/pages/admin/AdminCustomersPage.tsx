import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, ShoppingBag, Eye, ShieldCheck, Mail, Phone } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Customer } from '../../types';
import { STORE_CONFIG } from '../../constants/config';

export const AdminCustomersPage: React.FC = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCustomers = async () => {
    setIsLoading(true);
    const data = await adminService.getCustomers(searchQuery);
    setCustomers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Customer Directory</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            View registered user profiles, lifetime order history, and purchase statistics.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search customers by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
          />
        </div>
      </div>

      {/* Customers List Content */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded-xl w-1/4" />
          <div className="h-16 bg-gray-200 rounded-2xl" />
          <div className="h-16 bg-gray-200 rounded-2xl" />
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-gray-100 text-center space-y-3">
          <Users className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-base font-bold text-gray-900">No customers found</p>
          <p className="text-xs text-gray-400">Try refining your search query.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-6">Customer Name</th>
                  <th className="py-3.5 px-6">Contact Email</th>
                  <th className="py-3.5 px-6">Phone</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Joined Date</th>
                  <th className="py-3.5 px-6">Orders</th>
                  <th className="py-3.5 px-6">Total Spent</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {customers.map((cust) => (
                  <tr
                    key={cust.id}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/customers/${cust.id}`)}
                  >
                    <td className="py-4 px-6">
                      <div className="font-bold text-gray-900 text-sm">
                        {cust.fullName || 'Registered Customer'}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-600">{cust.email}</td>
                    <td className="py-4 px-6 text-gray-500">{cust.phone || '-'}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          cust.role === 'admin'
                            ? 'bg-rose-50 text-[#ff6452] border border-[#ff6452]/20'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {cust.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                        <span className="capitalize">{cust.role}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-400">
                      {new Date(cust.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-800">{cust.orderCount} orders</td>
                    <td className="py-4 px-6 font-black text-gray-900">
                      {STORE_CONFIG.STORE_CURRENCY}
                      {cust.totalSpent.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/customers/${cust.id}`);
                        }}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-[#ff6452] hover:text-white rounded-xl text-xs font-bold text-gray-700 transition-colors"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-gray-100">
            {customers.map((cust) => (
              <div
                key={cust.id}
                onClick={() => navigate(`/admin/customers/${cust.id}`)}
                className="p-4 space-y-3 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-sm">
                    {cust.fullName || 'Registered User'}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                    {cust.role}
                  </span>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{cust.email}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{cust.phone || '-'}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                  <span className="font-semibold text-gray-500">{cust.orderCount} Orders</span>
                  <span className="font-black text-gray-900">
                    {STORE_CONFIG.STORE_CURRENCY}
                    {cust.totalSpent.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
