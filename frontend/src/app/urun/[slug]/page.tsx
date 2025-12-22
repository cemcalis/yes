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
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [showSizeRequest, setShowSizeRequest] = useState(false);
  const [sizeRequest, setSizeRequest] = useState({
    name: "",
    email: "",
    phone: "",
    productName: "",
    size: "",
    note: "",
    consent: false,
  });
  const [sizeRequestStatus, setSizeRequestStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

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
    try {
      await addToCart(product.id, {
        variant_id: undefined, // şimdilik variant yok
        quantity,
        price: product.price,
        name: product.name,
        image_url: product.image_url,
        size: selectedSize,
      });

      // Simple feedback for now
      alert("Ürün sepete eklendi");
    } catch (err) {
      console.error("Sepete eklenirken hata:", err);
      alert("Sepete eklenemedi. Lütfen tekrar deneyin.");
    }
  };

  const handlePreOrder = async () => {
    try {
      // Ön sipariş için ödeme olmadan sipariş oluştur
      const orderData = {
        customer_name: user?.name || "Misafir Kullanıcı",
        customer_email: user?.email || "misafir@example.com",
        customer_phone: user?.phone || "",
        customer_address: user?.address || "",
        items: [
          {
            product_id: product.id,
            variant_id: undefined,
            quantity,
            price: product.price,
          },
        ],
        total: product.price * quantity,
        is_preorder: true,
        status: "pending",
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(((user as any)?.token && {
            Authorization: `Bearer ${(user as any).token}`,
          }) ||
            {}),
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Ön siparişiniz oluşturuldu! Sipariş No: ${data.order_id}`);
      } else {
        throw new Error("Ön sipariş oluşturulamadı");
      }
    } catch (err) {
      console.error("Ön sipariş hatası:", err);
      alert("Ön sipariş oluşturulamadı. Lütfen tekrar deneyin.");
    }
  };

  const discount = product.compare_price
    ? Math.round(
        ((product.compare_price - product.price) / product.compare_price) * 100
      )
    : 0;

  const allImages =
    product.images.length > 0 ? product.images : [product.image_url];

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
              <div className="flex gap-2 flex-wrap">
                {product.variants.map((variant) => {
                  const isSpecial =
                    specialSizes.includes(variant.size?.toUpperCase?.() || "") &&
                    variant.stock === 0;
                  const isDisabled = variant.stock === 0 || isSpecial;
                  return (
                    <button
                      key={variant.id}
                      onClick={() => !isDisabled && setSelectedSize(variant.size)}
                      disabled={isDisabled}
                      className={`px-4 py-2 border rounded-md transition-colors font-semibold ${
                        selectedSize === variant.size
                          ? "border-champagne-contrast/60 hover:border-champagne-contrast/80 text-champagne-contrast bg-white shadow-sm ring-1 ring-champagne-contrast/30"
                          : isDisabled
                          ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "border-gray-300 hover:border-champagne-contrast/60 text-gray-900 bg-white"
                      }`}
                    >
                      {variant.size}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 text-xs text-gray-500 leading-relaxed">
                XS, M ve L bedeni özel üretimle hazırlanmaktadır.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setShowSizeRequest(true);
                    setSizeRequest((prev) => ({
                      ...prev,
                      size: prev.size || "XS",
                    }));
                  }}
                  className="underline underline-offset-2 text-gray-600 hover:text-gray-800"
                >
                  Beden talebi oluşturabilirsiniz.
                </button>
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
            {product.pre_order ? (
              <button
                onClick={handlePreOrder}
                className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-md font-medium shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <FiShoppingBag />
                Ön Sipariş Ver
              </button>
            ) : (
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
            )}
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
                Bazı modellerimizde XS, M ve L bedenleri özel üretim kapsamında
                hazırlanmaktadır. Uygunluk ve süreç bilgisi için talebinizi
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
                      Telefon Numarası <span className="text-gray-400">(opsiyonel)</span>
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
                  <span className="text-xs text-gray-600">Talep Edilen Beden</span>
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
                    XS, M ve L bedenlerin özel üretim kapsamında olduğunu ve teslim
                    süresinin standart ürünlerden farklı olabileceğini kabul ediyorum.
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
                  Özel üretim talepleri için ek süre gerekebilir. Talebiniz incelendikten
                  sonra sizinle iletişime geçilecektir.
                </p>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
