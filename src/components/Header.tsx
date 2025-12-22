"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  FiShoppingBag,
  FiMenu,
  FiX,
  FiUser,
  FiLogOut,
  FiHeart,
  FiChevronDown,
} from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";

export default function Header() {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastYRef = useRef(0);
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();

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

  const categories = [
    { name: "Elbiseler", href: "/koleksiyon/elbiseler" },
    { name: "Üstler", href: "/koleksiyon/ustler" },
    { name: "Altlar", href: "/koleksiyon/altlar" },
    { name: "Dış Giyim", href: "/koleksiyon/dis-giyim" },
    { name: "Yeni Gelenler", href: "/yeni-gelenler" },
  ];

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
                      key={category.href}
                      href={category.href}
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
              src="/logo-rv.png"
              alt="RAVOR"
              width={200}
              height={60}
              className="object-contain h-14 w-auto"
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
              <span className="absolute top-0 right-0 bg-black text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                0
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

// scroll listener to show/hide header based on scroll direction
// Note: this effect runs on mount inside the component body via useEffect below
