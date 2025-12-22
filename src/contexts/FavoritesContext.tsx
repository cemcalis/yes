'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '@/lib/api';

interface FavoriteProduct {
  id: number;
  product_id: number;
  user_id: number;
  created_at: string;
  name: string;
  price: number;
  image_url: string;
  slug: string;
  category_name?: string;
}

interface FavoritesContextType {
  favorites: FavoriteProduct[];
  isLoading: boolean;
  addToFavorites: (productId: number) => Promise<void>;
  removeFromFavorites: (productId: number) => Promise<void>;
  clearFavorites: () => Promise<void>;
  isFavorite: (productId: number) => boolean;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user, token } = useAuth();

  // Favori ürünleri yükleme fonksiyonu
  const loadFavorites = useCallback(async () => {
    if (!user || !token) {
      setFavorites([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.getFavorites(user.id);
      setFavorites(data.data || []);
    } catch (error) {
      // Silently handle 401 errors (user not logged in)
      const status = (error as any)?.status;
      if (status !== 401) {
        console.error('Favori ürünler yüklenemedi:', error);
      }
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, token]);

  // Sayfa yüklendiğinde favorileri yükle
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Favoriye ekleme
  const addToFavorites = async (productId: number) => {
    if (!user || !token) {
      throw new Error('Kullanıcı girişi gerekli');
    }

    try {
      await api.addToFavorites(user.id, productId);

      // Başarılı olursa favorileri yeniden yükle
      await loadFavorites();
    } catch (error) {
      console.error('Ürün favorilere eklenemedi:', error);
      throw error;
    }
  };

  // Favoriden çıkarma
  const removeFromFavorites = async (productId: number) => {
    if (!user || !token) {
      throw new Error('Kullanıcı girişi gerekli');
    }

    try {
      await api.removeFromFavorites(user.id, productId);

      // Başarılı olursa favorileri yeniden yükle
      await loadFavorites();
    } catch (error) {
      console.error('Ürün favorilerden çıkarılamadı:', error);
      throw error;
    }
  };

  // Tüm favorileri temizleme
  const clearFavorites = async () => {
    if (!user || !token) {
      throw new Error('Kullanıcı girişi gerekli');
    }

    try {
      await api.clearFavorites(user.id);

      // Başarılı olursa favorileri temizle
      setFavorites([]);
    } catch (error) {
      console.error('Favoriler temizlenemedi:', error);
      throw error;
    }
  };

  // Ürün favoride mi kontrolü
  const isFavorite = (productId: number) => {
    return favorites.some(fav => fav.product_id === productId);
  };

  // Favorileri manuel yenileme
  const refreshFavorites = async () => {
    await loadFavorites();
  };

  const value: FavoritesContextType = {
    favorites,
    isLoading,
    addToFavorites,
    removeFromFavorites,
    clearFavorites,
    isFavorite,
    refreshFavorites,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
