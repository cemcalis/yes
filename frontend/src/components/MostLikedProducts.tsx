"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  image_url: string;
  stock_status: string;
}

export default function MostLikedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();

  useEffect(() => {
    const fetchMostLiked = async () => {
      try {
        const response = await fetch("/api/products/most-liked");
        const data = await response.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.products)
          ? (data as any).products
          : [];
        setProducts(list.slice(0, 3)); // Show only 3 products
      } catch (error) {
        console.error("Error fetching most liked products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMostLiked();
  }, []);

  const handleAddToCart = async (product: Product) => {
    try {
      await addToCart(product.id, {
        quantity: 1,
        price: product.price,
        name: product.name,
        image_url: product.image_url,
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">En Çok Beğenilenler</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">En Çok Beğenilenler</h2>
      <div className="space-y-4">
        {products.map((product) => (
          <div key={product.id} className="flex gap-4">
            <Link href={`/urun/${product.slug}`}>
              <div className="w-16 h-16 relative">
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover rounded"
                />
              </div>
            </Link>
            <div className="flex-1">
              <Link href={`/urun/${product.slug}`}>
                <h3 className="font-medium text-sm hover:text-blue-600 transition-colors">
                  {product.name}
                </h3>
              </Link>
              <p className="text-sm text-gray-600">
                {product.price.toLocaleString("tr-TR")} TL
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleAddToCart(product)}
                  className="text-blue-600 hover:text-blue-700"
                  title="Sepete Ekle"
                >
                  <ShoppingBag className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (isFavorite(product.id)) {
                      removeFromFavorites(product.id);
                    } else {
                      addToFavorites(product.id);
                    }
                  }}
                  className={`${
                    isFavorite(product.id) ? "text-red-500" : "text-gray-400"
                  } hover:text-red-500 transition-colors`}
                  title="Favorilere Ekle"
                >
                  <Heart className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
