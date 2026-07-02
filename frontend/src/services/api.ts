const API_URL = 'http://localhost:3001/api';

// Helper to get auth header
function getHeaders(): HeadersInit {
  const token = localStorage.getItem('antara_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

// Global fetch wrapper with error handling
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Ocurrió un error al procesar la solicitud.');
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Authentication
  auth: {
    login: (credentials: { username: string; password?: string }) => 
      request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      }),
    me: () => request<{ user: any }>('/auth/me'),
    getUsers: () => request<any[]>('/auth/users'),
    createUser: (data: any) => request<any>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    updateUser: (id: number, data: any) => request<any>(`/auth/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    deleteUser: (id: number) => request<any>(`/auth/users/${id}`, {
      method: 'DELETE'
    })
  },

  // Products & Variants
  products: {
    list: (filters: { search?: string; category_id?: number; brand_id?: number; owner_id?: number; status?: number } = {}) => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category_id) params.append('category_id', filters.category_id.toString());
      if (filters.brand_id) params.append('brand_id', filters.brand_id.toString());
      if (filters.owner_id) params.append('owner_id', filters.owner_id.toString());
      if (filters.status !== undefined) params.append('status', filters.status.toString());
      return request<any[]>(`/products?${params.toString()}`);
    },
    get: (id: number) => request<any>(`/products/${id}`),
    create: (data: any) => request<any>('/products', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id: number, data: any) => request<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id: number) => request<any>(`/products/${id}`, {
      method: 'DELETE'
    }),
    getVariant: (id: number) => request<any>(`/products/variants/${id}`),
    getByBarcode: (barcode: string) => request<any>(`/products/barcode/${barcode}`)
  },

  // Catalogs: Categories, Brands, Owners
  catalogs: {
    // Categories
    listCategories: () => request<any[]>('/catalogs/categories'),
    createCategory: (data: any) => request<any>('/catalogs/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    updateCategory: (id: number, data: any) => request<any>(`/catalogs/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    deleteCategory: (id: number) => request<any>(`/catalogs/categories/${id}`, {
      method: 'DELETE'
    }),

    // Brands
    listBrands: () => request<any[]>('/catalogs/brands'),
    createBrand: (data: any) => request<any>('/catalogs/brands', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    updateBrand: (id: number, data: any) => request<any>(`/catalogs/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    deleteBrand: (id: number) => request<any>(`/catalogs/brands/${id}`, {
      method: 'DELETE'
    }),

    // Owners
    listOwners: () => request<any[]>('/catalogs/owners'),
    createOwner: (data: any) => request<any>('/catalogs/owners', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    updateOwner: (id: number, data: any) => request<any>(`/catalogs/owners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    deleteOwner: (id: number) => request<any>(`/catalogs/owners/${id}`, {
      method: 'DELETE'
    })
  },

  // Customers
  customers: {
    list: (search?: string) => {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      return request<any[]>(`/customers${q}`);
    },
    get: (id: number) => request<any>(`/customers/${id}`),
    getHistory: (id: number) => request<any[]>(`/customers/${id}/history`),
    create: (data: any) => request<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id: number, data: any) => request<any>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id: number) => request<any>(`/customers/${id}`, {
      method: 'DELETE'
    })
  },

  // Inventory
  inventory: {
    listMovements: (filters: { variant_id?: number; type?: string; startDate?: string; endDate?: string; search?: string } = {}) => {
      const params = new URLSearchParams();
      if (filters.variant_id) params.append('variant_id', filters.variant_id.toString());
      if (filters.type) params.append('type', filters.type);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.search) params.append('search', filters.search);
      return request<any[]>(`/inventory/movements?${params.toString()}`);
    },
    addMovement: (data: { variant_id: number; type: string; quantity: number; notes?: string }) => 
      request<any>('/inventory/movements', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  // Sales
  sales: {
    list: (filters: { client_id?: number; user_id?: number; payment_method?: string; status?: string; startDate?: string; endDate?: string; search?: string } = {}) => {
      const params = new URLSearchParams();
      if (filters.client_id) params.append('client_id', filters.client_id.toString());
      if (filters.user_id) params.append('user_id', filters.user_id.toString());
      if (filters.payment_method) params.append('payment_method', filters.payment_method);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.search) params.append('search', filters.search);
      return request<any[]>(`/sales?${params.toString()}`);
    },
    get: (id: number) => request<any>(`/sales/${id}`),
    create: (data: {
      client_id?: number | null;
      total: number;
      subtotal: number;
      discount: number;
      tax: number;
      payment_method: string;
      cash_received?: number;
      card_received?: number;
      transfer_received?: number;
      notes?: string;
      items: { variant_id: number; quantity: number; unit_price: number; discount: number; total: number }[];
    }) => request<any>('/sales', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    cancel: (id: number) => request<any>(`/sales/${id}/cancel`, {
      method: 'POST'
    })
  },

  // Settings
  settings: {
    get: () => request<Record<string, string>>('/settings'),
    save: (data: Record<string, string>) => request<any>('/settings', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  // Reports
  reports: {
    dashboard: () => request<any>('/reports/dashboard'),
    analytics: (startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      return request<any>(`/reports/analytics?${params.toString()}`);
    }
  }
};
export default api;
