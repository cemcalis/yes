'use client';

import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

interface FilterOptions {
  colors: Array<{ color: string; hex: string }>;
  sizes: string[];
  materials: string[];
  price_range: { min_price: number; max_price: number };
}

interface SearchFiltersProps {
  onSearch: (filters: any) => void;
  category?: string;
}

export default function SearchFilters({ onSearch, category }: SearchFiltersProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    min_price: '',
    max_price: '',
    colors: [] as string[],
    sizes: [] as string[],
    materials: [] as string[],
    sort: 'relevance',
    in_stock_only: false
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch available filters
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        
        const response = await fetch(`/api/search/filters?${params}`);
        const data = await response.json();
        setFilterOptions(data);
      } catch (error) {
        console.error('Failed to fetch filters:', error);
      }
    };

    fetchFilters();
  }, [category]);

  // Autocomplete
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        setSuggestions([...data.products, ...data.queries]);
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSearch = () => {
    const searchParams = {
      q: query,
      category,
      ...filters,
      colors: filters.colors.join(','),
      sizes: filters.sizes.join(','),
      materials: filters.materials.join(',')
    };

    onSearch(searchParams);
    setShowSuggestions(false);
  };

  const toggleArrayFilter = (key: 'colors' | 'sizes' | 'materials', value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value]
    }));
  };

  const clearFilters = () => {
    setFilters({
      min_price: '',
      max_price: '',
      colors: [],
      sizes: [],
      materials: [],
      sort: 'relevance',
      in_stock_only: false
    });
  };

  const activeFilterCount = 
    filters.colors.length +
    filters.sizes.length +
    filters.materials.length +
    (filters.min_price ? 1 : 0) +
    (filters.max_price ? 1 : 0) +
    (filters.in_stock_only ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Ürün ara..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <SlidersHorizontal className="w-5 h-5" />
            Filtreler
            {activeFilterCount > 0 && (
              <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Ara
          </button>
        </div>

        {/* Autocomplete Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-auto">
            {suggestions.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  if (item.type === 'product') {
                    window.location.href = `/urun/${item.slug}`;
                  } else {
                    setQuery(item.text);
                    handleSearch();
                  }
                }}
                className="w-full px-4 py-3 hover:bg-gray-50 text-left flex items-center gap-3"
              >
                {item.type === 'product' ? (
                  <>
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.price} TL</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{item.text}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && filterOptions && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Filtreler</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Temizle
              </button>
            )}
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium mb-2">Sıralama</label>
            <select
              value={filters.sort}
              onChange={(e) => setFilters({...filters, sort: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="relevance">En Uygun</option>
              <option value="price_asc">Fiyat: Düşükten Yükseğe</option>
              <option value="price_desc">Fiyat: Yüksekten Düşüğe</option>
              <option value="newest">En Yeni</option>
              <option value="rating">En Popüler</option>
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium mb-2">Fiyat Aralığı</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.min_price}
                onChange={(e) => setFilters({...filters, min_price: e.target.value})}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.max_price}
                onChange={(e) => setFilters({...filters, max_price: e.target.value})}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            {filterOptions.price_range && (
              <p className="text-xs text-gray-500 mt-1">
                {filterOptions.price_range.min_price} TL - {filterOptions.price_range.max_price} TL
              </p>
            )}
          </div>

          {/* Colors */}
          {filterOptions.colors.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Renk</label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.colors.map((color) => (
                  <button
                    key={color.color}
                    onClick={() => toggleArrayFilter('colors', color.color)}
                    className={`px-3 py-1 rounded-full border text-sm ${
                      filters.colors.includes(color.color)
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-300 hover:border-primary'
                    }`}
                  >
                    {color.color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {filterOptions.sizes.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Beden</label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => toggleArrayFilter('sizes', size)}
                    className={`px-3 py-1 rounded-lg border text-sm ${
                      filters.sizes.includes(size)
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-300 hover:border-primary'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Materials */}
          {filterOptions.materials.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Malzeme</label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.materials.map((material) => (
                  <button
                    key={material}
                    onClick={() => toggleArrayFilter('materials', material)}
                    className={`px-3 py-1 rounded-lg border text-sm ${
                      filters.materials.includes(material)
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-300 hover:border-primary'
                    }`}
                  >
                    {material}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* In Stock Only */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.in_stock_only}
              onChange={(e) => setFilters({...filters, in_stock_only: e.target.checked})}
              className="w-4 h-4"
            />
            <span className="text-sm">Sadece stokta olanları göster</span>
          </label>
        </div>
      )}
    </div>
  );
}
