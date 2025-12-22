'use client';

import { useState } from 'react';
import { Tag, X, Check } from 'lucide-react';
import { ButtonLoader } from './LoadingSpinner';

interface CouponInputProps {
  cartTotal: number;
  onApply: (couponData: any) => void;
  onRemove: () => void;
  appliedCoupon?: {
    code: string;
    discount_amount: number;
  };
}

export default function CouponInput({ cartTotal, onApply, onRemove, appliedCoupon }: CouponInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApply = async () => {
    if (!code.trim()) {
      setError('Lütfen bir kupon kodu girin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.toUpperCase().trim(),
          cart_total: cartTotal
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kupon uygulanamadı');
      }

      if (data.valid) {
        onApply(data);
        setCode('');
        setError('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setCode('');
    setError('');
    onRemove();
  };

  if (appliedCoupon) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">
                Kupon Uygulandı: {appliedCoupon.code}
              </p>
              <p className="text-sm text-green-700">
                İndirim: -{appliedCoupon.discount_amount.toFixed(2)} TL
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="text-green-600 hover:text-green-800 p-1"
            aria-label="Kuponu kaldır"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Tag className="w-4 h-4" />
        İndirim Kuponu
      </label>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError('');
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleApply()}
          placeholder="Kupon kodunu girin"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent uppercase"
          disabled={loading}
        />
        <button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? <ButtonLoader /> : 'Uygula'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <X className="w-4 h-4" />
          {error}
        </p>
      )}

      <p className="text-xs text-gray-500">
        Kupon kodunuz varsa yukarıdaki alana girerek indirimden yararlanabilirsiniz.
      </p>
    </div>
  );
}
