"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HiEye, HiCheck, HiX, HiTruck } from "react-icons/hi";

interface Order {
  id: number;
  user_id: number;
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  created_at: string;
  customerName: string;
  customerEmail: string;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const router = useRouter();

  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");

      if (!token) {
        router.push("/admin/giris");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("adminToken");
        router.push("/admin/giris");
        setLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setOrders(data.data.orders);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus as any });
        }
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const viewOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrderDetails(data.data);
      } else {
        // Fallback to mock data if API fails
        setOrderDetails({
          id: order.id,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          total: order.total,
          status: order.status,
          created_at: order.created_at,
          items: [],
        });
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      // Fallback to mock data
      setOrderDetails({
        id: order.id,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        total: order.total,
        status: order.status,
        created_at: order.created_at,
        items: [],
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
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
        return "Bekliyor";
      case "processing":
        return "İşleniyor";
      case "shipped":
        return "Kargoda";
      case "delivered":
        return "Teslim Edildi";
      case "cancelled":
        return "İptal Edildi";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Sipariş Yönetimi</h1>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sipariş ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Müşteri
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tutar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{order.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {order.customerName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.customerEmail}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₺{order.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewOrderDetails(order)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <HiEye className="w-5 h-5" />
                      </button>
                      {order.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              updateOrderStatus(order.id, "processing")
                            }
                            className="text-green-600 hover:text-green-900"
                          >
                            <HiCheck className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() =>
                              updateOrderStatus(order.id, "cancelled")
                            }
                            className="text-red-600 hover:text-red-900"
                          >
                            <HiX className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {order.status === "processing" && (
                        <button
                          onClick={() => updateOrderStatus(order.id, "shipped")}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          <HiTruck className="w-5 h-5" />
                        </button>
                      )}
                      {order.status === "shipped" && (
                        <button
                          onClick={() =>
                            updateOrderStatus(order.id, "delivered")
                          }
                          className="text-green-600 hover:text-green-900"
                        >
                          <HiCheck className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && orderDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Sipariş Detayları</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Sipariş ID</p>
                <p className="font-medium">#{orderDetails.id}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Müşteri</p>
                <p className="font-medium">{orderDetails.customerName}</p>
                <p className="text-sm text-gray-500">
                  {orderDetails.customerEmail}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Durum</p>
                <span
                  className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(
                    orderDetails.status
                  )}`}
                >
                  {getStatusText(orderDetails.status)}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-600">Tarih</p>
                <p className="font-medium">
                  {new Date(orderDetails.created_at).toLocaleDateString(
                    "tr-TR"
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Ürünler</p>
                <div className="mt-2 space-y-2">
                  {orderDetails.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.name} x{item.quantity}
                      </span>
                      <span>₺{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-semibold">
                  <span>Toplam</span>
                  <span>₺{orderDetails.total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
