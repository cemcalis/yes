"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Heart } from "lucide-react";

interface ProductCardProps {
  id: number;
  name: string;
  slug: string;
  price: number;
  compare_price?: number;
  image_url: string;
  stock_status: string;
  is_new?: boolean;
}

export default function ProductCard({
  id,
  name,
  slug,
  price,
  compare_price,
  image_url,
  stock_status,
  is_new,
}: ProductCardProps) {
  const { user } = useAuth();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const [isAddingToFavorites, setIsAddingToFavorites] = useState(false);

  const discount = compare_price
    ? Math.round(((compare_price - price) / compare_price) * 100)
    : 0;

  const isProductFavorite = isFavorite(id);
  
  // Use placeholder if no image
  const displayImage = image_url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800';

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
      window.location.href = "/giris";
      return;
    }

    setIsAddingToFavorites(true);

    try {
      if (isProductFavorite) {
        await removeFromFavorites(id);
      } else {
        await addToFavorites(id);
      }
    } catch (error) {
      console.error("Favori işlemi başarısız:", error);
    } finally {
      setIsAddingToFavorites(false);
    }
  };

  const [imageError, setImageError] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [visibleAnimated, setVisibleAnimated] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleAnimated(true);
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className={`group relative ${
        visibleAnimated ? "animate-fade-in-up" : "opacity-0"
      }`}
    >
      <Link href={`/urun/${slug}`} className="block group">
        <div className="relative aspect-3/4 bg-gray-50 overflow-hidden mb-3 rounded-lg">
          {!imageError ? (
            <Image
              src={displayImage}
              alt={name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              unoptimized={displayImage.startsWith('/uploads')}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-2">🛍️</div>
                <div className="text-sm font-medium">Resim Yükleniyor</div>
              </div>
            </div>
          )}

          {/* Badges - Minimal */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {is_new && (
              <span className="bg-black text-white text-xs px-2 py-1 font-medium">
                NEW
              </span>
            )}
            {discount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 font-medium">
                SALE
              </span>
            )}
            {stock_status === "out_of_stock" && (
              <span className="bg-gray-900 text-white text-xs px-2 py-1 font-medium">
                SOLD OUT
              </span>
            )}
          </div>

          {/* Favori butonu - Minimal */}
          <button
            onClick={handleFavoriteClick}
            disabled={isAddingToFavorites}
            className={`absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm transition-all duration-200 ${
              isProductFavorite
                ? "text-red-500"
                : "text-gray-600 hover:text-red-500"
            } ${isAddingToFavorites ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Heart
              size={18}
              className={`transition-all duration-200 ${
                isProductFavorite ? "fill-current" : ""
              }`}
            />
          </button>
        </div>

        <div className="text-center">
          <h3 className="text-sm font-normal mb-2 text-gray-800 group-hover:text-gray-600 transition-colors uppercase tracking-wide">
            {name}
          </h3>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {price.toLocaleString("tr-TR")} TL
            </span>
            {compare_price && (
              <span className="text-xs text-gray-400 line-through">
                {compare_price.toLocaleString("tr-TR")} TL
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
