"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { user } = useAuth();
  const { items, total, loading, removeFromCart, clearCart, updateQuantity } =
    useCart();
  const router = useRouter();
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [topFavorites, setTopFavorites] = useState<
    Array<{ product_id: number; cnt: number; name: string; image_url: string }>
  >([]);
  const [guestForm, setGuestForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [formError, setFormError] = useState("");

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Sepet yükleniyor...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Sepetiniz Boş</h1>
        <p className="text-foreground/60 mb-8">
          Henüz sepetinize ürün eklemediniz.
        </p>
      </div>
    );
  }

  const handleGuestFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setGuestForm({ ...guestForm, [e.target.name]: e.target.value });
  };

  const handleGuestFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    // Basit validasyon
    if (
      !guestForm.name ||
      !guestForm.email ||
      !guestForm.phone ||
      !guestForm.address
    ) {
      setFormError("Lütfen tüm alanları doldurun.");
      return;
    }
    // Bilgileri localStorage'a kaydet (ödeme sayfasında guest için doldurmak için)
    localStorage.setItem("guest_checkout", JSON.stringify(guestForm));
    router.push("/odeme");
  };

  // Load most liked products
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/analytics/top-favorites");
        if (!res.ok) return;
        const json = await res.json();
        if (mounted && json && json.data) setTopFavorites(json.data);
      } catch (err) {
        console.error("Top favorites fetch error:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Sepetim</h1>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex gap-4 p-4 border border-border rounded-lg"
          >
            <div className="grow">
              <h3 className="font-medium">{item.name}</h3>
              <p>Fiyat: {item.price.toLocaleString("tr-TR")} TL</p>
              <p>
                Adet:
                <span className="inline-flex items-center ml-2">
                  <button
                    onClick={() =>
                      updateQuantity(
                        item.product_id,
                        Math.max(1, item.quantity - 1)
                      )
                    }
                    className="px-2 py-1 bg-gray-200 rounded-l hover:bg-gray-300"
                  >
                    -
                  </button>
                  <span className="px-3 border-t border-b">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(item.product_id, item.quantity + 1)
                    }
                    className="px-2 py-1 bg-gray-200 rounded-r hover:bg-gray-300"
                  >
                    +
                  </button>
                </span>
              </p>
              {item.size && <p>Beden: {item.size}</p>}
              {item.color && <p>Renk: {item.color}</p>}
            </div>
            <button
              onClick={() => removeFromCart(item.product_id)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Kaldır
            </button>
          </div>
        ))}
      </div>

      {/* Most Liked block */}
      {topFavorites.length > 0 && (
        <div className="mt-8 p-4 bg-white border border-border rounded-lg">
          <h2 className="text-lg font-semibold mb-3">En Çok Beğenilenler</h2>
          <div className="grid grid-cols-2 gap-3">
            {topFavorites.map((p) => (
              <a
                key={p.product_id}
                href={`/urun/${p.name
                  ?.toString()
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded"
              >
                <img
                  src={p.image_url || "/placeholder.png"}
                  alt={p.name}
                  className="w-12 h-12 object-cover rounded"
                />
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-foreground/60">
                    {p.cnt} beğeni
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 p-6 bg-card border border-border rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold">Toplam:</span>
          <span className="text-xl font-bold">
            {total.toLocaleString("tr-TR")} TL
          </span>
        </div>
        <div className="flex gap-4">
          <button
            onClick={clearCart}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Sepeti Boşalt
          </button>
          {user ? (
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              onClick={() => router.push("/odeme")}
            >
              Ödemeye Geç
            </button>
          ) : (
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              onClick={() => setShowGuestForm(true)}
            >
              Ödemeye Geç
            </button>
          )}
        </div>
      </div>

      {/* Guest checkout form */}
      {showGuestForm && !user && (
        <div className="mt-8 p-6 bg-white border border-border rounded-lg max-w-lg mx-auto">
          <h2 className="text-xl font-bold mb-4">Bilgilerinizi Girin</h2>
          {formError && <div className="text-red-600 mb-2">{formError}</div>}
          <form onSubmit={handleGuestFormSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">Ad Soyad</label>
              <input
                type="text"
                name="name"
                value={guestForm.name}
                onChange={handleGuestFormChange}
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-1">E-posta</label>
              <input
                type="email"
                name="email"
                value={guestForm.email}
                onChange={handleGuestFormChange}
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Telefon</label>
              <input
                type="tel"
                name="phone"
                value={guestForm.phone}
                onChange={handleGuestFormChange}
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Adres</label>
              <textarea
                name="address"
                value={guestForm.address}
                onChange={handleGuestFormChange}
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-white py-2 rounded font-medium"
            >
              Devam Et ve Ödemeye Geç
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
