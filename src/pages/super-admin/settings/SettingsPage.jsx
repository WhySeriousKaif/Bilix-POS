import React, { useState, useEffect } from 'react'
import {
  Settings,
  Save,
  RefreshCw,
  User,
  Mail,
  Shield,
  Bell,
  Database,
  Server,
} from 'lucide-react'
import { toast } from 'sonner'
import { userAPI, settingsAPI } from '@/services/api'

const Card = ({ children, className = '' }) => <div className={`rounded-xl border bg-white dark:bg-slate-900 ${className}`}>{children}</div>
const CardHeader = ({ children }) => <div className="p-6 pb-3">{children}</div>
const CardContent = ({ children, className = '' }) => <div className={`p-6 ${className}`}>{children}</div>
const CardTitle = ({ children, className = '' }) => <h2 className={`text-lg font-bold ${className}`}>{children}</h2>
const Input = (props) => <input {...props} />
const Textarea = (props) => <textarea {...props} />
const Label = ({ children, htmlFor }) => <label htmlFor={htmlFor} className="text-sm font-medium">{children}</label>
const Button = ({ children, className = '', ...props }) => <button {...props} className={`cursor-pointer rounded-md px-3 py-2 ${className}`}>{children}</button>

const SuperAdminSettingsPage = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userInfo, setUserInfo] = useState(null)
  const [settings, setSettings] = useState({
    systemName: '',
    systemEmail: '',
    systemPhone: '',
    maintenanceMode: false,
    allowRegistration: true,
    maxStoresPerAdmin: 1,
    sessionTimeoutMinutes: 30,
    emailNotifications: true,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [profile, systemSettings] = await Promise.all([
        userAPI.getProfile(),
        settingsAPI.get(),
      ])
      setUserInfo(profile)
      setSettings((prev) => ({
        ...prev,
        ...systemSettings,
        systemName: systemSettings.systemName || '',
        systemEmail: systemSettings.systemEmail || '',
        systemPhone: systemSettings.systemPhone || '',
      }))
    } catch (error) {
      console.error('Error fetching settings data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const updated = await settingsAPI.update(settings)
      setSettings((prev) => ({ ...prev, ...updated }))
      toast.success('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage system-wide settings and configuration</p>
      </div>

      <div className="space-y-6">
        {/* Account Information */}
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
                  value={userInfo?.fullName || ''}
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userInfo?.email || ''}
                  disabled
                  className="mt-1"
                />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Account information cannot be changed from here. Contact system administrator.
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="size-5" />
              System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="systemName">System Name</Label>
                <Input
                  id="systemName"
                  value={settings.systemName}
                  onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                  placeholder="Enter system name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="systemEmail">System Email</Label>
                <Input
                  id="systemEmail"
                  type="email"
                  value={settings.systemEmail}
                  onChange={(e) => setSettings({ ...settings, systemEmail: e.target.value })}
                  placeholder="Enter system email"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="systemPhone">System Phone</Label>
                <Input
                  id="systemPhone"
                  type="tel"
                  value={settings.systemPhone}
                  onChange={(e) => setSettings({ ...settings, systemPhone: e.target.value })}
                  placeholder="Enter system phone"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="maxStoresPerAdmin">Max Stores Per Admin</Label>
                <Input
                  id="maxStoresPerAdmin"
                  type="number"
                  value={settings.maxStoresPerAdmin}
                  onChange={(e) => setSettings({ ...settings, maxStoresPerAdmin: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={settings.sessionTimeoutMinutes}
                  onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: parseInt(e.target.value) || 30 })}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              Feature Toggles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">Put the system in maintenance mode</p>
              </div>
              <input
                id="maintenanceMode"
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="size-5"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allowRegistration">Allow Registration</Label>
                <p className="text-sm text-muted-foreground">Allow new users to register</p>
              </div>
              <input
                id="allowRegistration"
                type="checkbox"
                checked={settings.allowRegistration}
                onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                className="size-5"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailNotifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Enable email notifications (welcome emails, etc.)</p>
              </div>
              <input
                id="emailNotifications"
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                className="size-5"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Security settings and password policies will be available here.
            </div>
          </CardContent>
        </Card>

        {/* Database Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" />
              Database & Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Database backup and maintenance settings will be available here.
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="size-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SuperAdminSettingsPage
