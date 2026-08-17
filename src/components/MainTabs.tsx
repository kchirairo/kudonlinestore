import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const MainTabs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isFavouritesPage = location.pathname === '/favourites';

  return (
    <div className="w-full border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center gap-8 text-base font-semibold">
        {/* Discover Tab */}
        <button
          onClick={() => navigate('/')}
          className={`py-3 relative transition-colors cursor-pointer ${
            !isFavouritesPage
              ? 'text-gray-900 dark:text-white font-bold'
              : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'
          }`}
        >
          Discover
          {!isFavouritesPage && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff6452] rounded-full" />
          )}
        </button>

        {/* Favourites Tab */}
        <button
          onClick={() => navigate('/favourites')}
          className={`py-3 relative transition-colors cursor-pointer ${
            isFavouritesPage
              ? 'text-gray-900 dark:text-white font-bold'
              : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'
          }`}
        >
          Favourites
          {isFavouritesPage && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff6452] rounded-full" />
          )}
        </button>
      </div>
    </div>
  );
};
