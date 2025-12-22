"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  FiShoppingBag,
  FiMenu,
  FiUser,
  FiLogOut,
  FiHeart,
  FiChevronDown,
} from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { getCategories } from "@/lib/api";

export default function Header() {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [categories, setCategories] = useState<
    { name: string; slug?: string; href?: string; id?: number }[]
  >([]);
  const lastYRef = useRef(0);
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();
  const { itemCount } = useCart();
  const displayCartCount = itemCount > 99 ? "99+" : itemCount;

  useEffect(() => {
    let ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY || window.pageYOffset;
        // when scrolling down, hide header; when scrolling up, show header
        if (y > lastYRef.current && y > 100) {
          setVisible(false);
        } else {
          setVisible(true);
        }
        lastYRef.current = y;
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Kategorileri API'den çek
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getCategories();
        if (!mounted) return;
        if (Array.isArray(data)) {
          setCategories(
            data.map((c: any) => ({
              id: c.id,
              name: c.name || "Kategori",
              slug: c.slug,
            }))
          );
        }
      } catch (err) {
        console.error("Kategoriler alınamadı:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header
      className={`sticky top-0 bg-white transform transition-transform duration-300 ease-out ${
        visible ? "translate-y-0 shadow-sm" : "-translate-y-full"
      } z-40`}
    >
      {/* Main header */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Left - Categories Menu */}
          <div className="flex items-center relative">
            <button
              onClick={() => setCategoriesOpen(!categoriesOpen)}
              className="flex items-center gap-2 p-2 text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Kategoriler"
            >
              <FiMenu size={20} />
              <span className="hidden md:inline text-sm font-medium">
                Kategoriler
              </span>
              <FiChevronDown
                size={16}
                className={`hidden md:inline transition-transform ${
                  categoriesOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Categories Dropdown */}
            {categoriesOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setCategoriesOpen(false)}
                />
                <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg py-2 z-20">
                  {categories.map((category) => (
                    <Link
                      key={category.slug || category.id || category.name}
                      href={
                        category.slug
                          ? `/koleksiyon/${category.slug}`
                          : "/koleksiyon"
                      }
                      className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 transition-colors"
                      onClick={() => setCategoriesOpen(false)}
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Center - Logo/Brand */}
          <Link
            href="/"
            className="absolute left-1/2 transform -translate-x-1/2 flex items-center"
            aria-label="RAVOR anasayfa"
          >
            <Image
              src="/logo.png"
              alt="RAVOR"
              width={280}
              height={80}
              className="object-contain w-auto"
              style={{ width: "280px", height: "80px" }}
              unoptimized
              priority
            />
            <span className="sr-only">RAVOR</span>
          </Link>

          {/* Right - Icons (Hesabım, Favoriler, Sepet) */}
          <div className="flex items-center gap-1 text-gray-800">
            {/* Hesabım / User */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1 p-2 hover:bg-gray-100 rounded-md transition-colors"
                  aria-label="Hesabım"
                >
                  <FiUser size={20} />
                  <span className="hidden md:inline text-sm">Hesabım</span>
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-2 z-20">
                      <Link
                        href="/hesap"
                        className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Hesabım
                      </Link>
                      <Link
                        href="/siparislerim"
                        className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Siparişlerim
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center gap-2 text-red-500"
                      >
                        <FiLogOut size={16} />
                        Çıkış Yap
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/giris"
                className="flex items-center gap-1 p-2 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Giriş Yap"
              >
                <FiUser size={20} />
                <span className="hidden md:inline text-sm">Giriş</span>
              </Link>
            )}

            {/* Favoriler */}
            <Link
              href="/favoriler"
              className="relative flex items-center gap-1 p-2 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Favoriler"
            >
              <FiHeart size={20} />
              <span className="hidden md:inline text-sm">Favoriler</span>
              {user && favorites.length > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {favorites.length > 99 ? "99+" : favorites.length}
                </span>
              )}
            </Link>

            {/* Sepet */}
            <Link
              href="/sepet"
              className="relative flex items-center gap-1 p-2 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Sepet"
            >
              <FiShoppingBag size={20} />
              <span className="hidden md:inline text-sm">Sepet</span>
              <span
                className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-gradient-to-r from-gray-900 to-gray-700 text-white text-[11px] font-semibold flex items-center justify-center shadow-md ring-2 ring-white"
                aria-live="polite"
              >
                {displayCartCount}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
