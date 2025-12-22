"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { api } from "@/lib/api";

interface CartItem {
  id: number;
  product_id: number;
  variant_id?: number;
  quantity: number;
  price: number;
  name: string;
  image_url: string;
  size?: string;
  color?: string;
}

interface CartContextType {
  items: CartItem[];
  total: number;
  loading: boolean;
  sessionId: string | null;
  itemCount: number;
  addToCart: (
    productId: number,
    data: {
      variant_id?: number;
      quantity: number;
      price: number;
      name: string;
      image_url: string;
      size?: string;
      color?: string;
    }
  ) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      let currentSessionId = localStorage.getItem("sessionId");

      if (!currentSessionId) {
        try {
        const response = await api.createSession();
        currentSessionId = response.sessionId;
        if (currentSessionId) {
          localStorage.setItem("sessionId", currentSessionId);
        }
      } catch (error) {
        console.error("Session olusturulamadi:", error);
        return;
      }
      }

      setSessionId(currentSessionId);
    };

    initSession();
  }, []);

  // Load cart when session is ready
  useEffect(() => {
    if (sessionId) {
      refreshCart();
    }
  }, [sessionId]);

  const refreshCart = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const cartData = await api.getCart(sessionId);
      setItems(cartData.items || []);
      setTotal(cartData.total || 0);
    } catch (error) {
      console.error("Sepet yuklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (
    productId: number,
    data: {
      variant_id?: number;
      quantity: number;
      price: number;
      name: string;
      image_url: string;
      size?: string;
      color?: string;
    }
  ) => {
    if (!sessionId) {
      throw new Error("Session bulunamadi");
    }

    try {
      setLoading(true);
      const cartData = await api.addToCart(sessionId, {
        product_id: productId,
        ...data,
      });
      setItems(cartData.items || []);
      setTotal(cartData.total || 0);
    } catch (error) {
      console.error("Sepete eklenirken hata:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId: number, quantity: number) => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const cartData = await api.updateCartItem(sessionId, {
        product_id: productId,
        quantity,
      });
      setItems(cartData.items || []);
      setTotal(cartData.total || 0);
    } catch (error) {
      console.error("Sepet guncellenirken hata:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId: number) => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const cartData = await api.removeFromCart(sessionId, productId);
      setItems(cartData.items || []);
      setTotal(cartData.total || 0);
    } catch (error) {
      console.error("Sepetten cikarilirken hata:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      await api.clearCart(sessionId);
      setItems([]);
      setTotal(0);
    } catch (error) {
      console.error("Sepet temizlenirken hata:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  const value: CartContextType = {
    items,
    total,
    loading,
    sessionId,
    itemCount,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
