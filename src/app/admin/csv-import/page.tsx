'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function CSVImportPage() {
  const [csvData, setCsvData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{success: boolean; message: string} | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Admin authentication kontrolü
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      router.push('/admin/giris');
      return;
    }
  }, [router]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvData(content);
      };
      reader.readAsText(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'text/csv') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setCsvData(content);
        };
        reader.readAsText(file);
      }
    }
  };

  const handleImport = async () => {
    if (!csvData.trim()) {
      setImportResult({
        success: false,
        message: 'CSV verisi boş olamaz'
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/import-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ csvData }),
      });

      const data = await response.json();

      if (response.ok) {
        setImportResult({
          success: true,
          message: data.message
        });
        setCsvData('');
      } else {
        setImportResult({
          success: false,
          message: data.message || 'Import başarısız'
        });
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: 'Import sırasında bir hata oluştu'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = `name,slug,description,price,compare_price,category_slug,image_url,images,stock_status,is_featured,is_new
Minimal Siyah Elbise,minimal-siyah-elbise,"Şık ve zarif siyah elbise",1250,1650,elbiseler,https://example.com/img1.jpg,"img1.jpg|img2.jpg",in_stock,1,1
Boho Bluz,boho-bluz,"Rahat ve şık boho tarzı bluz",450,600,ustler,https://example.com/img2.jpg,"img2.jpg",in_stock,0,0
Skinny Jean,skinny-jean,"Modern skinny jean pantolon",890,1200,altlar,https://example.com/img3.jpg,"img3.jpg",in_stock,1,0`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            ← Admin Paneli
          </Link>
          <h1 className="text-3xl font-bold">CSV’den Ürün Import</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">CSV Formatı</h2>
            <p className="text-gray-600 mb-4">
              Aşağıdaki formatta CSV dosyası yükleyin:
            </p>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <code className="text-sm">
                name,slug,description,price,compare_price,category_slug,image_url,images,stock_status,is_featured,is_new
              </code>
            </div>

            <div className="flex gap-4">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download size={16} />
                Template İndir
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">CSV Dosyası Yükle</h3>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">
                CSV dosyanızı sürükleyin ve bırakın veya
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer transition-colors"
              >
                Dosya Seç
              </label>
            </div>
          </div>

          {csvData && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">CSV İçeriği Önizleme</h3>
              <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {csvData.slice(0, 500)}
                  {csvData.length > 500 && '...'}
                </pre>
              </div>
            </div>
          )}

          {importResult && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              importResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {importResult.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span>{importResult.message}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleImport}
              disabled={!csvData.trim() || isImporting}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Import Ediliyor...
                </>
              ) : (
                <>
                  <FileText size={16} />
                  CSV Import Et
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
