"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HiPlus, HiPencil, HiTrash, HiSearch } from "react-icons/hi";

interface Product {
  id: number;
  name: string;
  description: string;
  admin_description?: string;
  price: number;
  compare_price?: number;
  image: string;
  images?: string;
  category_id: number;
  stock: number;
  pre_order?: boolean;
  sizes?: string;
  colors?: string;
  is_featured: boolean;
  is_new: boolean;
  is_active: boolean;
  created_at: string;
  category_name?: string;
}

interface Category {
  id: number;
  name: string;
}

const parseImageList = (value?: string | string[]) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((s) => s.trim()).filter(Boolean);
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

export default function AdminProducts() {
  // Safe JSON parser: if response is not JSON (e.g., HTML error page),
  // return null and log the raw text for debugging to avoid uncaught SyntaxError
  const safeParseJson = async (res: Response) => {
    try {
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error("Non-JSON response body:", text.substring(0, 1000));
        return null;
      }
    } catch (err) {
      console.error("Failed to read response text for debugging", err);
      return null;
    }
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    admin_description: "",
    slogan: "",
    price: "",
    comparePrice: "",
    image: "",
    images: "",
    category_id: "",
    stock: "",
    sizes: [] as string[],
    colors: [] as string[],
    variants: [] as { size?: string; color?: string; stock?: number }[],
    pre_order_sizes: [] as string[],
    pre_order: false,
    is_featured: false,
    is_new: false,
    is_active: true,
  });
  const router = useRouter();

  const fetchProducts = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");

      if (!token) {
        router.push("/admin/giris");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/products?limit=1000", {
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
        const data = await safeParseJson(response);
        if (data && data.data && Array.isArray(data.data.products)) {
          setProducts(data.data.products);
        } else {
          console.error("Unexpected /api/admin/products response", data);
        }
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");

      if (!token) {
        router.push("/admin/giris");
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
        return;
      }

      if (response.ok) {
        const data = await safeParseJson(response);
        if (data && data.data) {
          setCategories(data.data);
        } else {
          console.error("Unexpected /api/admin/categories response", data);
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, [router]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchCategories, fetchProducts]);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const productData = {
      name: formData.name,
      description: formData.description,
      admin_description: formData.admin_description
        ? formData.admin_description.replace(/\r\n/g, "\n")
        : formData.admin_description,
      slogan: formData.slogan,
      price: parseFloat(formData.price),
      compare_price: formData.comparePrice
        ? parseFloat(formData.comparePrice)
        : null,
      image: formData.image,
      images: formData.images,
      category_id: parseInt(formData.category_id),
      stock: parseInt(formData.stock),
      sizes: formData.sizes,
      variants: formData.variants,
      pre_order_sizes: formData.pre_order_sizes,
      colors: formData.colors,
      pre_order: formData.pre_order,
      is_featured: formData.is_featured,
      is_new: formData.is_new,
      is_active: formData.is_active,
    };

    try {
      const token = localStorage.getItem("adminToken");
      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : "/api/admin/products";
      const method = editingProduct ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingProduct(null);
        resetForm();
        fetchProducts();
      }
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  // Upload handler for image files (SVG allowed)
  const handleFileUpload = async (file: File) => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        alert("Önce admin girişi yapmalısınız");
        return;
      }

      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (!res.ok) {
        const err = await safeParseJson(res);
        alert((err && err.message) || "Yükleme başarısız");
        return;
      }

      const data = await safeParseJson(res);
      if (data && data.url) {
        setFormData((prev) => ({ ...prev, image: data.url }));
      }
    } catch (error) {
      console.error("Upload error", error);
      alert("Dosya yüklenirken hata oluştu");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    // Fetch full product details (including variants) from admin API to avoid losing sizes/colors
    (async () => {
      try {
        const token = localStorage.getItem("adminToken");
        const res = await fetch(`/api/admin/products/${product.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await safeParseJson(res);
          const p = json && json.data ? json.data : json;
          const sizesFromVariants: string[] = Array.isArray(p.variants)
            ? (Array.from(
                new Set(
                  p.variants
                    .map((v: any) =>
                      v && v.size ? String(v.size).trim() : null
                    )
                    .filter(Boolean)
                )
              ) as string[])
            : [];
          const colorsFromVariants: string[] = Array.isArray(p.variants)
            ? (Array.from(
                new Set(
                  p.variants
                    .map((v: any) =>
                      v && v.color ? String(v.color).trim() : null
                    )
                    .filter(Boolean)
                )
              ) as string[])
            : [];

          setFormData({
            name: p.name || "",
            description: p.description || "",
            admin_description: p.admin_description || "",
            slogan: (p as any).slogan || "",
            price: p.price ? p.price.toString() : "0",
            comparePrice: p.compare_price ? p.compare_price.toString() : "",
            image: p.image_url || "",
            images: Array.isArray(p.images)
              ? p.images.join(", ")
              : p.images || "",
            category_id: p.category_id ? p.category_id.toString() : "",
            stock: p.stock ? p.stock.toString() : "0",
            sizes: sizesFromVariants,
            pre_order_sizes: p.pre_order_sizes
              ? (p.pre_order_sizes + "").split(",")
              : [],
            colors: colorsFromVariants,
            variants: Array.isArray(p.variants)
              ? p.variants.map((v: any) => ({
                  size: v.size,
                  color: v.color,
                  stock: v.stock,
                }))
              : [],
            pre_order: Boolean(p.pre_order),
            is_featured: Boolean(p.is_featured),
            is_new: Boolean(p.is_new),
            is_active: p.is_active !== undefined ? Boolean(p.is_active) : true,
          });
          setShowModal(true);
        } else {
          // fallback to using list-provided product data
          setFormData({
            name: product.name || "",
            description: product.description || "",
            admin_description: product.admin_description || "",
            slogan: (product as any).slogan || "",
            price: product.price ? product.price.toString() : "0",
            comparePrice: product.compare_price
              ? product.compare_price.toString()
              : "",
            image: product.image || "",
            images: Array.isArray(product.images)
              ? product.images.join(", ")
              : product.images || "",
            category_id: product.category_id
              ? product.category_id.toString()
              : "",
            stock: product.stock ? product.stock.toString() : "0",
            sizes: product.sizes ? product.sizes.split(",") : [],
            variants: [],
            pre_order_sizes: (product as any).pre_order_sizes
              ? (product as any).pre_order_sizes.split(",")
              : [],
            colors: product.colors ? product.colors.split(",") : [],
            pre_order: product.pre_order || false,
            is_featured: product.is_featured || false,
            is_new: product.is_new || false,
            is_active:
              product.is_active !== undefined ? product.is_active : true,
          });
          setShowModal(true);
        }
      } catch (err) {
        console.error("Failed to load product details for edit:", err);
        setFormData({
          name: product.name || "",
          description: product.description || "",
          admin_description: product.admin_description || "",
          slogan: (product as any).slogan || "",
          price: product.price ? product.price.toString() : "0",
          comparePrice: product.compare_price
            ? product.compare_price.toString()
            : "",
          image: product.image || "",
          images: Array.isArray(product.images)
            ? product.images.join(", ")
            : product.images || "",
          category_id: product.category_id
            ? product.category_id.toString()
            : "",
          stock: product.stock ? product.stock.toString() : "0",
          sizes: product.sizes ? product.sizes.split(",") : [],
          variants: [],
          pre_order_sizes: (product as any).pre_order_sizes
            ? (product as any).pre_order_sizes.split(",")
            : [],
          colors: product.colors ? product.colors.split(",") : [],
          pre_order: product.pre_order || false,
          is_featured: product.is_featured || false,
          is_new: product.is_new || false,
          is_active: product.is_active !== undefined ? product.is_active : true,
        });
        setShowModal(true);
      }
    })();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;

    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      admin_description: "",
      slogan: "",
      price: "",
      comparePrice: "",
      image: "",
      images: "",
      category_id: "",
      stock: "",
      sizes: [],
      variants: [],
      pre_order_sizes: [],
      colors: [],
      pre_order: false,
      is_featured: false,
      is_new: false,
      is_active: true,
    });
  };

  const openAddModal = () => {
    setEditingProduct(null);
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
        <h1 className="text-3xl font-bold text-gray-900">Ürün Yönetimi</h1>
        <button
          onClick={openAddModal}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <HiPlus className="w-5 h-5 mr-2" />
          Yeni Ürün
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Ürün ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ürün
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fiyat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stok
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Varyasyonlar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        className="h-10 w-10 rounded-lg object-cover"
                        src={product.image}
                        alt={product.name}
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {product.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₺{product.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        product.stock > 10
                          ? "bg-green-100 text-green-800"
                          : product.stock > 0
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {categories.find((cat) => cat.id === product.category_id)
                      ?.name || "Bilinmiyor"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.sizes && (
                      <div>
                        Beden: {product.sizes.split(",").slice(0, 2).join(", ")}
                        {product.sizes.split(",").length > 2 ? "..." : ""}
                      </div>
                    )}
                    {product.colors && (
                      <div>
                        Renk: {product.colors.split(",").slice(0, 2).join(", ")}
                        {product.colors.split(",").length > 2 ? "..." : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        product.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {product.is_active ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <HiPencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
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
              {editingProduct ? "Ürün Düzenle" : "Yeni Ürün"}
            </h2>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ürün Adı
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
                  Ürün Sloganı (küçük, italik)
                </label>
                <input
                  type="text"
                  value={formData.slogan}
                  onChange={(e) =>
                    setFormData({ ...formData, slogan: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Özel Açıklama (Ürün Detayı) - gösterilebilir her ürün için */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Özel Açıklama (Ürün Detayı)
                </label>
                <textarea
                  value={formData.admin_description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      admin_description: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Ürün detayı / ön sipariş bilgisi girin. Bu açıklama ürün sayfasında 'Ürün Detayı' butonuyla gösterilecektir."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fiyat (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Karşılaştırma Fiyatı (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.comparePrice}
                    onChange={(e) =>
                      setFormData({ ...formData, comparePrice: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ana Resim
                </label>
                <div className="flex flex-col gap-2">
                  <label className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md border border-blue-600 cursor-pointer text-center transition-colors">
                    📁 Resim Yükle (PNG, JPG, SVG)
                    <input
                      type="file"
                      accept="image/*,.svg"
                      onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        if (f) handleFileUpload(f);
                      }}
                      className="hidden"
                    />
                  </label>
                  {formData.image && (
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 break-all">
                          {formData.image}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: "" })}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                      >
                        Kaldır
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ek Resimler (Opsiyonel)
                </label>
                <div className="flex flex-col gap-2">
                  <label className="px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-md border border-gray-600 cursor-pointer text-center transition-colors">
                    📁 Ek Resim Yükle (Çoklu Seçim)
                    <input
                      type="file"
                      accept="image/*,.svg"
                      multiple
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;

                        const urls = [];
                        for (let i = 0; i < files.length; i++) {
                          const token = localStorage.getItem("adminToken");
                          if (!token) continue;

                          const form = new FormData();
                          form.append("file", files[i]);

                          try {
                            const res = await fetch("/api/admin/upload", {
                              method: "POST",
                              headers: { Authorization: `Bearer ${token}` },
                              body: form,
                            });

                            if (res.ok) {
                              const data = await res.json();
                              if (data && data.url) urls.push(data.url);
                            }
                          } catch (err) {
                            console.error("Upload error:", err);
                          }
                        }

                        if (urls.length > 0) {
                          const existing = parseImageList(formData.images);
                          const combined = [...existing, ...urls].join(", ");
                          setFormData({ ...formData, images: combined });
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {parseImageList(formData.images).length > 0 && (
                    <div className="p-2 bg-gray-50 rounded-md">
                      <div className="flex flex-wrap gap-2">
                        {parseImageList(formData.images).map((url, idx) => {
                          const trimmedUrl = url;
                          const urls = parseImageList(formData.images);
                          const moveLeft = () => {
                            if (idx === 0) return;
                            const copy = [...urls];
                            const tmp = copy[idx - 1];
                            copy[idx - 1] = copy[idx];
                            copy[idx] = tmp;
                            setFormData({
                              ...formData,
                              images: copy.join(", "),
                            });
                          };
                          const moveRight = () => {
                            if (idx === urls.length - 1) return;
                            const copy = [...urls];
                            const tmp = copy[idx + 1];
                            copy[idx + 1] = copy[idx];
                            copy[idx] = tmp;
                            setFormData({
                              ...formData,
                              images: copy.join(", "),
                            });
                          };
                          const remove = () => {
                            const copy = [...urls];
                            copy.splice(idx, 1);
                            setFormData({
                              ...formData,
                              images: copy.join(", "),
                            });
                          };
                          const setAsMain = () => {
                            setFormData({ ...formData, image: trimmedUrl });
                          };

                          return (
                            <div
                              key={idx}
                              className="relative flex flex-col items-center"
                            >
                              <img
                                src={trimmedUrl}
                                alt={`Ek ${idx + 1}`}
                                className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                              />
                              <div className="flex gap-1 mt-1">
                                <button
                                  type="button"
                                  onClick={moveLeft}
                                  disabled={idx === 0}
                                  title="Soldakiyle değiştir"
                                  className="px-1 py-0.5 bg-gray-100 rounded text-xs disabled:opacity-40"
                                >
                                  ←
                                </button>
                                <button
                                  type="button"
                                  onClick={moveRight}
                                  disabled={idx === urls.length - 1}
                                  title="Sağdakiyle değiştir"
                                  className="px-1 py-0.5 bg-gray-100 rounded text-xs disabled:opacity-40"
                                >
                                  →
                                </button>
                                <button
                                  type="button"
                                  onClick={setAsMain}
                                  title="Ana resim yap"
                                  className="px-1 py-0.5 bg-yellow-100 rounded text-xs"
                                >
                                  Ana
                                </button>
                                <button
                                  type="button"
                                  onClick={remove}
                                  title="Kaldır"
                                  className="px-1 py-0.5 bg-red-500 text-white rounded text-xs"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Kategori seçin</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stok Miktarı
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beden Seçenekleri
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    "XS",
                    "S",
                    "M",
                    "L",
                    "XL",
                    "XXL",
                    "36",
                    "38",
                    "40",
                    "42",
                    "44",
                  ].map((size) => (
                    <label key={size} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.sizes.includes(size)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              sizes: [...formData.sizes, size],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              sizes: formData.sizes.filter((s) => s !== size),
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      {size}
                    </label>
                  ))}
                </div>
                {formData.sizes.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    Seçili bedenler: {formData.sizes.join(", ")}
                  </p>
                )}
              </div>

              {/* Variant stock editor */}
              {formData.variants && formData.variants.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Varyant Stokları (baza göre)
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {formData.variants.map((v, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-40 text-sm">
                          {v.size || ""}
                          {v.color ? ` / ${v.color}` : ""}
                        </div>
                        <input
                          type="number"
                          value={v.stock ?? 0}
                          onChange={(e) => {
                            const copy = [...formData.variants];
                            copy[idx] = {
                              ...copy[idx],
                              stock: parseInt(e.target.value || "0", 10),
                            };
                            setFormData({ ...formData, variants: copy });
                          }}
                          className="w-24 px-2 py-1 border rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ön Sipariş Bedenleri
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    "XS",
                    "S",
                    "M",
                    "L",
                    "XL",
                    "XXL",
                    "36",
                    "38",
                    "40",
                    "42",
                    "44",
                  ].map((size) => (
                    <label key={size} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.pre_order_sizes.includes(size)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              pre_order_sizes: [
                                ...formData.pre_order_sizes,
                                size,
                              ],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              pre_order_sizes: formData.pre_order_sizes.filter(
                                (s) => s !== size
                              ),
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      {size}
                    </label>
                  ))}
                </div>
                {formData.pre_order_sizes.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    Seçili ön sipariş bedenleri:{" "}
                    {formData.pre_order_sizes.join(", ")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Renk Seçenekleri
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    "Siyah",
                    "Beyaz",
                    "Kırmızı",
                    "Mavi",
                    "Yeşil",
                    "Sarı",
                    "Pembe",
                    "Mor",
                  ].map((color) => (
                    <label key={color} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.colors.includes(color)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              colors: [...formData.colors, color],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              colors: formData.colors.filter(
                                (c) => c !== color
                              ),
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      {color}
                    </label>
                  ))}
                </div>
                {formData.colors.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    Seçili renkler: {formData.colors.join(", ")}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_featured: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  Öne Çıkan Ürün
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_new}
                    onChange={(e) =>
                      setFormData({ ...formData, is_new: e.target.checked })
                    }
                    className="mr-2"
                  />
                  Yeni Ürün
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.pre_order}
                    onChange={(e) =>
                      setFormData({ ...formData, pre_order: e.target.checked })
                    }
                    className="mr-2"
                  />
                  Ön Sipariş
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="mr-2"
                  />
                  Aktif Ürün
                </label>
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
                  {editingProduct ? "Güncelle" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
