// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

// Helper function to get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Helper function to make API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle connection errors
    if (!response.ok) {
      // Handle 401 Unauthorized
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        throw new Error('Authentication required. Please login again.');
      }

      // Try to parse a real error message out of the response body. Note: the throw
      // must happen outside this try — throwing inside it would just be caught by
      // this same catch below, so the real backend message never reached the caller.
      let message = `Server error: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json();
        if (errorBody?.message) {
          message = errorBody.message;
        }
      } catch (parseError) {
        // Response wasn't JSON — fall back to the generic message above.
      }
      throw new Error(message);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    // Return null for empty responses
    return null;
  } catch (error) {
    // Handle network errors (connection refused, etc.)
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Cannot connect to backend server. Please ensure the backend is running on http://localhost:5001');
    }
    throw error;
  }
};

// Customer API
export const customerAPI = {
  getAll: () => apiCall('/customers'),
  getPaged: (page = 0, size = 10, sortBy = 'createdAt', direction = 'desc', search = '') => {
    const params = new URLSearchParams({ page, size, sort: `${sortBy},${direction}` })
    if (search.trim()) params.set('search', search.trim())
    return apiCall(`/customers/paged?${params.toString()}`)
  },
  getById: (id) => apiCall(`/customers/${id}`),
  search: (keyword) => apiCall(`/customers/search?keyword=${encodeURIComponent(keyword)}`),
  create: (customer) => apiCall('/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  }),
  update: (id, customer) => apiCall(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customer),
  }),
  delete: (id) => apiCall(`/customers/${id}`, {
    method: 'DELETE',
  }),
};

// Order API
export const orderAPI = {
  getById: (id) => apiCall(`/orders/${id}`),
  getByCustomerId: (customerId) => apiCall(`/orders/customer/${customerId}`),
  getByCashier: (cashierId) => apiCall(`/orders/cashier/${cashierId}`),
  getByBranch: (branchId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.customerId) params.append('customerId', filters.customerId);
    if (filters.cashierId) params.append('cashierId', filters.cashierId);
    if (filters.paymentType) params.append('paymentType', filters.paymentType);
    if (filters.orderStatus) params.append('orderStatus', filters.orderStatus);
    const queryString = params.toString();
    return apiCall(`/orders/branch/${branchId}${queryString ? `?${queryString}` : ''}`);
  },
  getByBranchPaged: (branchId, page = 0, size = 10, sortBy = 'createdAt', direction = 'desc') => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sortBy,
      direction,
    });
    return apiCall(`/orders/branch/${branchId}/paged?${params.toString()}`);
  },
  getSystemPaged: ({ page = 0, size = 10, sortBy = 'createdAt', direction = 'desc', search = '', status = '', storeId = '' } = {}) => {
    const params = new URLSearchParams({ page, size, sortBy, direction });
    if (search.trim()) params.set('search', search.trim());
    if (status) params.set('status', status);
    if (storeId) params.set('storeId', storeId);
    return apiCall(`/orders/system/paged?${params.toString()}`);
  },
  getSystemSummary: () => apiCall('/orders/system/summary'),
  getTodayByBranch: (branchId) => apiCall(`/orders/today/branch/${branchId}`),
  getRecentByBranch: (branchId) => apiCall(`/orders/recent/${branchId}`),
  create: (orderDto) => apiCall('/orders', {
    method: 'POST',
    body: JSON.stringify(orderDto),
  }),
  update: (id, orderDto) => apiCall(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(orderDto),
  }),
  delete: (id) => apiCall(`/orders/${id}`, {
    method: 'DELETE',
  }),
};

// Product API
export const productAPI = {
  getAll: () => apiCall('/products/public/all'), // Use public endpoint for testing
  getAllAuth: () => apiCall('/products/all'), // Use authenticated endpoint if token is available
  getByStoreId: (storeId) => apiCall(`/products/storeId/${storeId}`),
  getByStoreIdPaged: (storeId, page = 0, size = 10, sortBy = 'createdAt', direction = 'desc', search = '') => {
    const params = new URLSearchParams({ page, size, sort: `${sortBy},${direction}` });
    if (search.trim()) params.set('search', search.trim());
    return apiCall(`/products/storeId/${storeId}/paged?${params.toString()}`);
  },
  search: (storeId, keyword) => apiCall(`/products/search/${storeId}/${encodeURIComponent(keyword)}`),
  create: (productDto) => apiCall('/products', {
    method: 'POST',
    body: JSON.stringify(productDto),
  }),
  update: (id, productDto) => apiCall(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productDto),
  }),
  delete: (id) => apiCall(`/products/${id}`, {
    method: 'DELETE',
  }),
};

// Auth API
export const authAPI = {
  login: (credentials) => {
    // Login endpoint doesn't require token
    const baseURL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5001'
    return fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    }).then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Server error: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorMessage
        } catch (e) {
          // If not JSON, use the text as is
        }
        throw new Error(errorMessage)
      }
      return response.json()
    })
  },
  signup: (userData) => {
    // Signup endpoint doesn't require token
    const baseURL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5001'
    return fetch(`${baseURL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    }).then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Server error: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorMessage
        } catch (e) {
          // If not JSON, use the text as is
        }
        throw new Error(errorMessage)
      }
      return response.json()
    })
  },
};

