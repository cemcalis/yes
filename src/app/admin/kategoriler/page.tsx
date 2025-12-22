"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HiPlus, HiPencil, HiTrash } from "react-icons/hi";

interface Category {
  id: number;
  name: string;
  created_at: string;
  image_url?: string | null;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    image_url: "",
  });
  const [removeImage, setRemoveImage] = useState(false);
  const router = useRouter();

  const fetchCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");

      if (!token) {
        router.push("/admin/giris");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/categories", {
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
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("adminToken");
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : "/api/admin/categories";
      const method = editingCategory ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          image_url: formData.image_url,
          remove_image: removeImage && !!editingCategory,
        }),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingCategory(null);
        resetForm();
        fetchCategories();
      }
    } catch (error) {
      console.error("Error saving category:", error);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      image_url: category.image_url || "",
    });
    setRemoveImage(false);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) return;

    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchCategories();
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      image_url: "",
    });
  };

  const openAddModal = () => {
    setEditingCategory(null);
    resetForm();
    setShowModal(true);
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
        <h1 className="text-3xl font-bold text-gray-900">Kategori Yönetimi</h1>
        <button
          onClick={openAddModal}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <HiPlus className="w-5 h-5 mr-2" />
          Yeni Kategori
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategori Adı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Oluşturulma Tarihi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {category.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(category.created_at).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <HiPencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <HiTrash className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {editingCategory ? "Kategori Düzenle" : "Yeni Kategori"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori Adı
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori Görseli
                </label>
                {formData.image_url && (
                  <div className="mb-2">
                    <img
                      src={formData.image_url}
                      alt="preview"
                      className="h-24 object-contain"
                    />
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((p) => ({ ...p, image_url: "" }));
                          setRemoveImage(true);
                        }}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Görseli Kaldır
                      </button>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,image/svg+xml"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const token = localStorage.getItem("adminToken");
                      const fd = new FormData();
                      fd.append("file", file);
                      const res = await fetch("/api/admin/upload", {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${token}`,
                        } as any,
                        body: fd,
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setFormData((prev) => ({
                          ...prev,
                          image_url: data.url,
                        }));
                        setRemoveImage(false);
                      } else {
                        console.error("Upload failed");
                      }
                    } catch (err) {
                      console.error("Upload error", err);
                    }
                  }}
                  className="w-full"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingCategory ? "Güncelle" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
