import Hero from "@/components/Hero";
import ProductGrid from "@/components/ProductGrid";
// Newsletter component removed from this page because it's rendered elsewhere on the layout
import Link from "next/link";
import Section from "@/components/Section";
import AutoCarousel from "@/components/AutoCarousel";

// Use the provided MLH images from `public/` as the four collection images.
const collectionImages = [
  "/MLH08694.jpg",
  "/MLH08932.jpg",
  "/MLH09064.jpg",
  "/MLH09096.jpg",
];

export default function Home() {
  return (
    <>
      <Hero />

      <Section title="COLLECTIONS" bandClass="bg-white">
        <div className="relative w-full mx-auto px-4">
          <div className="grid grid-cols-2 gap-6">
            {collectionImages.map((img, idx) => (
              <div
                key={idx}
                // Use tall responsive heights so portrait images fill the cell
                className="relative h-[52vh] md:h-[68vh] overflow-hidden rounded-md"
              >
                <img
                  src={img}
                  alt={`Collection ${idx + 1}`}
                  className="object-contain object-center w-full h-full transition-transform duration-700 hover:scale-105"
                />
              </div>
            ))}
          </div>

          {/* Removed centered "Alışverişe başla" button per request */}
        </div>
      </Section>

      <AutoCarousel
        images={["/sliderelbiseler.jpg", "/sliderüstgiyim.jpg", "/slideraltgiyim.jpg"]}
        labels={["Elbiseler", "Üst Giyim", "Alt Giyim"]}
        links={["/koleksiyon/elbiseler", "/koleksiyon/ust-giyim", "/koleksiyon/alt-giyim"]}
        height="380px"
        speedSeconds={12}
        gapPx={1}
      />

      <ProductGrid title="ÜRÜNLER" />
    </>
  );
}
