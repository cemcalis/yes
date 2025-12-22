"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FiShoppingBag, FiHeart } from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { api } from "@/lib/api";

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_price?: number;
  image_url: string;
  images: string[];
  stock_status: string;
  category_name: string;
  category_slug: string;
  variants?: {
    id: number;
    size: string;
    color?: string;
    stock: number;
  }[];
}

interface Review {
  id: number;
  product_id: number;
  user_id?: number;
  customer_name: string;
  customer_email: string;
  rating: number;
  comment: string;
  created_at: string;
  user_name?: string;
}

interface ReviewData {
  reviews: Review[];
  product: {
    name: string;
    slug: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  averageRating: number;
  totalReviews: number;
}

export default function ProductPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviews, setReviews] = useState<ReviewData | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [showToast, setShowToast] = useState<{
    visible: boolean;
    message: string;
  }>({ visible: false, message: "" });

  const { user } = useAuth();
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();
  const { addToCart } = useCart();

  const router = useRouter();

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    try {
      const data = await api.getProduct(slug);
      setProduct(data);
      if (data.variants && data.variants.length > 0) {
        setSelectedSize(data.variants[0].size);
      }
      setLoading(false);
    } catch (error) {
      console.error("Ürün yüklenirken hata:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <div className="aspect-square bg-muted rounded-lg mb-4" />
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-square bg-muted rounded-md" />
              ))}
            </div>
          </div>
          <div>
            <div className="h-8 bg-muted rounded mb-4 w-3/4" />
            <div className="h-6 bg-muted rounded mb-4 w-1/4" />
            <div className="h-24 bg-muted rounded mb-4" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Ürün bulunamadı</h1>
        <Link href="/" className="text-secondary hover:underline">
          Anasayfaya dön
        </Link>
      </div>
    );
  }

  const handleAddToCart = async () => {
    // Require user to be logged in before adding to cart
    if (!user) {
      // Redirect to registration page (per request)
      router.push(`/kayit?redirect=/urun/${product.slug}`);
      return;
    }

    try {
      await addToCart(product.id, {
        variant_id: undefined, // şimdilik variant yok
        quantity,
        price: product.price,
        name: product.name,
        image_url: product.image_url,
        size: selectedSize,
      });
      // Inline toast feedback
      setShowToast({ visible: true, message: "Ürün sepete eklendi" });
      setTimeout(() => setShowToast({ visible: false, message: "" }), 2500);
    } catch (err) {
      console.error("Sepete eklenirken hata:", err);
      setShowToast({
        visible: true,
        message: "Sepete eklenemedi. Lütfen tekrar deneyin.",
      });
      setTimeout(() => setShowToast({ visible: false, message: "" }), 3500);
    }
  };

  const discount = product.compare_price
    ? Math.round(
        ((product.compare_price - product.price) / product.compare_price) * 100
      )
    : 0;

  const allImages =
    product.images.length > 0 ? product.images : [product.image_url];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Toast */}
      {showToast.visible && (
        <div className="fixed right-4 top-6 z-50">
          <div className="bg-black text-white px-4 py-2 rounded shadow">
            {showToast.message}
          </div>
        </div>
      )}
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6 text-foreground/60">
        <Link href="/" className="hover:text-foreground">
          Anasayfa
        </Link>
        <span>/</span>
        <Link
          href={`/koleksiyon/${product.category_slug}`}
          className="hover:text-foreground"
        >
          {product.category_name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Images */}
        <div>
          <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden mb-4">
            <Image
              src={allImages[selectedImage]}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 50vw"
              className="object-cover"
              unoptimized={allImages[selectedImage]?.startsWith("/uploads")}
              priority
            />
            {discount > 0 && (
              <span className="absolute top-4 left-4 bg-red-500 text-white text-sm px-3 py-1 rounded-full font-medium">
                %{discount} İNDİRİM
              </span>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {allImages.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                    selectedImage === idx
                      ? "border-primary"
                      : "border-transparent"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} ${idx + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized={img?.startsWith("/uploads")}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl font-bold">
              {product.price.toLocaleString("tr-TR")} TL
            </span>
            {product.compare_price && (
              <span className="text-xl text-foreground/50 line-through">
                {product.compare_price.toLocaleString("tr-TR")} TL
              </span>
            )}
          </div>

          <p className="text-foreground/70 mb-8 leading-relaxed">
            {product.description}
          </p>

          {/* Size Selection */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-6">
              <label className="block font-medium mb-3">Beden Seçin</label>
              <div className="flex gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedSize(variant.size)}
                    disabled={variant.stock === 0}
                    className={`px-4 py-2 border rounded-md transition-colors font-semibold ${
                      selectedSize === variant.size
                        ? "border-champagne-contrast/60 hover:border-champagne-contrast/80 text-champagne-contrast bg-white shadow-sm ring-1 ring-champagne-contrast/30"
                        : "border-gray-300 hover:border-champagne-contrast/60 text-gray-900 bg-white"
                    } ${
                      variant.stock === 0 ? "opacity-30 cursor-not-allowed" : ""
                    }`}
                  >
                    {variant.size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-6">
            <label className="block font-medium mb-3">Adet</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors bg-white text-gray-900 font-semibold text-lg"
              >
                -
              </button>
              <span className="w-12 text-center font-medium text-gray-900">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors bg-white text-gray-900 font-semibold text-lg"
              >
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={handleAddToCart}
              disabled={product.stock_status === "out_of_stock"}
              className="flex-1 bg-white border border-champagne-contrast/60 text-champagne-contrast px-6 py-4 rounded-md font-medium shadow-sm hover:bg-gray-50 hover:shadow transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FiShoppingBag />
              {product.stock_status === "out_of_stock"
                ? "Stokta Yok"
                : "Sepete Ekle"}
            </button>
            <button
              onClick={() => {
                if (!user) {
                  router.push(`/giris?redirect=/urun/${product.slug}`);
                  return;
                }
                if (isFavorite(product.id)) {
                  removeFromFavorites(product.id);
                } else {
                  addToFavorites(product.id);
                }
              }}
              className={`w-14 h-14 border rounded-md transition-colors flex items-center justify-center ${
                isFavorite(product.id)
                  ? "border-red-300 bg-red-50 text-red-600"
                  : "border-gray-300 hover:bg-gray-100 bg-white text-gray-900"
              }`}
            >
              <FiHeart size={20} />
            </button>
          </div>

          {/* Product Details */}
          <div className="border-t border-border pt-6 space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground/60">Kategori:</span>
              <Link
                href={`/koleksiyon/${product.category_slug}`}
                className="font-medium hover:text-secondary"
              >
                {product.category_name}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Stok Durumu:</span>
              <span
                className={
                  product.stock_status === "in_stock"
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {product.stock_status === "in_stock" ? "Stokta" : "Tükendi"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Kargo:</span>
              <span className="font-medium">2-3 iş günü</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
