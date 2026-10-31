import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Search,
  RefreshCw,
  Users,
  Plus,
  Edit,
  ShoppingCart,
  Mail,
  Phone,
} from 'lucide-react'
import { customerAPI, orderAPI } from '@/services/api'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const CashierCustomersPage = () => {
  const [customers, setCustomers] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '')
  const [page, setPage] = useState(() => Math.max(0, Number(searchParams.get('page') || 0)))
  const pageSize = Number(searchParams.get('size') || 10)
  const [sortBy, setSortBy] = useState(() => searchParams.get('sortBy') || 'createdAt')
  const [direction, setDirection] = useState(() => searchParams.get('direction') || 'desc')
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    fetchCustomers()
  }, [page, pageSize, sortBy, direction, searchQuery])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const result = await customerAPI.getPaged(page, pageSize, sortBy, direction, searchQuery)
      // Fetch order counts for each customer
      const customersWithOrders = await Promise.all(
        (result?.content || []).map(async (customer) => {
          try {
            const orders = await orderAPI.getByCustomerId(customer.id)
            return {
              ...customer,
              orderCount: orders?.length || 0,
              totalSpent: orders?.reduce((sum, order) => sum + (order.totalAmount || 0), 0) || 0,
            }
          } catch {
            return {
              ...customer,
              orderCount: 0,
              totalSpent: 0,
            }
          }
        })
      )
      setCustomers(customersWithOrders)
      setTotalPages(result?.totalPages || 0)
      setTotalElements(result?.totalElements || 0)
    } catch (error) {
      console.error('Error fetching customers:', error)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(page)); next.set('size', String(pageSize))
    next.set('sortBy', sortBy); next.set('direction', direction)
    if (searchQuery.trim()) next.set('search', searchQuery.trim())
    else next.delete('search')
    setSearchParams(next, { replace: true })
  }, [page, pageSize, sortBy, direction, searchQuery])

  useEffect(() => { setPage(0) }, [searchQuery])

  const handleAddCustomer = async () => {
    try {
      if (!newCustomer.name) {
        toast.error('Name is required')
        return
      }
      
      await customerAPI.create(newCustomer)
      setIsAddDialogOpen(false)
      setNewCustomer({ name: '', email: '', phone: '' })
      fetchCustomers()
      toast.success('Customer added successfully!')
    } catch (error) {
      console.error('Error adding customer:', error)
      toast.error(`Error adding customer: ${error.message}`)
    }
  }

  const handleEditCustomer = async () => {
    if (!editingCustomer?.name?.trim()) {
      toast.error('Name is required')
      return
    }
    try {
      setSavingEdit(true)
      await customerAPI.update(editingCustomer.id, {
        name: editingCustomer.name.trim(),
        email: editingCustomer.email?.trim() || null,
        phone: editingCustomer.phone?.trim() || null,
      })
      setIsEditDialogOpen(false)
      setEditingCustomer(null)
      await fetchCustomers()
      toast.success('Customer details updated successfully')
    } catch (error) {
      console.error('Error updating customer:', error)
      toast.error(`Error updating customer: ${error.message}`)
    } finally {
      setSavingEdit(false)
    }
  }

  const summary = {
    total: totalElements,
    withOrders: customers.filter(c => c.orderCount > 0).length,
    totalRevenue: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage customers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="size-4 mr-2" /> Add Customer
          </Button>
          <Button variant="outline" size="sm" onClick={fetchCustomers}>
            <RefreshCw className="size-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <ShoppingCart className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.withOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">With orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Mail className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹{summary.totalRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Select value={String(pageSize)} onValueChange={(value) => { setPage(0); const next = new URLSearchParams(searchParams); next.set('size', value); setSearchParams(next, { replace: true }) }}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="10">10 / page</SelectItem><SelectItem value="25">25 / page</SelectItem><SelectItem value="50">50 / page</SelectItem></SelectContent>
            </Select>
            <Select value={`${sortBy}:${direction}`} onValueChange={(value) => { const [sort, dir] = value.split(':'); setSortBy(sort); setDirection(dir); setPage(0) }}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="createdAt:desc">Newest first</SelectItem><SelectItem value="name:asc">Name A–Z</SelectItem><SelectItem value="name:desc">Name Z–A</SelectItem></SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : customers.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">
                {searchQuery ? 'No customers found' : 'No customers available'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      {customer.name || customer.fullName || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Mail className="size-3 text-muted-foreground" />
                        {customer.email || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="size-3 text-muted-foreground" />
                        {customer.phone || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-muted">
                        {customer.orderCount || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{(customer.totalSpent || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          setEditingCustomer({
                            id: customer.id,
                            name: customer.name || customer.fullName || '',
                            email: customer.email || '',
                            phone: customer.phone || '',
                          })
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Edit className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!loading && totalPages > 0 && (
            <div className="flex items-center justify-between border-t p-4 text-sm">
              <span>Page {page + 1} of {totalPages} · {totalElements} customers</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(value => value + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
            <DialogDescription>
              Add a new customer to the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                placeholder="Enter customer name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                type="tel"
                placeholder="Enter phone number"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomer}>Add Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update the customer details saved in the database.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Enter customer name"
              value={editingCustomer?.name || ''}
              onChange={(e) => setEditingCustomer(current => ({ ...current, name: e.target.value }))}
            />
            <Input
              type="email"
              placeholder="Enter email address"
              value={editingCustomer?.email || ''}
              onChange={(e) => setEditingCustomer(current => ({ ...current, email: e.target.value }))}
            />
            <Input
              type="tel"
              placeholder="Enter phone number"
              value={editingCustomer?.phone || ''}
              onChange={(e) => setEditingCustomer(current => ({ ...current, phone: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditCustomer} disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CashierCustomersPage
