import React from "react";
import Link from "next/link";
type Props = {
  images: string[];
  height?: string;
  speedSeconds?: number;
  gapPx?: number;
  labels?: string[];
  links?: string[];
};
function AutoCarousel({
  images,
  height = "220px",
  speedSeconds = 12,
  gapPx = 12,
  labels = [],
  links = [],
}: Props) {
  const display = images;
  // Duplicate the set for seamless scroll
  const loopImages = [...display, ...display];
  const visible = display.length;
  const totalGap = gapPx * (visible - 1);
  const slideWidthCalc = `calc((100vw - ${totalGap}px) / ${visible})`;
  return (
    <div className="w-full overflow-hidden my-4">
      <div
        className="flex"
        style={{
          width: "200%",
          gap: `${gapPx}px`,
          animation: `scroll ${speedSeconds}s linear infinite`,
          willChange: "transform",
        }}
      >
        {loopImages.map((src, i) => {
          const idx = i % visible;
          const label = labels[idx];
          const href = links[idx];
          const slide = (
            <div
              key={i}
              className="flex-shrink-0"
              style={{ width: slideWidthCalc }}
            >
              <div style={{ height }} className="relative overflow-hidden">
                <img
                  src={src}
                  alt={`Slide ${i + 1}`}
                  className="object-contain object-center w-full h-full"
                />
                {label && (
                  <div className="absolute left-1/2 bottom-4 transform -translate-x-1/2 w-auto">
                    <div className="bg-gradient-to-t from-black/85 to-black/40 text-white text-lg font-semibold uppercase tracking-wider px-5 py-2 rounded-md shadow-lg">
                      {label}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
          return href ? (
            <Link key={i} href={href} className="block">
              {slide}
            </Link>
          ) : (
            slide
          );
        })}
      </div>
      <style>{`
  @keyframes scroll {
          from { transform: translate3d(0,0,0); }
          to { transform: translate3d(-50%,0,0); }
  }
  `}</style>
    </div>
  );
}
export default AutoCarousel;
import React from "react";
import Link from "next/link";

type Props = {
  images: string[];
  height?: string;
  speedSeconds?: number;
  gapPx?: number;
  labels?: string[];
  links?: string[];
};

function AutoCarousel({
  images,
  height = "220px",
  speedSeconds = 12,
  gapPx = 12,
  labels = [],
  links = [],
}: Props) {
  const display = images;
  // Duplicate the set for seamless scroll
  const loopImages = [...display, ...display];
  const visible = display.length;
  const totalGap = gapPx * (visible - 1);
  const slideWidthCalc = `calc((100vw - ${totalGap}px) / ${visible})`;

  return (
    <div className="w-full overflow-hidden my-4">
      <div
        className="flex"
        style={{
          width: "200%",
          gap: `${gapPx}px`,
          animation: `scroll ${speedSeconds}s linear infinite`,
          willChange: "transform",
        }}
      >
        {loopImages.map((src, i) => {
          const idx = i % visible;
          const label = labels[idx];
          const href = links[idx];
          const slide = (
            <div
              key={i}
              className="flex-shrink-0"
              style={{ width: slideWidthCalc }}
            >
              <div style={{ height }} className="relative overflow-hidden">
                <img
                  src={src}
                  alt={`Slide ${i + 1}`}
                  className="object-contain object-center w-full h-full"
                />
                {label && (
                  <div className="absolute left-1/2 bottom-4 transform -translate-x-1/2 w-auto">
                    <div className="bg-gradient-to-t from-black/85 to-black/40 text-white text-lg font-semibold uppercase tracking-wider px-5 py-2 rounded-md shadow-lg">
                      {label}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );

          return href ? (
            <Link key={i} href={href} className="block">
              {slide}
            </Link>
          ) : (
            slide
          );
        })}
      </div>

      <style>{`
        @keyframes scroll {
          from { transform: translate3d(0,0,0); }
          to { transform: translate3d(-50%,0,0); }
        }
      `}</style>
    </div>
  );
}

export default AutoCarousel;
