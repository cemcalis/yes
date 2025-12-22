'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiUser, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

export default function AccountPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/giris?redirect=/hesap');
      return;
    }

    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user, isLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsSaving(true);

    try {
      // TODO: API endpoint eklenecek
      // Şimdilik sadece local state güncellenecek
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Local storage'daki user bilgisini güncelle
      const updatedUser = { ...user, ...formData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setMessage('Bilgileriniz güncellendi');
      setIsEditing(false);
    } catch {
      setMessage('Bir hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Hesabım</h1>

      <div className="max-w-2xl">
        <div className="bg-white border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Hesap Bilgileri</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Düzenle
              </button>
            )}
          </div>

          {message && (
            <div className={`mb-4 px-4 py-3 rounded-md ${
              message.includes('güncellendi') 
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <FiUser size={16} />
                Ad Soyad
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <FiMail size={16} />
                E-posta
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-4 py-2 border border-border rounded-md bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-foreground/60 mt-1">
                E-posta adresi değiştirilemez
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <FiPhone size={16} />
                Telefon
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <FiMapPin size={16} />
                Adres
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={!isEditing}
                rows={3}
                className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:cursor-not-allowed"
              />
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: user.name || '',
                      phone: user.phone || '',
                      address: user.address || '',
                    });
                    setMessage('');
                  }}
                  className="px-6 py-2 border border-border rounded-md font-medium hover:bg-muted transition-colors"
                >
                  İptal
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
