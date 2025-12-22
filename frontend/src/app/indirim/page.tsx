'use client';

import { useState, useEffect } from 'react';
import { getProducts } from '@/lib/api';
import Link from 'next/link';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  discount_price: number | null;
  image_url: string;
  category: string;
}

export default function IndirimPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiscountedProducts();
  }, []);

  const fetchDiscountedProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts({ on_sale: true });
      setProducts(response.products || []);
    } catch (error) {
      console.error('İndirimli ürünler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscount = (price: number, discountPrice: number) => {
    return Math.round(((price - discountPrice) / price) * 100);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">İndirimli Ürünler</h1>
        <p className="text-gray-600">
          Sezon sonu fırsatları ve özel indirimler
        </p>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-600 mb-4">
            Şu anda indirimli ürün bulunmamaktadır.
          </p>
          <Link
            href="/"
            className="inline-block bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Alışverişe Devam Et
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/urun/${product.slug}`}
              className="group"
            >
              <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
                  {product.discount_price && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold z-10">
                      %{calculateDiscount(product.price, product.discount_price)} İNDİRİM
                    </div>
                  )}
                  <img
                    src={product.image_url || '/placeholder.jpg'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-500 mb-1">{product.category}</p>
                  <h3 className="font-semibold mb-2 group-hover:text-gray-600 transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    {product.discount_price ? (
                      <>
                        <span className="text-lg font-bold text-red-600">
                          {product.discount_price.toFixed(2)} TL
                        </span>
                        <span className="text-sm text-gray-500 line-through">
                          {product.price.toFixed(2)} TL
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold">
                        {product.price.toFixed(2)} TL
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
