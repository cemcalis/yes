"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Add a marker on body to hide global header/footer
    document.body.classList.add("admin-mode");

    // Decide whether to allow rendering immediately (login page) or require token
    const isLoginPage =
      pathname === "/admin/giris" || pathname === "/admin/giris/";

    if (isLoginPage) {
      setChecked(true);
    } else {
      // Check admin token in localStorage; if missing redirect to login
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("adminToken")
          : null;
      if (!token) {
        // Delay the redirect slightly to avoid navigation conflicts during render
        setTimeout(() => router.push("/admin/giris"), 0);
      } else {
        setChecked(true);
      }
    }

    // cleanup
    return () => {
      document.body.classList.remove("admin-mode");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!checked) {
    // Don't render admin UI until we've validated presence of token (prevents flash of admin pages)
    return null;
  }

  // If we're on the login page, don't render the admin sidebar — show only the form
  if (pathname === "/admin/giris" || pathname === "/admin/giris/") {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="flex-1 p-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
