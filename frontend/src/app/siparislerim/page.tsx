'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { FiPackage, FiClock, FiCheckCircle, FiTruck } from 'react-icons/fi';
import { api } from '@/lib/api';

interface Order {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/giris?redirect=/siparislerim');
      return;
    }

    if (user && token) {
      fetchOrders();
    }
  }, [user, token, isLoading, router]);

  const fetchOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (error) {
      console.error('Siparişler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <FiClock className="text-yellow-500" size={20} />;
      case 'processing':
        return <FiPackage className="text-blue-500" size={20} />;
      case 'shipped':
        return <FiTruck className="text-purple-500" size={20} />;
      case 'delivered':
        return <FiCheckCircle className="text-green-500" size={20} />;
      default:
        return <FiPackage className="text-gray-500" size={20} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Beklemede';
      case 'processing':
        return 'Hazırlanıyor';
      case 'shipped':
        return 'Kargoda';
      case 'delivered':
        return 'Teslim Edildi';
      default:
        return status;
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Siparişlerim</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <FiPackage size={64} className="mx-auto mb-4 text-foreground/30" />
          <h2 className="text-2xl font-bold mb-4">Henüz Siparişiniz Yok</h2>
          <p className="text-foreground/60 mb-8">
            İlk siparişinizi vererek alışverişe başlayın!
          </p>
          <Link
            href="/"
            className="inline-block bg-primary text-white px-8 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            Alışverişe Başla
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(order.status)}
                    <span className="font-medium">{getStatusText(order.status)}</span>
                  </div>
                  <p className="text-sm text-foreground/60">
                    Sipariş No: <span className="font-medium">#{order.id}</span>
                  </p>
                  <p className="text-sm text-foreground/60">
                    Tarih: {new Date(order.created_at).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {order.total_amount.toLocaleString('tr-TR')} TL
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm text-foreground/60 mb-1">
                  <span className="font-medium">Teslimat Adresi:</span>
                </p>
                <p className="text-sm">{order.shipping_address}</p>
              </div>

              <div className="mt-4 flex gap-3">
                <Link
                  href={`/siparis/${order.id}`}
                  className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Detayları Görüntüle
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
