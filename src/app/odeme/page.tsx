"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { api } from "@/lib/api";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardData, setCardData] = useState({
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Guest checkout için localStorage'dan bilgileri doldur
    if (!user) {
      const guest =
        typeof window !== "undefined"
          ? localStorage.getItem("guest_checkout")
          : null;
      if (guest) {
        try {
          const guestData = JSON.parse(guest);
          setFormData({
            name: guestData.name || "",
            email: guestData.email || "",
            phone: guestData.phone || "",
            address: guestData.address || "",
          });
        } catch {}
      }
    } else {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
      });
    }
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Kart numarası formatı (16 hane, 4'lü gruplar)
    if (e.target.name === "cardNumber") {
      value = value
        .replace(/\s/g, "")
        .replace(/(\d{4})/g, "$1 ")
        .trim();
      if (value.length > 19) return;
    }

    // Son kullanma tarihi formatı (MM/YY)
    if (e.target.name === "expiryDate") {
      value = value.replace(/\D/g, "");
      if (value.length >= 2) {
        value = value.slice(0, 2) + "/" + value.slice(2, 4);
      }
      if (value.length > 5) return;
    }

    // CVV formatı (3-4 hane)
    if (e.target.name === "cvv") {
      value = value.replace(/\D/g, "");
      if (value.length > 4) return;
    }

    setCardData({
      ...cardData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // Demo sepet - gerçek uygulamada context'ten gelecek
      const cartItems = [
        {
          product_id: 1,
          variant_id: null,
          quantity: 1,
          price: 1250,
        },
      ];

      const data = await api.createOrder({
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: formData.phone,
        shipping_address: formData.address,
        items: cartItems,
        total_amount: 1299.9,
      });
      router.push(`/siparis-basarili?order_id=${data.order_id}`);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Ödeme</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div className="bg-white border border-border rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Teslimat Bilgileri</h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium mb-2"
                  >
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium mb-2"
                  >
                    E-posta *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium mb-2"
                  >
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className="block text-sm font-medium mb-2"
                  >
                    Teslimat Adresi *
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-border rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Ödeme Yöntemi</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border border-border rounded-md cursor-pointer hover:bg-muted transition-colors">
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span className="font-medium">Kredi/Banka Kartı</span>
                </label>
                <label className="flex items-center gap-3 p-4 border border-border rounded-md cursor-pointer hover:bg-muted transition-colors">
                  <input
                    type="radio"
                    name="payment"
                    value="transfer"
                    checked={paymentMethod === "transfer"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span className="font-medium">Havale/EFT</span>
                </label>
                <label className="flex items-center gap-3 p-4 border border-border rounded-md cursor-pointer hover:bg-muted transition-colors">
                  <input
                    type="radio"
                    name="payment"
                    value="door"
                    checked={paymentMethod === "door"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span className="font-medium">Kapıda Ödeme</span>
                </label>
              </div>
            </div>

            {/* Kart Bilgileri - Sadece kart ödemesi seçiliyse göster */}
            {paymentMethod === "card" && (
              <div className="bg-white border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Kart Bilgileri</h2>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="cardNumber"
                      className="block text-sm font-medium mb-2"
                    >
                      Kart Numarası *
                    </label>
                    <input
                      type="text"
                      id="cardNumber"
                      name="cardNumber"
                      value={cardData.cardNumber}
                      onChange={handleCardChange}
                      placeholder="1234 5678 9012 3456"
                      required={paymentMethod === "card"}
                      className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="cardName"
                      className="block text-sm font-medium mb-2"
                    >
                      Kart Üzerindeki İsim *
                    </label>
                    <input
                      type="text"
                      id="cardName"
                      name="cardName"
                      value={cardData.cardName}
                      onChange={handleCardChange}
                      placeholder="AD SOYAD"
                      required={paymentMethod === "card"}
                      className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="expiryDate"
                        className="block text-sm font-medium mb-2"
                      >
                        Son Kullanma Tarihi *
                      </label>
                      <input
                        type="text"
                        id="expiryDate"
                        name="expiryDate"
                        value={cardData.expiryDate}
                        onChange={handleCardChange}
                        placeholder="MM/YY"
                        required={paymentMethod === "card"}
                        className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="cvv"
                        className="block text-sm font-medium mb-2"
                      >
                        CVV *
                      </label>
                      <input
                        type="text"
                        id="cvv"
                        name="cvv"
                        value={cardData.cvv}
                        onChange={handleCardChange}
                        placeholder="123"
                        required={paymentMethod === "card"}
                        className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-md">
                    <p className="text-sm text-foreground/60">
                      🔒 Ödeme bilgileriniz SSL ile şifrelenir ve güvenli bir
                      şekilde işlenir.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-white py-4 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Sipariş Oluşturuluyor..." : "Siparişi Tamamla"}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div>
          <div className="border border-border rounded-lg p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4">Sipariş Özeti</h2>

            <div className="space-y-3 mb-4 pb-4 border-b border-border">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">Ara Toplam</span>
                <span className="font-medium">1.250,00 TL</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">Kargo</span>
                <span className="font-medium">49,90 TL</span>
              </div>
            </div>

            <div className="flex justify-between text-lg font-bold mb-4">
              <span>Toplam</span>
              <span>1.299,90 TL</span>
            </div>

            <Link
              href="/sepet"
              className="block w-full text-center px-6 py-3 rounded-md font-medium border border-border hover:bg-muted transition-colors"
            >
              Sepete Dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
