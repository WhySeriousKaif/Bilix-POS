import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, RefreshCw, Edit, Trash2, Mail, Phone, MapPin, Users } from 'lucide-react'
import { employeeAPI, userAPI, storeAPI, branchAPI } from '@/services/api'
import { toast } from 'sonner'
import { useConfirm } from '@/contexts/ConfirmContext'
import NoStoreBanner from '@/components/NoStoreBanner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const EmployeesPage = () => {
  const confirm = useConfirm()
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [storeId, setStoreId] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [branches, setBranches] = useState([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [newEmployee, setNewEmployee] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'ROLE_STORE_MANAGER',
    branchId: '',
  })
  const [editEmployee, setEditEmployee] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: '',
    branchId: '',
  })
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Available roles for store employees
  const employeeRoles = [
    { value: 'ROLE_STORE_MANAGER', label: 'Store Manager' },
    { value: 'ROLE_STORE_EMPLOYEE', label: 'Store Employee' },
    { value: 'ROLE_BRANCH_MANAGER', label: 'Branch Manager' },
    { value: 'ROLE_BRANCH_CASHIER', label: 'Branch Cashier' },
  ]

  useEffect(() => {
    fetchStoreId()
  }, [])

  useEffect(() => {
    if (storeId) {
      fetchEmployees()
      fetchBranches()
    }
  }, [storeId])

  useEffect(() => {
    filterEmployees()
  }, [searchQuery, employees])

  const fetchStoreId = async () => {
    try {
      const profile = await userAPI.getProfile()
      setCurrentUserId(profile?.id ?? null)
      if (profile?.storeId) {
        setStoreId(profile.storeId)
        return
      }
      const stores = await storeAPI.getByAdmin()
      if (stores && stores.length > 0) {
        setStoreId(stores[0].id)
        return
      }
      // No store yet — nothing will call setLoading(false) downstream, so do it here
      // or this page spins forever instead of showing the "no store yet" banner.
      setLoading(false)
    } catch (error) {
      console.error('Error fetching store ID:', error)
      setLoading(false)
    }
  }

  const fetchBranches = async () => {
    try {
      const data = await branchAPI.getByStoreId(storeId)
      setBranches(data || [])
    } catch (error) {
      console.error('Error fetching branches:', error)
      setBranches([])
    }
  }

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const data = await employeeAPI.getByStore(storeId)
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  const filterEmployees = () => {
    if (!searchQuery.trim()) {
      setFilteredEmployees(employees)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = employees.filter((employee) =>
      employee.fullName?.toLowerCase().includes(query) ||
      employee.email?.toLowerCase().includes(query) ||
      employee.phone?.toLowerCase().includes(query) ||
      employee.role?.toLowerCase().includes(query)
    )
    setFilteredEmployees(filtered)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    filterEmployees()
  }

  const handleOpenAddDialog = () => {
    if (!storeId) {
      toast.error('Create a store first before adding an employee.')
      return
    }
    setIsAddDialogOpen(true)
  }

  const handleAddEmployee = async () => {
    // Validate required fields
    if (!newEmployee.fullName || !newEmployee.fullName.trim()) {
      toast.error('Please enter employee full name')
      return
    }

    if (!newEmployee.email || !newEmployee.email.trim()) {
      toast.error('Please enter employee email address')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmployee.email.trim())) {
      toast.error('Please enter a valid email address')
      return
    }

    if (!newEmployee.password || newEmployee.password.length < 6) {
      toast.error('Please enter a password (minimum 6 characters)')
      return
    }

    if (!newEmployee.role) {
      toast.error('Please select a role for the employee')
      return
    }

    if (!storeId) {
      toast.error('Store ID not found. Please refresh the page.')
      return
    }

    // Validate branch selection for branch-specific roles
    if ((newEmployee.role === 'ROLE_BRANCH_MANAGER' || newEmployee.role === 'ROLE_BRANCH_CASHIER')) {
      if (!newEmployee.branchId) {
        toast.error('Branch is required for Branch Manager and Branch Cashier roles')
        return
      }
      // Check if branch exists
      const selectedBranch = branches.find(b => b.id.toString() === newEmployee.branchId.toString())
      if (!selectedBranch) {
        toast.error('Selected branch not found. Please refresh and try again.')
        return
      }
    }

    // Validate phone if provided
    if (newEmployee.phone && newEmployee.phone.trim()) {
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
      if (!phoneRegex.test(newEmployee.phone.trim())) {
        toast.error('Please enter a valid phone number')
        return
      }
    }

    try {
      setCreating(true)
      const employeeData = {
        fullName: newEmployee.fullName.trim(),
        email: newEmployee.email.trim().toLowerCase(),
        phone: (newEmployee.phone || '').trim(),
        password: newEmployee.password,
        role: newEmployee.role,
        branchId: newEmployee.branchId ? parseInt(newEmployee.branchId) : null,
      }

      await employeeAPI.createStoreEmployee(storeId, employeeData)
      setIsAddDialogOpen(false)
      // Reset form
      setNewEmployee({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        role: 'ROLE_STORE_MANAGER',
        branchId: '',
      })
      fetchEmployees()
      fetchBranches() // Refresh branches list
      toast.success('Employee created successfully!')
    } catch (error) {
      console.error('Error creating employee:', error)
      const errorMessage = error.message || 'Failed to create employee'
      if (errorMessage.includes('email') || errorMessage.includes('Email')) {
        toast.error(`Email already exists. Please use a different email address.`)
      } else {
        toast.error(`Failed to create employee: ${errorMessage}`)
      }
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = (employee) => {
    setSelectedEmployee(employee)
    setEditEmployee({
      fullName: employee.fullName || '',
      email: employee.email || '',
      phone: employee.phone || '',
      password: '', // Don't pre-fill password
      role: employee.role || '',
      branchId: employee.branchId?.toString() || employee.branch?.id?.toString() || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateEmployee = async () => {
    if (!editEmployee.fullName || !editEmployee.email) {
      toast.error('Please fill in all required fields (Name, Email)')
      return
    }

    if (!selectedEmployee?.id) {
      toast.error('Employee ID not found')
      return
    }

    // Validate branch selection for branch-specific roles
    if ((editEmployee.role === 'ROLE_BRANCH_MANAGER' || editEmployee.role === 'ROLE_BRANCH_CASHIER') && !editEmployee.branchId) {
      toast.error('Branch is required for Branch Manager and Branch Cashier roles')
      return
    }

    try {
      setUpdating(true)
      const employeeData = {
        fullName: editEmployee.fullName,
        email: editEmployee.email,
        phone: editEmployee.phone || '',
        role: editEmployee.role,
        branchId: editEmployee.branchId ? parseInt(editEmployee.branchId) : null,
      }

      // Only include password if provided
      if (editEmployee.password) {
        employeeData.password = editEmployee.password
      }

      await employeeAPI.updateEmployee(selectedEmployee.id, employeeData)
      setIsEditDialogOpen(false)
      setSelectedEmployee(null)
      fetchEmployees()
      toast.success('Employee updated successfully!')
    } catch (error) {
      console.error('Error updating employee:', error)
      toast.error(error.message || 'Failed to update employee')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteEmployee = async (id) => {
    const ok = await confirm({
      title: 'Delete this employee?',
      description: 'Are you sure you want to delete this employee?',
      confirmLabel: 'Delete',
      variant: 'destructive',
    })
    if (!ok) return

    try {
      await employeeAPI.deleteEmployee(id)
      fetchEmployees()
      toast.success('Employee deleted successfully!')
    } catch (error) {
      console.error('Error deleting employee:', error)
      toast.error(error?.message || 'Failed to delete employee')
    }
  }

  const getRoleLabel = (role) => {
    const roleMap = {
      'ROLE_STORE_MANAGER': 'Store Manager',
      'ROLE_STORE_EMPLOYEE': 'Store Employee',
      'ROLE_BRANCH_MANAGER': 'Branch Manager',
      'ROLE_BRANCH_CASHIER': 'Branch Cashier',
      'ROLE_STORE_ADMIN': 'Store Admin',
      'ROLE_ADMIN': 'Admin',
    }
    return roleMap[role] || role
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Employee Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your store employees</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchEmployees}>
            <RefreshCw className="size-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleOpenAddDialog}>
            <Plus className="size-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {!storeId && !loading && <NoStoreBanner action="add employees" />}

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500 dark:text-slate-400" />
              <Input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employees ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="size-8 animate-spin text-slate-500 dark:text-slate-400" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="size-16 text-slate-500 dark:text-slate-400 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">
                {searchQuery ? 'No employees found matching your search' : 'No employees available. Create your first employee!'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.fullName || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {employee.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="size-4 text-slate-500 dark:text-slate-400" />
                              <span>{employee.email}</span>
                            </div>
                          )}
                          {employee.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="size-4 text-slate-500 dark:text-slate-400" />
                              <span>{employee.phone}</span>
                            </div>
                          )}
                          {!employee.email && !employee.phone && (
                            <span className="text-slate-500 dark:text-slate-400 text-sm">No contact info</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                          {getRoleLabel(employee.role)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {employee.branch?.name || employee.branchId ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="size-4 text-slate-500 dark:text-slate-400" />
                            <span className="text-sm">{employee.branch?.name || 'Branch ' + employee.branchId}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit className="size-4" />
                          </Button>
                          {employee.id !== currentUserId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              onClick={() => handleDeleteEmployee(employee.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>Create a new employee for your store</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={newEmployee.fullName}
                onChange={(e) => setNewEmployee({ ...newEmployee, fullName: e.target.value })}
                placeholder="Enter employee full name"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  placeholder="Enter email address"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={newEmployee.role}
                  onValueChange={(value) => {
                    setNewEmployee({ ...newEmployee, role: value, branchId: '' })
                  }}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(newEmployee.role === 'ROLE_BRANCH_MANAGER' || newEmployee.role === 'ROLE_BRANCH_CASHIER') && (
                <div>
                  <Label htmlFor="branchId">Branch *</Label>
                  {branches.length === 0 ? (
                    <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        No branches available. Please create a branch first before adding branch employees.
                      </p>
                    </div>
                  ) : (
                    <Select
                      value={newEmployee.branchId}
                      onValueChange={(value) => setNewEmployee({ ...newEmployee, branchId: value })}
                    >
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id.toString()}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={newEmployee.password}
                onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                placeholder="Enter password"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEmployee} disabled={creating}>
                {creating ? 'Creating...' : 'Add Employee'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-fullName">Full Name *</Label>
              <Input
                id="edit-fullName"
                value={editEmployee.fullName}
                onChange={(e) => setEditEmployee({ ...editEmployee, fullName: e.target.value })}
                placeholder="Enter employee full name"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmployee.email}
                  onChange={(e) => setEditEmployee({ ...editEmployee, email: e.target.value })}
                  placeholder="Enter email address"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editEmployee.phone}
                  onChange={(e) => setEditEmployee({ ...editEmployee, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-role">Role *</Label>
                <Select
                  value={editEmployee.role}
                  onValueChange={(value) => {
                    setEditEmployee({ ...editEmployee, role: value, branchId: '' })
                  }}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(editEmployee.role === 'ROLE_BRANCH_MANAGER' || editEmployee.role === 'ROLE_BRANCH_CASHIER') && (
                <div>
                  <Label htmlFor="edit-branchId">Branch *</Label>
                  <Select
                    value={editEmployee.branchId}
                    onValueChange={(value) => setEditEmployee({ ...editEmployee, branchId: value })}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="edit-password">Password (leave empty to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editEmployee.password}
                onChange={(e) => setEditEmployee({ ...editEmployee, password: e.target.value })}
                placeholder="Enter new password (optional)"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateEmployee} disabled={updating}>
                {updating ? 'Updating...' : 'Update Employee'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EmployeesPage
