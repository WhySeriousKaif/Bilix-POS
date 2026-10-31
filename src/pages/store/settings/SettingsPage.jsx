import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Settings,
  Save,
  RefreshCw,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Bell,
  Shield,
} from 'lucide-react'
import { storeAPI, userAPI } from '@/services/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const SettingsPage = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeInfo, setStoreInfo] = useState(null)
  const [userInfo, setUserInfo] = useState(null)
  const [storeForm, setStoreForm] = useState({
    brand: '',
    description: '',
    storeType: '',
    contact: {
      address: '',
      phone: '',
      email: '',
    },
  })
  const [userForm, setUserForm] = useState({
    fullName: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch store info
      const stores = await storeAPI.getByAdmin()
      if (stores && stores.length > 0) {
        const store = stores[0]
        setStoreInfo(store)
        setStoreForm({
          brand: store.brand || store.brandName || '',
          description: store.description || store.Description || '',
          storeType: store.storeType || '',
          contact: {
            address: store.contact?.address || store.address || '',
            phone: store.contact?.phone || store.phone || '',
            email: store.contact?.email || store.email || '',
          },
        })
      }

      // Fetch user info
      const profile = await userAPI.getProfile()
      setUserInfo(profile)
      setUserForm({
        fullName: profile?.fullName || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
      })
    } catch (error) {
      console.error('Error fetching settings data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStoreSave = async () => {
    try {
      if (!storeInfo?.id) {
        toast.error('Store ID not found')
        return
      }

      setSaving(true)
      await storeAPI.update(storeInfo.id, storeForm)
      await fetchData()
      window.dispatchEvent(new CustomEvent('storeInfoUpdated'))
      toast.success('Store settings updated successfully!')
    } catch (error) {
      console.error('Error updating store settings:', error)
      toast.error(error?.message || 'Failed to update store settings')
    } finally {
      setSaving(false)
    }
  }

  const handleUserSave = async () => {
    try {
      // Note: User update might need a separate API endpoint
      // For now, we'll just show a message
      toast('User profile update functionality will be available soon')
    } catch (error) {
      console.error('Error updating user settings:', error)
      toast.error('Failed to update user settings')
    }
  }

  const handleInputChange = (field, value) => {
    if (field.startsWith('contact.')) {
      const contactField = field.replace('contact.', '')
      setStoreForm((prev) => ({
        ...prev,
        contact: {
          ...prev.contact,
          [contactField]: value,
        },
      }))
    } else {
      setStoreForm((prev) => ({
        ...prev,
        [field]: value,
      }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="size-8 animate-spin text-slate-500 dark:text-slate-400" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your store and account settings</p>
      </div>

      <div className="space-y-6">
        {/* Store Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5" />
              Store Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="brand">Brand Name *</Label>
                <Input
                  id="brand"
                  value={storeForm.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  placeholder="Enter brand name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="storeType">Store Type</Label>
                <Select
                  value={storeForm.storeType}
                  onValueChange={(value) => handleInputChange('storeType', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select store type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RETAIL">Retail</SelectItem>
                    <SelectItem value="WHOLESALE">Wholesale</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="HYBRID">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={storeForm.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter store description"
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="border-t border-slate-200 dark:border-white/10 pt-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="size-4" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={storeForm.contact.address}
                    onChange={(e) => handleInputChange('contact.address', e.target.value)}
                    placeholder="Enter store address"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={storeForm.contact.phone}
                    onChange={(e) => handleInputChange('contact.phone', e.target.value)}
                    placeholder="Enter phone number"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={storeForm.contact.email}
                    onChange={(e) => handleInputChange('contact.email', e.target.value)}
                    placeholder="Enter email address"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-white/10">
              <Button onClick={handleStoreSave} disabled={saving}>
                <Save className="size-4 mr-2" />
                {saving ? 'Saving...' : 'Save Store Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  placeholder="Enter full name"
                  className="mt-1"
                  disabled
                />
              </div>

              <div>
                <Label htmlFor="userEmail">Email</Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="Enter email"
                  className="mt-1"
                  disabled
                />
              </div>

              <div>
                <Label htmlFor="userPhone">Phone</Label>
                <Input
                  id="userPhone"
                  type="tel"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-white/10">
              <Button onClick={handleUserSave} variant="outline">
                <Save className="size-4 mr-2" />
                Save Account Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Additional preferences and notification settings will be available here.
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Password change and security settings will be available here.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SettingsPage