// Branch API
export const branchAPI = {
  getById: (id) => apiCall(`/branches/${id}`),
  getByStoreId: (storeId) => apiCall(`/branches/store/${storeId}`),
  update: (id, branchDto) => apiCall(`/branches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(branchDto),
  }),
  create: (branchDto) => apiCall('/branches', {
    method: 'POST',
    body: JSON.stringify(branchDto),
  }),
  delete: (id) => apiCall(`/branches/${id}`, {
    method: 'DELETE',
  }),
};

// Store API
export const storeAPI = {
  getAll: () => apiCall('/stores'),
  getById: (id) => apiCall(`/stores/${id}`),
  getByAdmin: () => apiCall('/stores/admin'),
  create: (storeDto) => apiCall('/stores', {
    method: 'POST',
    body: JSON.stringify(storeDto),
  }),
  update: (id, storeDto) => apiCall(`/stores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(storeDto),
  }),
  delete: (id) => apiCall(`/stores/${id}`, {
    method: 'DELETE',
  }),
  moderate: (id, status) => {
    // Backend expects a StoreStatusDto: { "status": "ACTIVE" }
    return apiCall(`/stores/${id}/moderate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    })
  },
};

// User API
export const userAPI = {
  getProfile: () => apiCall('/users/profile'),
  getById: (id) => apiCall(`/users/${id}`),
  getAll: () => apiCall('/users/all'),
  getPaged: ({ page = 0, size = 10, sortBy = 'createdAt', direction = 'desc', search = '', role = '' } = {}) => {
    const params = new URLSearchParams({ page, size, sortBy, direction });
    if (search.trim()) params.set('search', search.trim());
    if (role) params.set('role', role);
    return apiCall(`/users/paged?${params.toString()}`);
  },
};

// Category API
export const categoryAPI = {
  getByStoreId: (storeId) => apiCall(`/categories/store/${storeId}`),
  create: (categoryDto) => apiCall('/categories', {
    method: 'POST',
    body: JSON.stringify(categoryDto),
  }),
  update: (id, categoryDto) => apiCall(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(categoryDto),
  }),
  delete: (id) => apiCall(`/categories/${id}`, {
    method: 'DELETE',
  }),
};

// Employee API
export const employeeAPI = {
  createStoreEmployee: (storeId, employeeDto) => apiCall(`/employees/store/${storeId}`, {
    method: 'POST',
    body: JSON.stringify(employeeDto),
  }),
  createBranchEmployee: (branchId, employeeDto) => apiCall(`/employees/branch/${branchId}`, {
    method: 'POST',
    body: JSON.stringify(employeeDto),
  }),
  updateEmployee: (employeeId, employeeDto) => apiCall(`/employees/${employeeId}`, {
    method: 'PUT',
    body: JSON.stringify(employeeDto),
  }),
  deleteEmployee: (employeeId) => apiCall(`/employees/${employeeId}`, {
    method: 'DELETE',
  }),
  getByStore: (storeId, role) => {
    const params = role ? `?role=${role}` : '';
    return apiCall(`/employees/store/${storeId}${params}`);
  },
  getByBranch: (branchId, role) => {
    const params = role ? `?role=${role}` : '';
    return apiCall(`/employees/branch/${branchId}${params}`);
  },
};

// Shift Report API
export const shiftReportAPI = {
  getCurrent: (cashierId) => apiCall(`/shift-reports/current${cashierId ? `?cashierId=${cashierId}` : ''}`),
  getById: (id) => apiCall(`/shift-reports/${id}`),
  getAll: () => apiCall('/shift-reports'),
  getByCashier: (cashierId) => apiCall(`/shift-reports/cashier/${cashierId}`),
  getByBranch: (branchId) => apiCall(`/shift-reports/branch/${branchId}`),
  startShift: (cashierId, branchId) => apiCall(`/shift-reports/start?cashierId=${cashierId}&branchId=${branchId}`, {
    method: 'POST',
  }),
  endShift: (shiftReportId) => apiCall(`/shift-reports/end?shiftReportId=${shiftReportId}`, {
    method: 'PATCH',
  }),
};

// Refund API
export const refundAPI = {
  getAll: () => apiCall('/refunds'),
  getById: (id) => apiCall(`/refunds/${id}`),
  getByCashier: (cashierId) => apiCall(`/refunds/cashier/${cashierId}`),
  getByBranch: (branchId) => apiCall(`/refunds/branch/${branchId}`),
  getByShift: (shiftReportId) => apiCall(`/refunds/shift/${shiftReportId}`),
  getByOrder: (orderId) => apiCall(`/refunds/order/${orderId}`),
  create: (refundDto) => apiCall('/refunds', {
    method: 'POST',
    body: JSON.stringify(refundDto),
  }),
  delete: (id) => apiCall(`/refunds/${id}`, {
    method: 'DELETE',
  }),
};

// Inventory API
export const inventoryAPI = {
  getByBranch: (branchId) => apiCall(`/inventories/branch/${branchId}`),
  getByProductAndBranch: (productId, branchId) => apiCall(`/inventories/product/${productId}/branch/${branchId}`),
  create: (inventoryDto) => apiCall('/inventories', {
    method: 'POST',
    body: JSON.stringify(inventoryDto),
  }),
  update: (id, inventoryDto) => apiCall(`/inventories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(inventoryDto),
  }),
  delete: (id) => apiCall(`/inventories/${id}`, {
    method: 'DELETE',
  }),
};

