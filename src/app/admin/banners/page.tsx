"use client";

import { useEffect, useState } from "react";
import { HiPlus, HiPencil, HiTrash } from "react-icons/hi";

interface Banner {
  id: number;
  title: string;
  image_url: string | null;
  link_url?: string | null;
  description?: string | null;
  position?: string;
  display_order?: number;
  is_active?: number;
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState<{
    type: "success" | "error" | "";
    text: string;
  }>({ type: "", text: "" });
  const [form, setForm] = useState<any>({
    title: "",
    imageFile: null,
    image_url: "",
    link_url: "",
    description: "",
    position: "home",
    display_order: 0,
    is_active: 1,
    valid_from: "",
    valid_until: "",
  });

  const fetchBanners = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) return;
      const res = await fetch("/api/admin/banners", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: "",
      imageFile: null,
      image_url: "",
      link_url: "",
      description: "",
      position: "home",
      display_order: 0,
      is_active: 1,
      valid_from: "",
      valid_until: "",
    });
    setShowModal(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({ ...b, imageFile: null, remove_image: false });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu bannerı silmek istediğinize emin misiniz?")) return;
    const token = localStorage.getItem("adminToken");
    const res = await fetch(`/api/admin/banners/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) fetchBanners();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast({ type: "", text: "" });
    setUploadProgress(0);

    const token = localStorage.getItem("adminToken");
    const fd = new FormData();
    fd.append("title", form.title || "");
    fd.append("link_url", form.link_url || "");
    fd.append("description", form.description || "");
    fd.append("position", form.position || "home");
    fd.append("display_order", String(form.display_order || 0));
    fd.append("is_active", form.is_active ? "1" : "0");
    if (form.valid_from) fd.append("valid_from", form.valid_from);
    if (form.valid_until) fd.append("valid_until", form.valid_until);
    if (form.imageFile) fd.append("image", form.imageFile);
    if (form.remove_image) fd.append("remove_image", "1");

    try {
      const method = editing ? "PUT" : "POST";
      const url = editing
        ? `/api/admin/banners/${editing.id}`
        : "/api/admin/banners";

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setToast({ type: "success", text: "Banner başarıyla kaydedildi" });
            setShowModal(false);
            fetchBanners();
            resolve();
          } else {
            setToast({
              type: "error",
              text: "Banner kaydedilirken hata oluştu",
            });
            reject(new Error("save-failed"));
          }
        };

        xhr.onerror = () => {
          setToast({ type: "error", text: "Sunucu hatası" });
          reject(new Error("network-error"));
        };

        xhr.send(fd);
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Banner Yönetimi</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded"
        >
          <HiPlus /> Yeni Banner
        </button>
      </div>

      {toast.text && (
        <div
          className={`p-3 rounded ${
            toast.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Görsel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Başlık
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pozisyon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sıra
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {banners.map((b) => (
                <tr key={b.id}>
                  <td className="px-6 py-4">
                    <img
                      src={b.image_url || ""}
                      className="h-16 object-contain"
                      alt="banner"
                    />
                  </td>
                  <td className="px-6 py-4">{b.title}</td>
                  <td className="px-6 py-4">{b.position}</td>
                  <td className="px-6 py-4">{b.display_order}</td>
                  <td className="px-6 py-4">
                    {b.is_active ? "Aktif" : "Pasif"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(b)}
                        className="text-blue-600"
                      >
                        <HiPencil />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="text-red-600"
                      >
                        <HiTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">
              {editing ? "Banner Düzenle" : "Yeni Banner"}
            </h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Başlık</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border px-3 py-2 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Görsel</label>
                {form.image_url && !form.imageFile && (
                  <img
                    src={form.image_url}
                    className="h-32 object-contain mb-2"
                    alt="preview"
                  />
                )}
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setForm({
                        ...form,
                        imageFile: e.target.files?.[0] || null,
                        remove_image: false,
                      })
                    }
                  />
                  {editing && form.image_url && !form.imageFile && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, image_url: "", remove_image: true })
                      }
                      className="px-3 py-1 border rounded text-sm text-red-600"
                    >
                      Görseli Kaldır
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Link</label>
                  <input
                    value={form.link_url}
                    onChange={(e) =>
                      setForm({ ...form, link_url: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Sıra</label>
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        display_order: Number(e.target.value),
                      })
                    }
                    className="w-full border px-3 py-2 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Açıklama</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full border px-3 py-2 rounded"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded"
                >
                  İptal
                </button>
                <div className="flex items-center gap-3">
                  {uploadProgress > 0 && (
                    <div className="w-40">
                      <div className="h-2 bg-gray-100 rounded">
                        <div
                          className="h-2 bg-blue-600 rounded"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {uploadProgress}%
                      </div>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
