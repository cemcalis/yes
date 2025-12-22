'use client';

import { useCallback, useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import { api } from '@/lib/api';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  compare_price?: number;
  image_url: string;
  stock_status: string;
  is_new?: boolean;
  is_featured?: boolean;
}

interface ProductGridProps {
  title: string;
  filter?: 'featured' | 'new';
  limit?: number;
  className?: string;
}

export default function ProductGrid({ title, filter, limit = 8, className }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      const filters: any = {};

      if (filter === 'featured') {
        filters.featured = true;
      } else if (filter === 'new') {
        filters.new_arrivals = true;
      }

      const data = await api.getProducts(filters);
      setProducts(data.slice(0, limit));
    } catch (error) {
      console.error('Ürünler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (loading) {
    return (
      <section className={`py-16 ${className || ''}`}>
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center text-champagne-contrast">{title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-champagne-100 rounded-xl mb-3" />
                <div className="h-4 bg-champagne-100 rounded mb-2" />
                <div className="h-4 bg-champagne-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-16 ${className || ''}`}>
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8 text-center text-champagne-contrast">{title}</h2>

        {products.length === 0 ? (
          <p className="text-center text-champagne-contrast opacity-60">Henüz ürün bulunmuyor.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
