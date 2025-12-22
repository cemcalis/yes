import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

interface Banner {
  id: number;
  title?: string;
  image_url?: string | null;
  link_url?: string | null;
  description?: string | null;
}

export default function Hero() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/banners?position=home");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && Array.isArray(data)) setBanners(data);
      } catch (err) {
        console.error("Failed to load banners", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-rotate when more than one banner
  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const t = setInterval(
      () => setIndex((i) => (i + 1) % banners.length),
      5000
    );
    return () => clearInterval(t);
  }, [banners]);

  const current = banners && banners.length > 0 ? banners[index] : null;

  if (!current) {
    // fallback static hero
    return (
      <section className="relative h-[500px] md:h-[600px] bg-linear-to-br from-gray-50 to-gray-100 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=80"
          alt="Hero"
          fill
          sizes="100vw"
          className="object-cover"
          priority
          unoptimized
        />

        <div className="absolute inset-0 bg-linear-to-b from-white/60 via-transparent to-white/60" />
        <div className="absolute inset-0 bg-black/5" />

        <div className="relative h-full container mx-auto px-4 flex items-center justify-center">
          <div className="max-w-2xl text-center text-white">
            <h1 className="text-4xl md:text-6xl font-light mb-4 leading-tight tracking-wide uppercase">
              New Season
            </h1>
            <p className="text-base md:text-lg mb-8 font-light tracking-wide">
              Discover the latest collection
            </p>
            <Link
              href="/koleksiyon/elbiseler"
              className="inline-block bg-white text-gray-900 px-10 py-3 text-sm font-medium uppercase tracking-wider hover:bg-gray-100 transition-colors"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative h-[500px] md:h-[600px] overflow-hidden bg-gray-50">
      <div className="absolute inset-0">
        <Image
          src={current.image_url || ""}
          alt={current.title || "Banner"}
          fill
          sizes="100vw"
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="relative h-full container mx-auto px-4 flex items-center justify-center">
        <div className="max-w-2xl text-center text-white">
          {current.title && (
            <h1 className="text-4xl md:text-6xl font-light mb-4 leading-tight tracking-wide uppercase">
              {current.title}
            </h1>
          )}
          {current.description && (
            <p className="text-base md:text-lg mb-8 font-light tracking-wide">
              {current.description}
            </p>
          )}
          {current.link_url && (
            <Link
              href={current.link_url}
              className="inline-block bg-white text-gray-900 px-10 py-3 text-sm font-medium uppercase tracking-wider hover:bg-gray-100 transition-colors"
            >
              Detay
            </Link>
          )}
        </div>
      </div>

      {/* Controls */}
      {banners.length > 1 && (
        <div className="absolute left-4 bottom-6 flex gap-2">
          <button
            onClick={() =>
              setIndex((i) => (i - 1 + banners.length) % banners.length)
            }
            className="bg-white/60 rounded-full p-2"
          >
            ‹
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % banners.length)}
            className="bg-white/60 rounded-full p-2"
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}