// Payment API
export const paymentAPI = {
  createOrder: (data) => apiCall(`/payments/create-order?amount=${data.amount}&currency=${data.currency}`, {
    method: 'POST',
  }),
  verifyPayment: (data) => apiCall('/payments/verify-payment', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Subscription Plan API
export const subscriptionPlanAPI = {
  getAll: () => apiCall('/subscription-plans'),
  getById: (id) => apiCall(`/subscription-plans/${id}`),
  create: (planDto) => apiCall('/subscription-plans', {
    method: 'POST',
    body: JSON.stringify(planDto),
  }),
  update: (id, planDto) => apiCall(`/subscription-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(planDto),
  }),
  delete: (id) => apiCall(`/subscription-plans/${id}`, {
    method: 'DELETE',
  }),
};

// Store Dashboard API — single aggregate call behind the store-admin dashboard.
// Everything it returns is derived server-side from the store's own orders.
export const dashboardAPI = {
  getStoreDashboard: (storeId, { period = '7D', granularity = '' } = {}) => {
    const params = new URLSearchParams({ period });
    if (granularity) params.set('granularity', granularity);
    return apiCall(`/dashboard/store/${storeId}?${params.toString()}`);
  },
};

// System Settings API
export const settingsAPI = {
  get: () => apiCall('/settings'),
  update: (settingsDto) => apiCall('/settings', {
    method: 'PUT',
    body: JSON.stringify(settingsDto),
  }),
};
