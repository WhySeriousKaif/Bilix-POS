import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from '@/pages/branch/Dashboard'
import BranchLayout from '@/pages/branch/layout/BranchLayout'
import OrdersPage from '@/pages/branch/orders/OrdersPage'
import RefundsPage from '@/pages/branch/refunds/RefundsPage'
import TransactionsPage from '@/pages/branch/transactions/TransactionsPage'
import InventoryPage from '@/pages/branch/inventory/InventoryPage'
import EmployeesPage from '@/pages/branch/employees/EmployeesPage'
import CustomersPage from '@/pages/branch/customers/CustomersPage'
import ReportsPage from '@/pages/branch/reports/ReportsPage'
import SettingsPage from '@/pages/branch/settings/SettingsPage'
import AssistantPage from '@/pages/shared/AssistantPage'

// Use the actual Dashboard component
const BranchDashboard = Dashboard

const BranchRoutes = () => {
  return (
    <BranchLayout>
      <Routes>
        <Route index element={<BranchDashboard />} />
        <Route path="dashboard" element={<BranchDashboard />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="refunds" element={<RefundsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="assistant" element={<AssistantPage mode="branch" />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/branch" replace />} />
      </Routes>
    </BranchLayout>
  )
}

export default BranchRoutes

