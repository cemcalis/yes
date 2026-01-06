"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Hero() {
  const [banner, setBanner] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/banners?position=home");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && Array.isArray(data) && data.length > 0) {
          setBanner(data[0]);
        }
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const src = banner && banner.image_url ? banner.image_url : "/new-hero.png";

  return (
    <section className="relative h-[500px] md:h-[600px] bg-linear-to-br from-gray-50 to-gray-100 overflow-hidden">
      <Image
        src={src}
        alt={banner && banner.title ? banner.title : "Hero"}
        fill
        sizes="100vw"
        className="object-cover"
        priority
      />

      {/* Gradient overlays - top and bottom fade to white */}
      <div className="absolute inset-0 bg-linear-to-b from-white/60 via-transparent to-white/60" />
      <div className="absolute inset-0 bg-black/5" />

      <div className="relative h-full container mx-auto px-4 flex items-center justify-center">
        <div className="max-w-2xl text-center text-white">
          <h1 className="text-4xl md:text-6xl font-light mb-4 leading-tight tracking-wide uppercase">
            {banner && banner.title ? banner.title : "New Season"}
          </h1>
          <p className="text-base md:text-lg mb-8 font-light tracking-wide">
            {banner && banner.subtitle
              ? banner.subtitle
              : "Discover the latest collection"}
          </p>
          <Link
            href="/koleksiyon/elbiseler"
            className="inline-block bg-white text-gray-900 px-10 py-3 text-sm font-medium uppercase tracking-wider hover:bg-gray-100 transition-colors"
          >
            Alışverişe başla
          </Link>
        </div>
      </div>
    </section>
  );
}
