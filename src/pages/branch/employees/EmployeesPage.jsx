import React, { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, Search, Users, UserCheck, ShieldCheck, Mail, Phone, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  EmptyState,
  LoadingState,
  MetricCard,
  PageHeader,
  Panel,
  SearchField,
  TablePagination,
  formatNumber,
  pillClass,
  thClass,
  tdClass,
  trClass,
} from '@/components/ui/page'
import { userAPI, shiftReportAPI, employeeAPI } from '@/services/api'
import { toast } from 'sonner'

const rolePill = (role) => {
  if (!role) return pillClass('slate')
  if (role.includes('MANAGER')) return pillClass('indigo')
  if (role.includes('CASHIER')) return pillClass('blue')
  return pillClass('slate')
}

const getRoleDisplay = (role) => {
  if (!role) return 'Cashier'
  return role.replace('ROLE_', '').replace(/_/g, ' ')
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [branchId, setBranchId] = useState(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newEmployee, setNewEmployee] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'ROLE_BRANCH_CASHIER',
  })
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [revision, setRevision] = useState(0)

  const fetchBranchId = useCallback(async () => {
    try {
      const profile = await userAPI.getProfile()
      if (!profile?.branchId) throw new Error('No branch is assigned to this account.')
      setBranchId(profile.branchId)
    } catch (error) {
      console.error('Error fetching branch ID:', error)
      toast.error(error.message || 'Could not identify your branch')
      setLoading(false)
    }
  }, [])

  const fetchEmployees = useCallback(async () => {
    if (!branchId) return
    try {
      setLoading(true)
      const branchEmployees = await employeeAPI.getByBranch(branchId)
      try {
        const shifts = await shiftReportAPI.getByBranch(branchId).catch(() => [])
        const activeShiftCashiers = new Set()
        shifts.forEach((shift) => {
          if (shift.shiftStart && !shift.shiftEnd && shift.cashier?.id) {
            activeShiftCashiers.add(shift.cashier.id)
          }
        })
        setEmployees(
          branchEmployees.map((emp) => ({
            ...emp,
            isActive: activeShiftCashiers.has(emp.id),
          })),
        )
      } catch (err) {
        setEmployees(branchEmployees.map((emp) => ({ ...emp, isActive: false })))
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to load employees')
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    fetchBranchId()
  }, [fetchBranchId])

  useEffect(() => {
    if (branchId) {
      fetchEmployees()
    }
  }, [branchId, revision, fetchEmployees])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEmployees(employees)
      setPage(0)
      return
    }
    const query = searchQuery.toLowerCase()
    const filtered = employees.filter((employee) => {
      const name = employee.fullName?.toLowerCase() || employee.name?.toLowerCase() || ''
      const email = employee.email?.toLowerCase() || ''
      const phone = employee.phone?.toLowerCase() || ''
      const role = employee.role?.toLowerCase() || ''
      return name.includes(query) || email.includes(query) || phone.includes(query) || role.includes(query)
    })
    setFilteredEmployees(filtered)
    setPage(0)
  }, [searchQuery, employees])

  const handleAddEmployee = async () => {
    try {
      if (!newEmployee.fullName || !newEmployee.email || !newEmployee.password) {
        toast.error('Please fill all required fields (Name, Email, Password)')
        return
      }
      if (!branchId) throw new Error('No branch is assigned to this account.')
      await employeeAPI.createBranchEmployee(branchId, newEmployee)
      setIsAddDialogOpen(false)
      setNewEmployee({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        role: 'ROLE_BRANCH_CASHIER',
      })
      setRevision((n) => n + 1)
      toast.success('Employee added successfully!')
    } catch (error) {
      console.error('Error adding employee:', error)
      toast.error(error.message || 'Error adding employee')
    }
  }

  const summary = {
    total: employees.length,
    active: employees.filter((emp) => emp.isActive).length,
    cashiers: employees.filter((emp) => emp.role?.includes('CASHIER')).length,
    managers: employees.filter((emp) => emp.role?.includes('MANAGER')).length,
  }

  const pages = Math.ceil(filteredEmployees.length / pageSize)
  const visible = filteredEmployees.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Staff"
        badge={`${employees.length} staff members`}
        badgeTone="indigo"
        description="Manage cashiers, floor staff and branch credentials."
        actions={
          <>
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5">
              <Plus className="size-4" /> Add New Staff
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRevision((n) => n + 1)} className="text-xs font-semibold gap-1.5">
              <RefreshCw className="size-3.5" /> Refresh
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Staff" value={formatNumber(summary.total)} icon={Users} tone="blue" />
        <MetricCard label="On Active Shift" value={formatNumber(summary.active)} icon={UserCheck} tone="emerald" />
        <MetricCard label="POS Cashiers" value={formatNumber(summary.cashiers)} icon={ShieldCheck} tone="indigo" />
        <MetricCard label="Branch Managers" value={formatNumber(summary.managers)} icon={Users} tone="violet" />
      </div>

      <Panel title="Staff directory" subtitle="Branch employees only" bodyClassName="p-0">
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4 dark:border-white/10">
          <SearchField className="min-w-64" value={searchQuery} onChange={(value) => setSearchQuery(value)} placeholder="Search by name, email, phone or role…" />
        </div>
        {loading ? (
          <LoadingState label="Loading branch staff…" />
        ) : visible.length === 0 ? (
          <EmptyState icon={Users} title="No staff members found" hint="Try adjusting your search or add a new staff member." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr>
                  <th className={thClass()}>Staff Member</th>
                  <th className={thClass()}>Email</th>
                  <th className={thClass()}>Phone</th>
                  <th className={thClass()}>Role</th>
                  <th className={thClass()}>Shift Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((employee) => (
                  <tr key={employee.id} className={trClass}>
                    <td className={tdClass()}>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white">
                          {(employee.fullName || employee.name || 'S')[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{employee.fullName || employee.name || 'Staff Member'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">ID: #{employee.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className={tdClass()}>
                      <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Mail className="size-3.5 text-slate-400" />
                        {employee.email || '—'}
                      </span>
                    </td>
                    <td className={tdClass()}>
                      <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Phone className="size-3.5 text-slate-400" />
                        {employee.phone || '—'}
                      </span>
                    </td>
                    <td className={tdClass()}>
                      <span className={rolePill(employee.role)}>{getRoleDisplay(employee.role)}</span>
                    </td>
                    <td className={tdClass()}>
                      {employee.isActive ? (
                        <span className={pillClass('emerald')}>On Shift</span>
                      ) : (
                        <span className={pillClass('slate')}>Offline</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={filteredEmployees.length}
          totalPages={pages}
          unit="staff"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPage(0)
            setPageSize(size)
          }}
        />
      </Panel>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register New Staff Member</DialogTitle>
            <DialogDescription>Enter employee information and login credentials.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
              <Input value={newEmployee.fullName} onChange={(e) => setNewEmployee({ ...newEmployee, fullName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address *</label>
              <Input type="email" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phone Number</label>
              <Input type="tel" value={newEmployee.phone} onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password *</label>
              <Input type="password" value={newEmployee.password} onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Role *</label>
              <Select value={newEmployee.role} onValueChange={(value) => setNewEmployee({ ...newEmployee, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROLE_BRANCH_CASHIER">Branch Cashier</SelectItem>
                  <SelectItem value="ROLE_CASHIER">Standard Cashier</SelectItem>
                  <SelectItem value="ROLE_BRANCH_MANAGER">Branch Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEmployee} className="bg-blue-600 text-white hover:bg-blue-700">
              Create Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
