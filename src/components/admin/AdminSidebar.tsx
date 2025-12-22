"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiHome,
  HiShoppingBag,
  HiTag,
  HiClipboardList,
  HiUsers,
  HiCog,
  HiLogout,
  HiChartBar,
} from "react-icons/hi";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: HiHome },
  { name: "Ürünler", href: "/admin/urunler", icon: HiShoppingBag },
  { name: "Kategoriler", href: "/admin/kategoriler", icon: HiTag },
  { name: "Siparişler", href: "/admin/siparisler", icon: HiClipboardList },
  { name: "Kullanıcılar", href: "/admin/kullanicilar", icon: HiUsers },
  { name: "Analitik", href: "/admin/analitik", icon: HiChartBar },
  { name: "Ayarlar", href: "/admin/ayarlar", icon: HiCog },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    window.location.href = "/admin/giris";
  };

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="flex items-center justify-center h-16 px-4 bg-gray-900 text-white">
        <h1 className="text-xl font-bold">RAVOR Admin</h1>
      </div>

      <nav className="mt-8">
        <div className="px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="absolute bottom-0 w-64 p-4">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <HiLogout className="w-5 h-5 mr-3" />
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}
