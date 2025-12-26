"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FiShoppingBag, FiHeart } from "react-icons/fi";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  admin_description?: string;
  price: number;
  compare_price?: number;
  image_url: string;
  images: string[];
  stock_status: string;
  pre_order?: boolean;
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
  const [selectedSize, setSelectedSize] = useState<string>("S");
  const [quantity, setQuantity] = useState<number>(1);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [showSizeRequest, setShowSizeRequest] = useState(false);
  const [showAdminDescription, setShowAdminDescription] = useState(false);
  const [sizeRequest, setSizeRequest] = useState({
    name: "",
    email: "",
    phone: "",
    productName: "",
    size: "",
    note: "",
    consent: false,
  });

  const hasAdminDescription = Boolean(
    product?.admin_description && product.admin_description !== "0"
  );
  const isPreOrder = Boolean(product?.pre_order);

  const [sizeRequestStatus, setSizeRequestStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const { user } = useAuth();
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const router = useRouter();

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    try {
      const data = await api.getProduct(slug);
      setProduct(data);
      setSizeRequest((prev) => ({
        ...prev,
        productName: data.name || prev.productName,
      }));
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
    const qty = quantity || 1;
    try {
      await addToCart(product.id, {
        variant_id: undefined, // Simdilik variant yok
        quantity: qty,
        price: product.price,
        name: product.name,
        image_url: product.image_url,
        size: selectedSize,
      });

      showToast("Urun sepete eklendi", "success");
    } catch (err) {
      console.error("Sepete eklenirken hata:", err);
      showToast("Sepete eklenemedi. Lutfen tekrar deneyin.", "error");
    }
  };

  const handlePreOrder = async () => {
    // Ön sipariş ürünlerinde beden talebi formunu göster
    if (product.pre_order) {
      setShowSizeRequest(true);
      return;
    }

    // Normal ön sipariş işlemi
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showToast("Ön sipariş için giriş yapmalısınız", "error");
        return;
      }

      const response = await api.createOrder({
        product_id: product.id,
        quantity: quantity,
        size: selectedSize,
        pre_order: true,
      });

      if (response.success) {
        showToast("Ön siparişiniz alındı!", "success");
      } else {
        showToast(response.message || "Ön sipariş oluşturulamadı", "error");
      }
    } catch (error) {
      console.error("Pre-order error:", error);
      showToast("Ön sipariş oluşturulamadı", "error");
    }
  };

  const discount = product.compare_price
    ? Math.round(
        ((product.compare_price - product.price) / product.compare_price) * 100
      )
    : null;

  const cleanedImages = Array.isArray(product.images)
    ? product.images.filter(
        (img) => typeof img === "string" && img.trim().length > 0
      )
    : [];

  const allImages =
    cleanedImages.length > 0
      ? cleanedImages
      : product.image_url
      ? [product.image_url]
      : [];

  const specialSizes = ["XS", "M", "L"];

  const handleSizeRequestSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submit = async () => {
      setSizeRequestStatus("idle");
      try {
        const response = await fetch("/api/size-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: sizeRequest.name,
            email: sizeRequest.email,
            phone: sizeRequest.phone,
            productName: sizeRequest.productName || product?.name,
            size: sizeRequest.size || "XS",
            note: sizeRequest.note,
            consent: sizeRequest.consent,
          }),
        });
        if (!response.ok) throw new Error("Talep kaydedilemedi");
        setSizeRequestStatus("success");
        setTimeout(() => {
          setShowSizeRequest(false);
          setSizeRequestStatus("idle");
        }, 1400);
      } catch (err) {
        console.error("Size request error:", err);
        setSizeRequestStatus("error");
      }
    };
    submit();
  };

  const decreaseQuantity = () => {
    setQuantity((q) => Math.max(1, (q || 1) - 1));
  };

  const increaseQuantity = () => {
    setQuantity((q) => (q || 1) + 1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
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
          <div className="relative aspect-3/4 bg-muted rounded-lg overflow-hidden mb-4">
            {allImages.length > 0 && allImages[selectedImage] ? (
              <Image
                src={allImages[selectedImage]}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 50vw"
                className="object-cover"
                unoptimized={allImages[selectedImage]?.startsWith("/uploads")}
                priority
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">No Image</span>
              </div>
            )}
            {discount != null && discount > 0 && (
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
                  {img ? (
                    <Image
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized={img?.startsWith("/uploads")}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-500">No Image</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl font-bold">
              {product.price.toLocaleString("tr-TR")} TL
            </span>
            {product.compare_price && (
              <>
                <span className="text-xl text-foreground/50 line-through">
                  {product.compare_price.toLocaleString("tr-TR")} TL
                </span>
                {!!discount && (
                  <span className="text-sm font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                    %{discount} indirim
                  </span>
                )}
              </>
            )}
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg text-gray-900 mb-4">
              Ürün Açıklaması
            </h3>
            <div className="text-sm text-foreground/70 leading-relaxed bg-gray-50 p-4 rounded-lg">
              {product.description ||
                "Bu ürün için açıklama henüz eklenmemiştir."}
            </div>
          </div>

          {/* Size Selection */}
          <div className="mb-6">
            <label className="block font-medium mb-3">Beden Seçin</label>
            <div className="flex gap-2 flex-wrap">
              {/* Mevcut variantlar */}
              {product.variants && product.variants.length > 0
                ? product.variants
                    .filter((variant) => variant.stock > 0 || product.pre_order)
                    .map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => {
                          if (variant.stock > 0) {
                            setSelectedSize(variant.size);
                          } else if (!product.pre_order) {
                            setSizeRequest({
                              ...sizeRequest,
                              productName: product.name,
                              size: variant.size,
                            });
                            setShowSizeRequest(true);
                          }
                        }}
                        disabled={variant.stock === 0 && !product.pre_order}
                        className={`px-4 py-2 border rounded-md transition-colors font-semibold ${
                          selectedSize === variant.size
                            ? "border-champagne-contrast/60 hover:border-champagne-contrast/80 text-champagne-contrast bg-white shadow-sm ring-1 ring-champagne-contrast/30"
                            : variant.stock > 0
                            ? "border-gray-300 hover:border-champagne-contrast/40 text-gray-700 bg-white"
                            : product.pre_order
                            ? "border-champagne-contrast/40 text-champagne-contrast bg-champagne-contrast/10 hover:bg-champagne-contrast/20"
                            : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
                        }`}
                      >
                        {variant.size}
                        {variant.stock === 0 && (
                          <span className="text-xs block">
                            {product.pre_order ? "Ön Sipariş" : "Talep Oluştur"}
                          </span>
                        )}
                      </button>
                    ))
                : null}
            </div>
          </div>
          <div className="mb-6">
            <label className="block font-medium mb-3">Adet</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={decreaseQuantity}
                aria-label="Adet azalt"
                className="w-10 h-10 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors bg-white text-gray-900 font-semibold text-lg"
              >
                -
              </button>
              <span className="w-12 text-center font-medium text-gray-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={increaseQuantity}
                aria-label="Adet arttır"
                className="w-10 h-10 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors bg-white text-gray-900 font-semibold text-lg"
              >
                +
              </button>

              {/* Özel Talepler badge + Talep bırak link (pre-order ürünler için) */}
              {product.pre_order && (
                <div className="ml-4 flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                    Özel Talepler
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSizeRequest(true)}
                    className="text-sm text-gray-600 hover:underline"
                  >
                    Talep bırak
                  </button>
                </div>
              )}

              {/* Admin Özel Açıklama Butonu - Sadece ön sipariş ve açıklama varsa göster */}
              {isPreOrder && hasAdminDescription && (
                <button
                  onClick={() => setShowAdminDescription(!showAdminDescription)}
                  className="ml-4 px-4 py-2 text-sm bg-gradient-to-r from-champagne-contrast/10 to-champagne-contrast/20 hover:from-champagne-contrast/20 hover:to-champagne-contrast/30 text-champagne-contrast border border-champagne-contrast/30 rounded-lg transition-all duration-300 flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-300 ${
                      showAdminDescription ? "rotate-90" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Ürün Detayı
                </button>
              )}
            </div>

            {/* Admin Açıklama İçeriği - Tıklanınca göster */}
            {showAdminDescription && isPreOrder && hasAdminDescription && (
              <div className="mt-4 p-6 bg-gradient-to-br from-white via-champagne-contrast/5 to-champagne-contrast/10 border border-champagne-contrast/20 rounded-xl text-sm text-gray-700 leading-relaxed shadow-lg backdrop-blur-sm animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-champagne-contrast/20 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-champagne-contrast"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-champagne-contrast mb-2 text-base">
                      Ürün Detayları
                    </h4>
                    {hasAdminDescription && (
                      <div className="text-gray-700 font-light leading-relaxed">
                        {product.admin_description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-8">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={
                product.stock_status === "out_of_stock" && !product.pre_order
              }
              className="flex-1 bg-champagne-contrast text-black px-6 py-4 rounded-md font-medium shadow-md hover:bg-champagne-contrast/90 transition-transform transform duration-200 ease-out hover:-translate-y-1 hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <FiShoppingBag />
              Sepete Ekle
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
      {showSizeRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-xl font-semibold text-gray-900">
                Özel Beden Talep Formu
              </h3>
              <button
                onClick={() => {
                  setShowSizeRequest(false);
                  setSizeRequestStatus("idle");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-3 text-sm text-gray-700">
              <p>
                Bazı modellerimizde XS, M ve L bedenleri özel üretim
                kapsamındadır. Uygunluk ve süreç bilgisi için talebinizi
                bırakabilirsiniz.
              </p>
              <form className="space-y-4" onSubmit={handleSizeRequestSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">
                      Ad Soyad <span className="text-red-500">(zorunlu)</span>
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-champagne-contrast/40"
                      value={sizeRequest.name}
                      onChange={(e) =>
                        setSizeRequest((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">
                      E-posta Adresi{" "}
                      <span className="text-red-500">(zorunlu)</span>
                    </label>
                    <input
                      required
                      type="email"
                      className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-champagne-contrast/40"
                      value={sizeRequest.email}
                      onChange={(e) =>
                        setSizeRequest((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">
                      Telefon Numarası{" "}
                      <span className="text-gray-400">(opsiyonel)</span>
                    </label>
                    <input
                      type="tel"
                      className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-champagne-contrast/40"
                      value={sizeRequest.phone}
                      onChange={(e) =>
                        setSizeRequest((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Ürün Adı</label>
                    <input
                      type="text"
                      className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-champagne-contrast/40"
                      value={sizeRequest.productName}
                      onChange={(e) =>
                        setSizeRequest((prev) => ({
                          ...prev,
                          productName: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs text-gray-600">
                    Talep Edilen Beden
                  </span>
                  <div className="flex gap-3">
                    {specialSizes.map((size) => (
                      <label
                        key={size}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <input
                          type="radio"
                          name="special-size"
                          value={size}
                          checked={sizeRequest.size === size}
                          onChange={(e) =>
                            setSizeRequest((prev) => ({
                              ...prev,
                              size: e.target.value,
                            }))
                          }
                        />
                        {size}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-600">
                    Notunuz <span className="text-gray-400">(opsiyonel)</span>
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-champagne-contrast/40"
                    placeholder="Boy / kilo bilgisi, kullanım tarihi veya özel bir talep ekleyebilirsiniz."
                    value={sizeRequest.note}
                    onChange={(e) =>
                      setSizeRequest((prev) => ({
                        ...prev,
                        note: e.target.value,
                      }))
                    }
                  />
                </div>

                <label className="flex items-start gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={sizeRequest.consent}
                    onChange={(e) =>
                      setSizeRequest((prev) => ({
                        ...prev,
                        consent: e.target.checked,
                      }))
                    }
                    required
                  />
                  <span>
                    XS, M ve L bedenlerin özel üretim kapsamında olduğunu ve
                    teslim süresinin standart ürünlerden farklı olabileceğini
                    kabul ediyorum.
                  </span>
                </label>

                <button
                  type="submit"
                  className="w-full bg-[#b6906c] text-white py-3 rounded-md font-semibold hover:opacity-90 transition disabled:opacity-70"
                  disabled={sizeRequestStatus === "success"}
                >
                  {sizeRequestStatus === "success"
                    ? "Talep Alındı"
                    : "Talep Oluştur"}
                </button>

                {sizeRequestStatus === "error" && (
                  <p className="text-[11px] text-red-600 text-center">
                    Talep kaydedilemedi, lütfen tekrar deneyin.
                  </p>
                )}

                <p className="text-[11px] text-gray-500 text-center">
                  Özel üretim talepleri için ek süre gerekebilir. Talebiniz
                  incelendikten sonra sizinle iletişime geçilecektir.
                </p>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
