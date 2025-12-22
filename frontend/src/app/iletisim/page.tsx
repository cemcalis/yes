"use client";

import { useState } from "react";
import { FiMail, FiPhone, FiMapPin, FiInstagram } from "react-icons/fi";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    // Simüle edilmiş form gönderimi
    setTimeout(() => {
      setStatus("success");
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      setTimeout(() => setStatus("idle"), 3000);
    }, 1500);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">İletişim</h1>
          <p className="text-foreground/60 max-w-2xl mx-auto">
            Sorularınız, siparişleriniz veya işbirliği talepleriniz için bizimle
            iletişime geçebilirsiniz. İletişim numaramız eklenecektir.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* İletişim Bilgileri */}
          <div className="space-y-6">
            <div className="bg-muted p-6 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary text-white rounded-lg">
                  <FiMail size={24} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">E-posta</h3>
                  <p className="text-sm text-foreground/60">
                    info@ravorcollection.com
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted p-6 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary text-white rounded-lg">
                  <FiPhone size={24} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Telefon</h3>
                  <p className="text-sm text-foreground/60">
                    (iletişim numarası eklenecektir)
                  </p>
                  <p className="text-sm text-foreground/60">
                    Hafta içi 09:00 - 18:00
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted p-6 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary text-white rounded-lg">
                  <FiInstagram size={24} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Sosyal Medya</h3>
                  <a
                    href="https://instagram.com/ravor.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-foreground/60 hover:text-primary transition-colors"
                  >
                    @ravor.co
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* İletişim Formu */}
          <div className="lg:col-span-2">
            <div className="bg-muted p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-6">Bize Yazın</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Ad Soyad *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-white"
                      placeholder="Adınız Soyadınız"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      E-posta *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-white"
                      placeholder="ornek@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-white"
                      placeholder="0555 123 45 67"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Konu *
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-white"
                    >
                      <option value="">Seçiniz</option>
                      <option value="order">Sipariş</option>
                      <option value="product">Ürün Bilgisi</option>
                      <option value="return">İade/Değişim</option>
                      <option value="other">Diğer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Mesajınız *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-white resize-none"
                    placeholder="Mesajınızı buraya yazın..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full bg-primary text-white px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {status === "loading" ? "Gönderiliyor..." : "Gönder"}
                </button>

                {status === "success" && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-800 text-sm">
                      ✓ Mesajınız başarıyla gönderildi. En kısa sürede size
                      dönüş yapacağız.
                    </p>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Çalışma Saatleri */}
        <div className="bg-accent/20 p-8 rounded-lg">
          <h3 className="text-xl font-bold mb-4 text-center">
            Çalışma Saatlerimiz
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="flex justify-between p-3 bg-white rounded-md">
              <span className="font-medium">Pazartesi - Cuma</span>
              <span className="text-foreground/60">09:00 - 18:00</span>
            </div>
            <div className="flex justify-between p-3 bg-white rounded-md">
              <span className="font-medium">Cumartesi</span>
              <span className="text-foreground/60">10:00 - 16:00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
