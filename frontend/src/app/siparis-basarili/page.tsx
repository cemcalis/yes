"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiCheckCircle, FiPackage } from "react-icons/fi";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get("order_id");

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-6">
          <FiCheckCircle size={80} className="mx-auto text-green-500" />
        </div>

        <h1 className="text-3xl font-bold mb-4">Siparişiniz Alındı!</h1>

        <p className="text-foreground/60 mb-2">
          Siparişiniz başarıyla oluşturuldu.
        </p>

        {orderId && (
          <p className="text-lg font-medium mb-8">
            Sipariş Numarası: <span className="text-primary">#{orderId}</span>
          </p>
        )}

        <div className="bg-accent/20 border border-border rounded-lg p-6 mb-8 text-left">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <FiPackage size={20} />
            Sonraki Adımlar
          </h2>
          <ul className="space-y-2 text-sm text-foreground/80">
            <li>✓ Sipariş onay e-postası gönderildi</li>
            <li>✓ Siparişiniz hazırlanıyor</li>
            <li>✓ Kargoya verildiğinde bilgilendirileceksiniz</li>
            <li>✓ Tahmini teslimat süresi: 2-4 iş günü</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/siparislerim"
            className="px-8 py-3 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            Siparişlerimi Görüntüle
          </Link>
          <Link
            href="/"
            className="px-8 py-3 border border-border rounded-md font-medium hover:bg-muted transition-colors"
          >
            Alışverişe Devam Et
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16 text-center">
          <p>Yükleniyor...</p>
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
