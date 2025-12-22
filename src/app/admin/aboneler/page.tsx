"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Subscriber = {
  id: number;
  email: string;
  is_active: number;
  subscribed_at?: string;
  unsubscribed_at?: string | null;
};

export default function AdminSubscribers() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchList();
  }, []);

  async function fetchList() {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        router.push("/admin/giris");
        return;
      }
      const res = await fetch("/api/admin/newsletter", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("adminToken");
        router.push("/admin/giris");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSubs(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe(email: string) {
    if (
      !confirm(`'${email}' kullanıcısını abonelikten çıkarmak istiyor musunuz?`)
    )
      return;
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) fetchList();
      else alert("İşlem başarısız oldu");
    } catch (err) {
      console.error(err);
      alert("İşlem başarısız oldu");
    }
  }

  return (
    <div>
      <h1>Aboneler</h1>
      <p>{loading ? "Yükleniyor..." : `Toplam: ${subs.length}`}</p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8 }}>Email</th>
            <th style={{ textAlign: "left", padding: 8 }}>Durum</th>
            <th style={{ textAlign: "left", padding: 8 }}>Abone Tarihi</th>
            <th style={{ padding: 8 }}>Eylemler</th>
          </tr>
        </thead>
        <tbody>
          {subs.map((s) => (
            <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
              <td style={{ padding: 8 }}>{s.email}</td>
              <td style={{ padding: 8 }}>{s.is_active ? "Aktif" : "İptal"}</td>
              <td style={{ padding: 8 }}>{s.subscribed_at || "-"}</td>
              <td style={{ padding: 8 }}>
                <button onClick={() => unsubscribe(s.email)}>
                  Abonelikten Çıkar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
