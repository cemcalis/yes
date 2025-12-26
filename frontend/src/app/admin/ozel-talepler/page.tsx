"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";

interface SizeRequest {
  id: number;
  name: string;
  email: string;
  phone?: string;
  product_name?: string;
  size: string;
  note?: string;
  consent: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function OzelTaleplerPage() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<SizeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("adminToken");

      const response = await fetch("/api/size-requests", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.data || []);
      } else {
        showToast("Talepler yüklenemedi", "error");
      }
    } catch (error) {
      console.error("Error fetching size requests:", error);
      showToast("Bir hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/size-requests/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        showToast("Durum güncellendi", "success");
        fetchRequests(); // Listeyi yenile
      } else {
        showToast("Durum güncellenemedi", "error");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      showToast("Bir hata oluştu", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteRequest = async (id: number) => {
    if (!confirm("Bu talebi silmek istediğinizden emin misiniz?")) return;

    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/size-requests/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        showToast("Talep silindi", "success");
        fetchRequests(); // Listeyi yenile
      } else {
        showToast("Talep silinemedi", "error");
      }
    } catch (error) {
      console.error("Error deleting request:", error);
      showToast("Bir hata oluştu", "error");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Beklemede";
      case "processing":
        return "İşleniyor";
      case "completed":
        return "Tamamlandı";
      case "cancelled":
        return "İptal Edildi";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded mb-4 w-1/4" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Özel Beden Talepleri</h1>
        <div className="text-sm text-foreground/60">
          Toplam {requests.length} talep
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-foreground/60 mb-4">Henüz talep bulunmuyor</div>
          <div className="text-sm text-foreground/40">
            Müşterilerin özel beden talepleri burada görünecek
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="border border-border rounded-lg p-6 bg-white"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{request.name}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {getStatusText(request.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-foreground/60">E-posta:</span>
                      <span className="ml-2">{request.email}</span>
                    </div>
                    {request.phone && (
                      <div>
                        <span className="text-foreground/60">Telefon:</span>
                        <span className="ml-2">{request.phone}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-foreground/60">Ürün:</span>
                      <span className="ml-2">
                        {request.product_name || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-foreground/60">Beden:</span>
                      <span className="ml-2 font-medium">{request.size}</span>
                    </div>
                  </div>

                  {request.note && (
                    <div className="mt-3">
                      <span className="text-foreground/60 text-sm">Not:</span>
                      <p className="mt-1 text-sm bg-gray-50 p-3 rounded">
                        {request.note}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-foreground/40">
                    {new Date(request.created_at).toLocaleString("tr-TR")}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <select
                    value={request.status}
                    onChange={(e) => updateStatus(request.id, e.target.value)}
                    disabled={updatingId === request.id}
                    className="px-3 py-1 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="pending">Beklemede</option>
                    <option value="processing">İşleniyor</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="cancelled">İptal Edildi</option>
                  </select>

                  <button
                    onClick={() => deleteRequest(request.id)}
                    className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-sm hover:bg-red-100 transition-colors"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
