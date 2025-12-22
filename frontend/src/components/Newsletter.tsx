"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    // Simüle edilmiş API çağrısı
    setTimeout(() => {
      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus("idle"), 3000);
    }, 1000);
  };

  return (
    <section className="bg-gradient-to-r from-champagne-100 via-[#f6d7ca]/40 to-champagne-200 py-16">
      <div className="container mx-auto px-4 max-w-2xl text-center">
        <h2 className="text-3xl font-bold mb-4 text-champagne-contrast">
          Bültenimize Abone Olun
        </h2>
        <p className="text-champagne-contrast opacity-80 mb-8">
          Yeni koleksiyonlar, özel indirimler ve stil ipuçlarından ilk siz
          haberdar olun.
        </p>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta adresiniz"
            required
            className="flex-1 px-4 py-3 border border-champagne-200 rounded-md bg-white/70 focus:outline-none focus:ring-2 focus:ring-[rgba(242,205,191,0.35)]"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="bg-primary text-white px-8 py-3 rounded-md font-medium shadow-[0_10px_25px_rgba(31,20,17,0.06)] hover:bg-[rgba(139,94,75,0.85)] transition-colors disabled:opacity-50"
          >
            {status === "loading" ? "Gönderiliyor..." : "Abone Ol"}
          </button>
        </form>

        {status === "success" && (
          <p className="mt-4 text-champagne-contrast font-medium">
            ✓ Başarıyla abone oldunuz!
          </p>
        )}
      </div>
    </section>
  );
}
