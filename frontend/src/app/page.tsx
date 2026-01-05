import Hero from "@/components/Hero";
import ProductGrid from "@/components/ProductGrid";
// Newsletter component removed from this page because it's rendered elsewhere on the layout
import Link from "next/link";
import Image from "next/image";
import Section from "@/components/Section";

const collections = [
  {
    title: "Elbiseler",
    href: "/koleksiyon/elbiseler",
    image: "/image1.png",
  },
  {
    title: "Üstler",
    href: "/koleksiyon/ustler",
    image: "/image.png",
  },
];

export default function Home() {
  return (
    <>
      <Hero />

      <Section title="COLLECTIONS" bandClass="bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {collections.map((collection) => (
            <Link
              key={collection.href}
              href={collection.href}
              className="group relative h-96 overflow-hidden"
            >
              <Image
                src={collection.image}
                alt={collection.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-75"
                priority={collection.href === collections[0].href}
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-500" />
              <div className="absolute inset-0 flex items-center justify-center">
                <h3 className="text-2xl font-light text-white uppercase tracking-widest transform transition-all duration-500 group-hover:scale-110">
                  {collection.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <ProductGrid title="ÜRÜNLER" />
    </>
  );
}
