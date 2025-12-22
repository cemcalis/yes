'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function FavoritesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { favorites, isLoading: favoritesLoading, clearFavorites } = useFavorites();
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/giris?redirect=/favoriler');
    }
  }, [user, authLoading, router]);

  const handleClearFavorites = async () => {
    if (!confirm('Tüm favori ürünleri temizlemek istediğinizden emin misiniz?')) {
      return;
    }

    setIsClearing(true);
    try {
      await clearFavorites();
    } catch (error) {
      console.error('Favoriler temizlenemedi:', error);
    } finally {
      setIsClearing(false);
    }
  };

  if (authLoading || favoritesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="text-3xl font-bold">Favori Ürünlerim</h1>
              <p className="text-muted-foreground">
                {favorites.length} ürün favorilerinizde
              </p>
            </div>
          </div>

          {favorites.length > 0 && (
            <button
              onClick={handleClearFavorites}
              disabled={isClearing}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              {isClearing ? 'Temizleniyor...' : 'Temizle'}
            </button>
          )}
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Henüz favori ürününüz yok</h2>
            <p className="text-muted-foreground mb-6">
              Beğendiğiniz ürünleri favorilerinize ekleyerek daha sonra kolayca bulabilirsiniz.
            </p>
            <Link
              href="/koleksiyon"
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <ShoppingBag size={16} />
              Alışverişe Başla
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {favorites.map((product) => (
              <ProductCard
                key={product.product_id}
                id={product.product_id}
                name={product.name}
                slug={product.slug}
                price={product.price}
                image_url={product.image_url}
                stock_status="in_stock"
              />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
