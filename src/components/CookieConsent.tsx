'use client';

import { useState, useEffect } from 'react';
import { X, Cookie } from 'lucide-react';

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    marketing: false,
    preferences: false
  });

  useEffect(() => {
    // Check if user has already given consent
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const saveConsent = async (acceptAll = false) => {
    const consentData = acceptAll
      ? { essential: true, analytics: true, marketing: true, preferences: true }
      : preferences;

    try {
      // Save to backend
      await fetch('/api/gdpr/cookie-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...consentData,
          session_id: getSessionId()
        })
      });

      // Save to localStorage
      localStorage.setItem('cookie_consent', JSON.stringify(consentData));
      localStorage.setItem('cookie_consent_date', new Date().toISOString());
      
      setShow(false);
    } catch (error) {
      console.error('Cookie consent error:', error);
    }
  };

  const getSessionId = () => {
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substr(2, 9);
      localStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 pb-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl border border-gray-200">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Cookie className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-semibold text-gray-900">
                Çerez Tercihleri
              </h3>
            </div>
            <button
              onClick={() => setShow(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message */}
          <p className="text-sm text-gray-600 mb-4">
            Web sitemizde size en iyi deneyimi sunmak için çerezler kullanıyoruz. 
            Çerez tercihlerinizi özelleştirebilir veya tümünü kabul edebilirsiniz.
          </p>

          {/* Details */}
          {showDetails && (
            <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">Gerekli Çerezler</span>
                  <p className="text-xs text-gray-500">Site işlevselliği için zorunlu</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.essential}
                  disabled
                  className="w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">Analitik Çerezler</span>
                  <p className="text-xs text-gray-500">Site kullanımını analiz eder</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
                  className="w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">Pazarlama Çerezleri</span>
                  <p className="text-xs text-gray-500">Kişiselleştirilmiş reklamlar</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences({...preferences, marketing: e.target.checked})}
                  className="w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">Tercih Çerezleri</span>
                  <p className="text-xs text-gray-500">Tercihlerinizi hatırlar</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.preferences}
                  onChange={(e) => setPreferences({...preferences, preferences: e.target.checked})}
                  className="w-4 h-4"
                />
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => saveConsent(true)}
              className="flex-1 sm:flex-none bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              Tümünü Kabul Et
            </button>
            
            {showDetails ? (
              <button
                onClick={() => saveConsent(false)}
                className="flex-1 sm:flex-none border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Seçilenleri Kaydet
              </button>
            ) : (
              <button
                onClick={() => setShowDetails(true)}
                className="flex-1 sm:flex-none border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Özelleştir
              </button>
            )}

            <button
              onClick={() => saveConsent(false)}
              className="text-sm text-gray-600 hover:text-gray-900 px-3"
            >
              Sadece Gerekli
            </button>
          </div>

          {/* Privacy Policy Link */}
          <p className="mt-4 text-xs text-gray-500">
            Daha fazla bilgi için{' '}
            <a href="/gizlilik-politikasi" className="text-primary hover:underline">
              Gizlilik Politikamızı
            </a>{' '}
            inceleyebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
}
