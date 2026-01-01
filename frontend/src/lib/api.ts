// API Configuration
// Use direct backend URL in development to avoid Next.js rewrite issues
export const API_URL = process.env.NODE_ENV !== 'production' ? 'http://localhost:5000/api' : '/api';

// Log resolved API_URL during development to help detect misconfiguration like 
// an environment variable containing only a port (e.g. ':5000') which would
// cause requests to go to an invalid origin.
if (process.env.NODE_ENV !== 'production') {
  console.debug('[api] Using API_URL =', API_URL);
}

// Developer-time sanity check: ensure API_URL is a valid absolute or relative path.
if (process.env.NODE_ENV !== 'production' && /^:\d+$/.test(API_URL)) {
  console.error('[api] NEXT_PUBLIC_API_URL appears to be just a port (e.g. ":5000").\n' +
    'Please set NEXT_PUBLIC_API_URL to a valid origin or relative path (e.g. "http://localhost:5000/api" or "/api").');
}

// Helper function for API calls
export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  // Normalize base and endpoint to avoid accidental double-slashes or missing slashes.
  const normalizedBase = API_URL.endsWith('/') && API_URL.length > 1 ? API_URL.slice(0, -1) : API_URL;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${normalizedBase}${path}`;

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add authorization header if token exists (browser only)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    defaultOptions.headers = {
      ...defaultOptions.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  try {
    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
      // Try to read text first (some proxies return HTML on 502)
      const contentType = response.headers.get('content-type') || '';
      let body: any = null;
      let parsedJson: any = null;
      const rawText = await response.text().catch(() => null);

      // Debug: Log the raw response for debugging
      console.debug('API Response Debug:', {
        url,
        status: response.status,
        statusText: response.statusText,
        contentType,
        rawText: rawText ? rawText.slice(0, 500) : null
      });

      if (rawText && contentType.includes('application/json')) {
        try { parsedJson = JSON.parse(rawText); } catch { parsedJson = null; }
      }
      body = parsedJson || rawText || null;

      const message = (body && body.error) || response.statusText || `HTTP error! status: ${response.status}`;

      const err = new Error(message);
      // attach details for caller/debugging
      (err as any).status = response.status;
      (err as any).url = url;
      (err as any).body = body;
      (err as any).contentType = contentType;

      // Provide extra console details for 5xx errors (helpful for 502 debugging)
      if (response.status >= 500) {
        console.error('API 5xx response', { status: response.status, statusText: response.statusText, url, contentType, body: body && (typeof body === 'string' ? body.slice(0, 2000) : body) });
      }

      throw err;
    }

    // Return parsed JSON if any; handle empty responses
    const text = await response.text().catch(() => null);
    if (!text) return null;
    try { return JSON.parse(text); } catch { return text; }
  } catch (error) {
    // Build a safer log object even if error is not an Error instance
    const status = (error as any)?.status;
    const message = (error as any)?.message || String(error);

    // Detect common network error fingerprint from fetch in browsers
    const isNetworkError = typeof message === 'string' && message.toLowerCase().includes('failed to fetch');
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

    const logObj: any = { message, url, status, online };
    if ((error as any)?.body !== undefined) logObj.body = (error as any).body;
    if ((error as any)?.stack) logObj.stack = (error as any).stack;

    if (isNetworkError) {
      logObj.note = 'NetworkError: unable to reach API. Check backend server, CORS, or http/https mismatch.';
      console.error('API Network Error:', logObj);
    } else if (status !== 401) {
      console.error('API Error:', logObj);
    } else {
      // For 401s avoid noisy error logs; use debug instead so devtools are less cluttered
      console.debug('API 401:', logObj);
    }

    throw error;
  }
}

// API endpoints
export const api = {
  // Products
  getProducts: async (filters?: Record<string, any>) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    const resp = await fetchAPI(`/products${query ? `?${query}` : ''}`);
    // normalize response: backend returns an array, but some proxies or stubs
    // might return { products: [...] } — always return an array for callers.
    if (Array.isArray(resp)) return resp;
    if (resp && Array.isArray((resp as any).products)) return (resp as any).products;
    return [];
  },

  getProduct: (slug: string) => fetchAPI(`/products/${slug}`),

  createProduct: (data: any) => fetchAPI('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Categories
  getCategories: () => fetchAPI('/categories'),

  getCategory: (slug: string) => fetchAPI(`/categories/${slug}`),

  // Cart
  createSession: () => fetchAPI('/cart/session', {
    method: 'POST',
  }),

  getCart: (sessionId: string) => fetchAPI(`/cart/${sessionId}`),

  addToCart: (sessionId: string, data: any) => fetchAPI(`/cart/${sessionId}/add`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateCartItem: (sessionId: string, data: { product_id: number; quantity: number }) => fetchAPI(`/cart/${sessionId}/update`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  removeFromCart: (sessionId: string, productId: number) => fetchAPI(`/cart/${sessionId}/remove/${productId}`, {
    method: 'DELETE',
  }),

  clearCart: (sessionId: string) => fetchAPI(`/cart/${sessionId}`, {
    method: 'DELETE',
  }),

  // Orders
  getOrders: () => fetchAPI('/orders'),

  createOrder: (data: any) => fetchAPI('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getOrder: (id: string) => fetchAPI(`/orders/${id}`),

  // Favorites
  getFavorites: (userId: number) => fetchAPI(`/favorites/${userId}`),

  addToFavorites: (userId: number, productId: number) => fetchAPI(`/favorites/${userId}/${productId}`, {
    method: 'POST',
  }),

  removeFromFavorites: (userId: number, productId: number) => fetchAPI(`/favorites/${userId}/${productId}`, {
    method: 'DELETE',
  }),

  clearFavorites: (userId: number) => fetchAPI(`/favorites/${userId}`, {
    method: 'DELETE',
  }),

  // Reviews
  getProductReviews: (productId: number, page?: number, limit?: number) =>
    fetchAPI(`/reviews/product/${productId}${page ? `?page=${page}&limit=${limit || 10}` : ''}`),

  addReview: (productId: number, data: { rating: number; comment: string }) =>
    fetchAPI(`/reviews/product/${productId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateReview: (reviewId: number, data: { rating: number; comment: string }) =>
    fetchAPI(`/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteReview: (reviewId: number) =>
    fetchAPI(`/reviews/${reviewId}`, {
      method: 'DELETE',
    }),

  getAllReviews: (page?: number, limit?: number) =>
    fetchAPI(`/reviews/admin/all${page ? `?page=${page}&limit=${limit || 20}` : ''}`),

  updateReviewStatus: (reviewId: number, isApproved: boolean) =>
    fetchAPI(`/reviews/admin/${reviewId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isApproved }),
    }),

  // Auth
  login: (email: string, password: string) => fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),

  register: (data: any) => fetchAPI('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  verifyToken: (token: string) => fetchAPI('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  }),
};

// Direct exports for convenience
export const getProducts = api.getProducts;
export const getProduct = api.getProduct;
export const getCategories = api.getCategories;
export const getCategory = api.getCategory;
