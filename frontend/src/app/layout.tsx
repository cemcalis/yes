import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { CartProvider } from "@/contexts/CartContext";
import { ToastProvider } from "@/components/Toast";
import CookieConsent from "@/components/CookieConsent";
import ErrorBoundary from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RAVOR",
  description: "",
  keywords: "kadın giyim, elbise, moda, alışveriş, online alışveriş, tasarım",
  authors: [{ name: "RAVOR" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="font-body antialiased bg-background text-foreground">
        <ErrorBoundary>
          <ToastProvider>
            <AuthProvider>
              <CartProvider>
                <FavoritesProvider>
                  <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-grow">{children}</main>
                    <Footer />
                  </div>
                  <CookieConsent />
                </FavoritesProvider>
              </CartProvider>
            </AuthProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
