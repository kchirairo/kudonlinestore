import React from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products }) => {
  if (products.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
