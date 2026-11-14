import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, RefreshCw, Check } from 'lucide-react'
import { toast } from 'sonner'
import { subscriptionPlanAPI } from '@/services/api'
import { useConfirm } from '@/contexts/ConfirmContext'

const Card = ({ className = '', children }) => <div className={`rounded-xl border bg-white dark:bg-slate-900 ${className}`}>{children}</div>
const CardHeader = ({ children }) => <div className="p-6 pb-3">{children}</div>
const CardContent = ({ className = '', children }) => <div className={`p-6 ${className}`}>{children}</div>
const CardTitle = ({ children }) => <h2 className="text-lg font-bold">{children}</h2>
const Input = ({ className = '', ...props }) => <input {...props} className={`mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-white/15 dark:bg-slate-950 dark:text-white ${className}`} />
const Label = ({ children, ...props }) => <label {...props} className="block text-sm font-medium text-slate-700 dark:text-slate-200">{children}</label>
const Button = ({ children, className = '', variant = 'default', size = 'default', ...props }) => {
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-white/10',
  }
  const sizes = { default: 'px-4 py-2', sm: 'px-3 py-1.5', lg: 'px-5 py-2.5' }
  return <button {...props} className={`inline-flex items-center justify-center rounded-md font-medium transition-colors cursor-pointer ${sizes[size] || sizes.default} ${variants[variant] || variants.default} ${className}`}>{children}</button>
}
const Table = ({ children }) => <table className="w-full text-sm">{children}</table>
const TableHeader = ({ children }) => <thead>{children}</thead>
const TableBody = ({ children }) => <tbody>{children}</tbody>
const TableRow = ({ children }) => <tr className="border-b border-slate-100 dark:border-white/10">{children}</tr>
const TableHead = ({ children, className = '' }) => <th className={`p-3 text-left text-slate-500 ${className}`}>{children}</th>
const TableCell = ({ children, className = '' }) => <td className={`p-3 ${className}`}>{children}</td>
const Dialog = ({ open, onOpenChange, children }) => open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => onOpenChange(false)}>{children}</div> : null
const DialogContent = ({ children, className = '' }) => <div className={`max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900 ${className}`} onClick={(event) => event.stopPropagation()}>{children}</div>
const DialogHeader = ({ children }) => <div className="mb-4">{children}</div>
const DialogTitle = ({ children }) => <h2 className="text-xl font-bold">{children}</h2>
const DialogDescription = ({ children }) => <p className="text-sm text-slate-500">{children}</p>

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

const emptyForm = {
  name: '',
  price: '',
  branches: '',
  users: '',
  products: '',
  features: '',
  isActive: true,
}

// Map a plan returned from the backend (maxBranches/maxUsers/maxProducts/active) into
// the shape this page's UI already works with (branches/users/products/isActive/features array)
const fromDto = (plan) => ({
  id: plan.id,
  name: plan.name,
  price: plan.price,
  branches: plan.maxBranches || 0,
  users: plan.maxUsers || 0,
  products: plan.maxProducts || 0,
  features: (plan.features || '').split(',').map((f) => f.trim()).filter(Boolean),
  isActive: plan.active,
})

const toDto = (form) => ({
  name: form.name,
  price: parseFloat(form.price) || 0,
  maxBranches: parseInt(form.branches) || 0,
  maxUsers: parseInt(form.users) || 0,
  maxProducts: parseInt(form.products) || 0,
  features: form.features,
  active: form.isActive,
})

