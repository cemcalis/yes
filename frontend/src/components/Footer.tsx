import Link from "next/link";
import { FiInstagram, FiMail } from "react-icons/fi";

export default function Footer() {
  return (
    <footer className="mt-20 shadow-lg">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Marka */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-champagne-peach">
              RAVOR
            </h3>
            <div className="flex gap-4 mt-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full transition-colors bg-white/8 hover:bg-white/12"
                aria-label="Instagram"
              >
                <FiInstagram size={20} />
              </a>
              <a
                href="mailto:info@ravorcollection.com"
                className="p-2 rounded-full transition-colors bg-white/8 hover:bg-white/12"
                aria-label="E-posta"
              >
                <FiMail size={20} />
              </a>
            </div>
          </div>

          {/* Alışveriş */}
          <div>
            <h4 className="font-semibold mb-4 text-champagne-peach">
              Alışveriş
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/koleksiyon/elbiseler"
                  className="text-gray-700 hover:text-accent transition-colors"
                >
                  Elbiseler
                </Link>
              </li>
              <li>
                <Link
                  href="/koleksiyon/ustler"
                  className="text-gray-700 hover:text-accent transition-colors"
                >
                  Üstler
                </Link>
              </li>
              <li>
                <Link
                  href="/koleksiyon/altlar"
                  className="text-gray-700 hover:text-accent transition-colors"
                >
                  Altlar
                </Link>
              </li>
              <li>
                <Link
                  href="/yeni-gelenler"
                  className="text-gray-700 hover:text-accent transition-colors"
                >
                  Yeni Gelenler
                </Link>
              </li>
            </ul>
          </div>

          {/* Bilgi */}
          <div>
            <h4 className="font-semibold mb-4 text-champagne-peach">Bilgi</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/hakkimizda"
                  className="text-gray-700 hover:text-accent transition-colors"
                >
                  Hakkımızda
                </Link>
              </li>
              <li>
                <Link
                  href="/iletisim"
                  className="text-gray-700 hover:text-accent transition-colors"
                >
                  İletişim
                </Link>
              </li>
              <li>
                <Link
                  href="/kargo-iade"
                  className="text-gray-700 hover:text-accent transition-colors"
                >
                  Kargo & İade
                </Link>
              </li>
              <li>
                <Link
                  href="/mesafeli-satis-sozlesmesi"
                  className="text-gray-700 hover:text-accent transition-colors"
                >
                  Mesafeli Satış Sözleşmesi
                </Link>
              </li>
              <li>
                <Link
                  href="/gizlilik"
                  className="text-gray-700 hover:text-accent transition-colors"
                >
                  Gizlilik Politikası
                </Link>
              </li>
              <li>
                <Link
                  href="/kullanim-kosullari"
                  className="text-gray-700 hover:text-accent transition-colors"
                >
                  Kullanım Koşulları
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold mb-4 text-champagne-peach">Bülten</h4>
            <p className="text-sm text-gray-800 mb-4">
              Yeni koleksiyonlar ve özel fırsatlardan haberdar olun.
            </p>
            <form className="flex flex-col gap-2">
              <input
                type="email"
                placeholder="E-posta adresiniz"
                className="px-4 py-2 border border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
              />
              <button
                type="submit"
                className="bg-white text-gray-900 border border-gray-300 px-4 py-2 rounded-md hover:bg-champagne-darker hover:text-gray-900 transition-colors text-sm font-medium"
              >
                Abone Ol
              </button>
            </form>
          </div>
        </div>
        {/* Bottom bar */}
        <div className="border-t border-[rgba(0,0,0,0.04)] mt-12 pt-6 text-center text-sm text-gray-700">
          <p>&copy; {new Date().getFullYear()} RAVOR. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
}
