import React from 'react';
import { Menu, Store, ExternalLink, Shield } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../ThemeToggle';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  title?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar, title }) => {
  const { user } = useShop();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 transition-colors duration-200">
      {/* Left side: Mobile menu toggle + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {title && (
          <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
            {title}
          </h1>
        )}
      </div>

      {/* Right side: Theme Toggle, Store shortcut & Admin profile info */}
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />

        <button
          onClick={() => navigate('/')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Store className="w-3.5 h-3.5 text-[#ff6452]" />
          <span>View Store</span>
          <ExternalLink className="w-3 h-3 text-gray-400 dark:text-slate-400" />
        </button>

        <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-slate-800/80 p-1.5 pr-3 rounded-full border border-gray-100 dark:border-slate-700">
          <div className="w-7 h-7 rounded-full bg-[#ff6452] text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
            {user?.fullName ? user.fullName[0] : 'A'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-gray-900 dark:text-white leading-none">
              {user?.fullName || 'Administrator'}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-slate-400 font-medium">
              <Shield className="w-3 h-3 text-[#ff6452]" />
              <span>Admin Profile</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
