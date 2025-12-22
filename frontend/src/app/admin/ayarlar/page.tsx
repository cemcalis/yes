'use client';

import { useState } from 'react';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    siteName: 'AURA E-Commerce',
    siteDescription: 'Modern ve şık alışveriş deneyimi',
    contactEmail: 'info@aura.com',
    phoneNumber: '+90 555 000 0000',
    address: 'İstanbul, Türkiye',
    currency: 'TRY',
    taxRate: '18',
    shippingCost: '25',
    freeShippingThreshold: '500'
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setMessage('Ayarlar başarıyla güncellendi');
      } else {
        setMessage('Ayarlar güncellenirken hata oluştu');
      }
    } catch (error) {
      setMessage('Sunucu hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Site Ayarları</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('başarıyla') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site Adı
            </label>
            <input
              type="text"
              name="siteName"
              value={settings.siteName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İletişim E-postası
            </label>
            <input
              type="email"
              name="contactEmail"
              value={settings.contactEmail}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefon Numarası
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={settings.phoneNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Para Birimi
            </label>
            <select
              name="currency"
              value={settings.currency}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="TRY">Türk Lirası (₺)</option>
              <option value="USD">ABD Doları ($)</option>
              <option value="EUR">Euro (€)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vergi Oranı (%)
            </label>
            <input
              type="number"
              name="taxRate"
              value={settings.taxRate}
              onChange={handleChange}
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kargo Ücreti (₺)
            </label>
            <input
              type="number"
              name="shippingCost"
              value={settings.shippingCost}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ücretsiz Kargo Limiti (₺)
            </label>
            <input
              type="number"
              name="freeShippingThreshold"
              value={settings.freeShippingThreshold}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Site Açıklaması
          </label>
          <textarea
            name="siteDescription"
            value={settings.siteDescription}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Adres
          </label>
          <textarea
            name="address"
            value={settings.address}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
