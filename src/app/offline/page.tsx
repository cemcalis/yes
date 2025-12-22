"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <svg
            className="mx-auto h-24 w-24 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-4">
          Bağlantı Yok
        </h1>

        <p className="text-gray-600 mb-8">
          İnternet bağlantınız kesilmiş görünüyor. Lütfen bağlantınızı kontrol
          edin ve tekrar deneyin.
        </p>

        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-primary text-white py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Yeniden Dene
          </button>

          <Link
            href="/"
            className="block w-full border border-gray-300 py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Ana Sayfaya Dön
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>Bazı önceden yüklenmiş içeriklere erişebilirsiniz:</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/favoriler" className="text-primary hover:underline">
                Favorilerim
              </Link>
            </li>
            <li>
              <Link
                href="/siparislerim"
                className="text-primary hover:underline"
              >
                Siparişlerim
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
