'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import { FiChevronDown } from 'react-icons/fi';
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

export default function CollectionPage() {
  const params = useParams();
  const slug = params?.slug as string;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);

  const categoryNames: Record<string, string> = {
    'elbiseler': 'Elbiseler',
    'ustler': 'Üstler',
    'altlar': 'Altlar',
    'dis-giyim': 'Dış Giyim',
    'aksesuarlar': 'Aksesuarlar',
  };

  useEffect(() => {
    fetchProducts();
  }, [slug, sortBy]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts({ category: slug, sort: sortBy });
      setProducts(data);
    } catch (error) {
      console.error('Ürünler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortOptions = [
    { value: 'featured', label: 'Öne Çıkan' },
    { value: 'newest', label: 'En Yeni' },
    { value: 'price_asc', label: 'Fiyat: Düşükten Yükseğe' },
    { value: 'price_desc', label: 'Fiyat: Yüksekten Düşüğe' },
    { value: 'name_asc', label: 'İsim: A-Z' },
    { value: 'name_desc', label: 'İsim: Z-A' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{categoryNames[slug] || 'Koleksiyon'}</h1>
        <p className="text-foreground/60">
          {products.length} ürün bulundu
        </p>
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-4 border-b border-border">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
        >
          Filtrele
          <FiChevronDown className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Sırala:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-8 p-6 bg-muted rounded-lg">
          <h3 className="font-semibold mb-4">Filtreler</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-2 text-sm">Stok Durumu</h4>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Stokta Olanlar</span>
              </label>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-sm">Fiyat Aralığı</h4>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm"
                />
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-sm">Özellikler</h4>
              <label className="flex items-center gap-2 mb-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Yeni Gelenler</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">İndirimli Ürünler</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] bg-muted rounded-lg mb-3" />
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-foreground/60 text-lg">Bu kategoride henüz ürün bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      )}
    </div>
  );
}
