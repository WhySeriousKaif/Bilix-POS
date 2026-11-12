import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import SuperAdminLayout from '@/pages/super-admin/layout/SuperAdminLayout'
import Dashboard from '@/pages/super-admin/DashboardModern'
import StoresPage from '@/pages/super-admin/stores/StoresPage'
import PendingRequestsPage from '@/pages/super-admin/pending-requests/PendingRequestsPage'
import SubscriptionPlansPage from '@/pages/super-admin/subscription-plans/SubscriptionPlansPage'
import ExportsPage from '@/pages/super-admin/exports/ExportsPage'
import SettingsPage from '@/pages/super-admin/settings/SettingsPage'
import SalesPage from '@/pages/super-admin/sales/SalesPage'
import UsersPage from '@/pages/super-admin/users/UsersPage'
import AssistantPage from '@/pages/shared/AssistantPage'

const SuperAdminRoutes = () => {
  return (
    <SuperAdminLayout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="stores" element={<StoresPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="subscription-plans" element={<SubscriptionPlansPage />} />
        <Route path="pending-requests" element={<PendingRequestsPage />} />
        <Route path="exports" element={<ExportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="assistant" element={<AssistantPage mode="system" />} />
        <Route path="*" element={<Navigate to="/super-admin" replace />} />
      </Routes>
    </SuperAdminLayout>
  )
}

export default SuperAdminRoutes

