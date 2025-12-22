"use client";

import Link from "next/link";
import { FiX, FiChevronRight } from "react-icons/fi";
import { useEffect } from "react";

interface HamburgerMenuProps {
  open: boolean;
  onClose: () => void;
  categories?: Array<{ name: string; href: string }>;
}

export default function HamburgerMenu({ open, onClose, categories = [] }: HamburgerMenuProps) {
  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* Backdrop with blur */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-menu transition-all duration-300 ${
          open ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={onClose}
      />
      
      {/* Full height sidebar - slides from left */}
      <div 
        className={`fixed left-0 top-0 bottom-0 w-[300px] bg-white shadow-2xl z-menu overflow-y-auto transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-gray-200">
          <Link href="/" onClick={onClose}>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              RAVOR
            </h1>
          </Link>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close menu"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Menu Content - scrollable */}
        <nav className="p-6">
          {/* Categories */}
          {categories.length > 0 && (
            <div className="mb-8">
              <h2 className="px-3 mb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Kategoriler
              </h2>
              <div className="space-y-1">
                {categories.map((category) => (
                  <Link
                    key={category.href}
                    href={category.href}
                    onClick={onClose}
                    className="flex items-center justify-between px-3 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors group"
                  >
                    <span>{category.name}</span>
                    <FiChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Special Links */}
          <div className="mb-8">
            <h2 className="px-3 mb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Özel Koleksiyonlar
            </h2>
            <div className="space-y-1">
              <Link
                href="/yeni-gelenler"
                onClick={onClose}
                className="flex items-center justify-between px-3 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors group"
              >
                <span>Yeni Gelenler</span>
                <FiChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </Link>
            </div>
          </div>

          {/* Footer Links */}
          <div className="pt-6 border-t border-gray-200">
            <div className="space-y-1">
              <Link
                href="/hakkimizda"
                onClick={onClose}
                className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Hakkımızda
              </Link>
              <Link
                href="/iletisim"
                onClick={onClose}
                className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                İletişim
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
