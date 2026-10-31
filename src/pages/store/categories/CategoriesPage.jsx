import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, RefreshCw, Edit, Trash2, Tag, Package } from 'lucide-react'
import { categoryAPI, userAPI, storeAPI } from '@/services/api'
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
import { Textarea } from '@/components/ui/textarea'

const CategoriesPage = () => {
  const confirm = useConfirm()
  const [categories, setCategories] = useState([])
  const [filteredCategories, setFilteredCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [storeId, setStoreId] = useState(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
  })
  const [editCategory, setEditCategory] = useState({
    name: '',
    description: '',
  })
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchStoreId()
  }, [])

  useEffect(() => {
    if (storeId) {
      fetchCategories()
    }
  }, [storeId])

  useEffect(() => {
    filterCategories()
  }, [searchQuery, categories])

  const fetchStoreId = async () => {
    try {
      const profile = await userAPI.getProfile()
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

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const data = await categoryAPI.getByStoreId(storeId)
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const filterCategories = () => {
    if (!searchQuery.trim()) {
      setFilteredCategories(categories)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = categories.filter((category) =>
      category.name?.toLowerCase().includes(query)
    )
    setFilteredCategories(filtered)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    filterCategories()
  }

  const handleOpenAddDialog = () => {
    if (!storeId) {
      toast.error('Create a store first before adding a category.')
      return
    }
    setIsAddDialogOpen(true)
  }

  const handleAddCategory = async () => {
    // Validate required fields
    if (!newCategory.name || !newCategory.name.trim()) {
      toast.error('Please enter a category name')
      return
    }

    // Check for duplicate category names (case-insensitive)
    const duplicateCategory = categories.find(
      cat => cat.name.toLowerCase().trim() === newCategory.name.toLowerCase().trim()
    )
    if (duplicateCategory) {
      toast.error(`Category "${newCategory.name.trim()}" already exists. Please use a different name.`)
      return
    }

    if (!storeId) {
      toast.error('Store ID not found. Please refresh the page.')
      return
    }

    try {
      setCreating(true)
      const categoryData = {
        name: newCategory.name.trim(),
        description: (newCategory.description || '').trim(),
        storeId: storeId,
      }

      await categoryAPI.create(categoryData)
      setIsAddDialogOpen(false)
      // Reset form
      setNewCategory({ name: '', description: '' })
      await fetchCategories()
      toast.success('Category created successfully!')
    } catch (error) {
      console.error('Error creating category:', error)
      const errorMessage = error.message || 'Failed to create category'
      if (errorMessage.includes('name') || errorMessage.includes('Name') || errorMessage.includes('duplicate')) {
        toast.error('Category name already exists. Please use a different name.', { description: errorMessage })
      } else {
        toast.error(`Failed to create category: ${errorMessage}`)
      }
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = (category) => {
    setSelectedCategory(category)
    setEditCategory({
      name: category.name || '',
      description: category.description || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateCategory = async () => {
    if (!editCategory.name) {
      toast.error('Category name is required')
      return
    }

    if (!selectedCategory?.id) {
      toast.error('Category ID not found')
      return
    }

    try {
      setUpdating(true)
      const categoryData = {
        name: editCategory.name,
        description: editCategory.description || '',
      }

      await categoryAPI.update(selectedCategory.id, categoryData)
      setIsEditDialogOpen(false)
      setSelectedCategory(null)
      await fetchCategories()
      toast.success('Category updated successfully!')
    } catch (error) {
      console.error('Error updating category:', error)
      toast.error(error.message || 'Failed to update category')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteCategory = async (id) => {
    const ok = await confirm({
      title: 'Delete this category?',
      description: 'Products in this category will not be deleted, but they will lose their category association.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    })
    if (!ok) return

    try {
      await categoryAPI.delete(id)
      await fetchCategories()
      toast.success('Category deleted successfully!')
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error('Failed to delete category')
    }
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Categories</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your product categories</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchCategories}>
            <RefreshCw className="size-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleOpenAddDialog}>
            <Plus className="size-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {!storeId && !loading && <NoStoreBanner action="add categories" />}

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Categories ({filteredCategories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="size-8 animate-spin text-slate-400" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Tag className="size-16 text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">
                {searchQuery ? 'No categories found matching your search' : 'No categories available. Create your first category!'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tag className="size-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-slate-900 dark:text-white">{category.name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-500 dark:text-slate-400 text-sm">
                          {category.description || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                          <Package className="size-4 text-slate-400" />
                          <span>{category.productCount || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
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

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Create a new category for your products</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="Enter category name"
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCategory()
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                placeholder="Enter category description (optional)"
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCategory} disabled={creating}>
                {creating ? 'Creating...' : 'Add Category'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Category Name *</Label>
              <Input
                id="edit-name"
                value={editCategory.name}
                onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                placeholder="Enter category name"
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleUpdateCategory()
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editCategory.description}
                onChange={(e) => setEditCategory({ ...editCategory, description: e.target.value })}
                placeholder="Enter category description (optional)"
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateCategory} disabled={updating}>
                {updating ? 'Updating...' : 'Update Category'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CategoriesPage
