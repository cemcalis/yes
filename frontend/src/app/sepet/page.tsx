"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import MostLikedProducts from "@/components/MostLikedProducts";
import { useState } from "react";
import { Plus, Minus, Trash2, ShoppingBag } from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, total, loading, removeFromCart, clearCart, updateQuantity } =
    useCart();
  const [updatingItems, setUpdatingItems] = useState<number[]>([]);

  const handleQuantityChange = async (productId: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    setUpdatingItems((prev) => [...prev, productId]);
    try {
      await updateQuantity(productId, newQuantity);
    } catch (error) {
      console.error("Quantity update error:", error);
    } finally {
      setUpdatingItems((prev) => prev.filter((id) => id !== productId));
    }
  };

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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Sepetim</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-4 border border-border rounded-lg"
            >
              <div className="flex-grow">
                <h3 className="font-medium">{item.name}</h3>
                <p>Fiyat: {item.price.toLocaleString("tr-TR")} TL</p>
                <div className="flex items-center gap-2 mt-2">
                  <span>Adet:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        handleQuantityChange(item.product_id, item.quantity - 1)
                      }
                      disabled={updatingItems.includes(item.product_id)}
                      className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() =>
                        handleQuantityChange(item.product_id, item.quantity + 1)
                      }
                      disabled={updatingItems.includes(item.product_id)}
                      className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {item.size && <p>Beden: {item.size}</p>}
                {item.color && <p>Renk: {item.color}</p>}
              </div>
              <button
                onClick={() => removeFromCart(item.product_id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Sipariş Özeti</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Toplam:</span>
                <span className="font-bold">
                  {total.toLocaleString("tr-TR")} TL
                </span>
              </div>
            </div>
            <button
              onClick={() => router.push("/odeme")}
              className="w-full bg-gray-900 text-white py-3 rounded-md hover:bg-gray-800 transition-colors mt-4 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Ödemeye Geç
            </button>
            <button
              onClick={clearCart}
              className="w-full border border-gray-300 py-2 rounded-md hover:bg-gray-50 transition-colors mt-2"
            >
              Sepeti Temizle
            </button>
          </div>

          {/* Most Liked Products */}
          <MostLikedProducts />
        </div>
      </div>

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
          <button
            onClick={() => router.push("/odeme")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Ödemeye Geç
          </button>
        </div>
      </div>
    </div>
  );
}