const SubscriptionPlansPage = () => {
  const confirm = useConfirm()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [newPlan, setNewPlan] = useState(emptyForm)
  const [editPlan, setEditPlan] = useState(emptyForm)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const data = await subscriptionPlanAPI.getAll()
      setPlans((data || []).map(fromDto))
    } catch (error) {
      console.error('Error fetching subscription plans:', error)
      toast.error('Could not refresh subscription plans. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlan = async () => {
    if (!newPlan.name || !newPlan.price) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      await subscriptionPlanAPI.create(toDto(newPlan))
      await fetchPlans()
      setIsAddDialogOpen(false)
      setNewPlan(emptyForm)
    } catch (error) {
      console.error('Error creating plan:', error)
      toast.error('Failed to create plan')
    }
  }

  const handleEdit = (plan) => {
    setSelectedPlan(plan)
    setEditPlan({
      name: plan.name,
      price: plan.price.toString(),
      branches: plan.branches.toString(),
      users: plan.users.toString(),
      products: plan.products.toString(),
      features: plan.features.join(', '),
      isActive: plan.isActive,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdatePlan = async () => {
    if (saving || !selectedPlan) return
    if (!editPlan.name || !editPlan.price) {
      toast.error('Please fill in all required fields')
      return
    }
    setSaving(true)
    try {
      const savedPlan = await subscriptionPlanAPI.update(selectedPlan.id, toDto(editPlan))
      if (!savedPlan || savedPlan.id == null) {
        throw new Error('The server did not return the saved plan. Refresh to verify the update.')
      }
      const updatedPlan = fromDto(savedPlan)
      setPlans((current) => current.map((plan) => plan.id === updatedPlan.id ? updatedPlan : plan))
      setIsEditDialogOpen(false)
      setSelectedPlan(null)
      toast.success('Plan updated successfully')
    } catch (error) {
      console.error('Error updating plan:', error)
      toast.error(error.message || 'Failed to update plan')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePlan = async (id) => {
    const ok = await confirm({
      title: 'Delete this plan?',
      description: 'Are you sure you want to delete this plan?',
      confirmLabel: 'Delete',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await subscriptionPlanAPI.delete(id)
      await fetchPlans()
    } catch (error) {
      console.error('Error deleting plan:', error)
      toast.error('Failed to delete plan')
    }
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Subscription Plans</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage subscription plans for stores</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" onClick={fetchPlans} disabled={loading || saving}>
          <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="size-4 mr-2" />
          Add Plan
        </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="size-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={plan.isActive ? 'border-2 border-blue-500' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.isActive && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Branches:</span>
                      <span className="font-medium">{plan.branches}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Users:</span>
                      <span className="font-medium">{plan.users}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Products:</span>
                      <span className="font-medium">{plan.products.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="border-t pt-4 mb-4">
                    <p className="text-sm font-medium mb-2">Features:</p>
                    <ul className="space-y-1">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 size-4 shrink-0 text-blue-600" />
                          <span className="min-w-0 break-words">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(plan)}
                    >
                      <Edit className="size-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Plans Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Plans ({plans.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Branches</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>{formatCurrency(plan.price)}/month</TableCell>
                        <TableCell>{plan.branches}</TableCell>
                        <TableCell>{plan.users}</TableCell>
                        <TableCell>{plan.products.toLocaleString()}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              plan.isActive
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-white/5 dark:text-slate-400'
                            }`}
                          >
                            {plan.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0"
                              onClick={() => handleEdit(plan)}
                            >
                              <Edit className="size-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeletePlan(plan.id)}
                            >
                              <Trash2 className="size-5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Plan Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Subscription Plan</DialogTitle>
            <DialogDescription>Create a new subscription plan for stores</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Plan Name *</Label>
              <Input
                id="name"
                value={newPlan.name}
                onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                placeholder="e.g., Basic Plan"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Monthly Price ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={newPlan.price}
                  onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                  placeholder="1299"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="branches">Max Branches</Label>
                <Input
                  id="branches"
                  type="number"
                  value={newPlan.branches}
                  onChange={(e) => setNewPlan({ ...newPlan, branches: e.target.value })}
                  placeholder="10"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="users">Max Users</Label>
                <Input
                  id="users"
                  type="number"
                  value={newPlan.users}
                  onChange={(e) => setNewPlan({ ...newPlan, users: e.target.value })}
                  placeholder="50"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="products">Max Products</Label>
                <Input
                  id="products"
                  type="number"
                  value={newPlan.products}
                  onChange={(e) => setNewPlan({ ...newPlan, products: e.target.value })}
                  placeholder="1000"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="features">Features (comma-separated)</Label>
              <Input
                id="features"
                value={newPlan.features}
                onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value })}
                placeholder="API integrations, Advanced reporting, Email support"
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={newPlan.isActive}
                onChange={(e) => setNewPlan({ ...newPlan, isActive: e.target.checked })}
                className="size-4"
              />
              <Label htmlFor="isActive">Active Plan</Label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddPlan}>Add Plan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subscription Plan</DialogTitle>
            <DialogDescription>Update subscription plan details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Plan Name *</Label>
              <Input
                id="edit-name"
                value={editPlan.name}
                onChange={(e) => setEditPlan({ ...editPlan, name: e.target.value })}
                placeholder="e.g., Basic Plan"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-price">Monthly Price ($) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editPlan.price}
                  onChange={(e) => setEditPlan({ ...editPlan, price: e.target.value })}
                  placeholder="1299"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-branches">Max Branches</Label>
                <Input
                  id="edit-branches"
                  type="number"
                  value={editPlan.branches}
                  onChange={(e) => setEditPlan({ ...editPlan, branches: e.target.value })}
                  placeholder="10"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-users">Max Users</Label>
                <Input
                  id="edit-users"
                  type="number"
                  value={editPlan.users}
                  onChange={(e) => setEditPlan({ ...editPlan, users: e.target.value })}
                  placeholder="50"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-products">Max Products</Label>
                <Input
                  id="edit-products"
                  type="number"
                  value={editPlan.products}
                  onChange={(e) => setEditPlan({ ...editPlan, products: e.target.value })}
                  placeholder="1000"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-features">Features (comma-separated)</Label>
              <Input
                id="edit-features"
                value={editPlan.features}
                onChange={(e) => setEditPlan({ ...editPlan, features: e.target.value })}
                placeholder="API integrations, Advanced reporting"
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="edit-isActive"
                type="checkbox"
                checked={editPlan.isActive}
                onChange={(e) => setEditPlan({ ...editPlan, isActive: e.target.checked })}
                className="size-4"
              />
              <Label htmlFor="edit-isActive">Active Plan</Label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdatePlan} disabled={saving}>
                {saving && <RefreshCw className="size-4 mr-2 animate-spin" />}
                {saving ? 'Saving…' : 'Update Plan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SubscriptionPlansPage
