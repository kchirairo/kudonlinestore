import React from 'react';

export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
          <div className="w-full aspect-[4/3] bg-gray-200" />
          <div className="p-3.5 space-y-2">
            <div className="h-4 bg-gray-200 rounded-md w-1/2" />
            <div className="h-3 bg-gray-200 rounded-md w-1/3" />
            <div className="h-4 bg-gray-200 rounded-md w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const DetailSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="aspect-square bg-gray-200 rounded-3xl" />
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded-md w-1/4" />
        <div className="h-8 bg-gray-200 rounded-md w-3/4" />
        <div className="h-6 bg-gray-200 rounded-md w-1/3" />
        <div className="h-20 bg-gray-200 rounded-2xl" />
        <div className="h-12 bg-gray-200 rounded-2xl w-full" />
      </div>
    </div>
  );
};
