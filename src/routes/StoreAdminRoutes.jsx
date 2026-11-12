import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import StoreAdminLayout from '@/pages/store/layout/StoreAdminLayout'
import Dashboard from '@/pages/store/Dashboard'
import ProductsPage from '@/pages/store/products/ProductsPage'
import StoresPage from '@/pages/store/stores/StoresPage'
import BranchesPage from '@/pages/store/branches/BranchesPage'
import CategoriesPage from '@/pages/store/categories/CategoriesPage'
import EmployeesPage from '@/pages/store/employees/EmployeesPage'
import AlertsPage from '@/pages/store/alerts/AlertsPage'
import SalesPage from '@/pages/store/sales/SalesPage'
import TransactionsPage from '@/pages/store/transactions/TransactionsPage'
import ReportsPage from '@/pages/store/reports/ReportsPage'
import SettingsPage from '@/pages/store/settings/SettingsPage'
import AssistantPage from '@/pages/shared/AssistantPage'

const StoreAdminRoutes = () => {
  return (
    <StoreAdminLayout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="stores" element={<StoresPage />} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="assistant" element={<AssistantPage mode="store" />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/store" replace />} />
      </Routes>
    </StoreAdminLayout>
  )
}

export default StoreAdminRoutes

