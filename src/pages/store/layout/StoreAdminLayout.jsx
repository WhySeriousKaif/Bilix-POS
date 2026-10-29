import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  LayoutDashboard,
  Store,
  Building2,
  Package,
  Tag,
  Users,
  Bell,
  ShoppingCart,
  CreditCard,
  FileText,
  Settings,
  Menu,
  LogOut,
  TrendingUp,
  Sun,
  Moon,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useDispatch, useSelector } from 'react-redux'
import { logoutUser } from '@/store/slices/authSlice'
import { storeAPI, userAPI } from '@/services/api'
import { useTheme } from '@/contexts/ThemeContext'
import { useStoreAlerts } from '@/hooks/useStoreAlerts'

const NOTIFICATIONS_POLL_INTERVAL_MS = 30000

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/store' },
  { id: 'stores', label: 'Stores', icon: Store, path: '/store/stores' },
  { id: 'branches', label: 'Branches', icon: Building2, path: '/store/branches' },
  { id: 'products', label: 'Products', icon: Package, path: '/store/products' },
  { id: 'categories', label: 'Categories', icon: Tag, path: '/store/categories' },
  { id: 'employees', label: 'Employees', icon: Users, path: '/store/employees' },
  { id: 'alerts', label: 'Alerts', icon: Bell, path: '/store/alerts' },
  { id: 'sales', label: 'Sales', icon: TrendingUp, path: '/store/sales' },
  { id: 'transactions', label: 'Transactions', icon: CreditCard, path: '/store/transactions' },
  { id: 'reports', label: 'Reports', icon: FileText, path: '/store/reports' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/store/settings' },
]

const HeaderBrand = () => (
  <div className="flex items-center gap-2.5 shrink-0">
    <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shadow-md overflow-hidden border border-blue-900/40 shrink-0">
      <img src="/bilix_logo.png" alt="Bilix" className="w-full h-full object-cover" />
    </div>
    <div className="hidden sm:block leading-tight">
      <div className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-tight">Bilix</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Store Admin</div>
    </div>
  </div>
)

const NavItems = ({ isActive, onNavigate, collapsed }) => (
  <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
    {menuItems.map((item) => {
      const Icon = item.icon
      const active = isActive(item.path)
      return (
        <button
          key={item.id}
          onClick={() => onNavigate(item.path)}
          title={collapsed ? item.label : undefined}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors border-l-[3px] cursor-pointer',
            collapsed && 'justify-center px-0',
            active
              ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-600'
              : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          <Icon className="size-[18px] shrink-0" />
          {!collapsed && <span>{item.label}</span>}
        </button>
      )
    })}
  </nav>
)

const StoreAdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('storeAdminSidebarCollapsed') === 'true')
  const [storeInfo, setStoreInfo] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { darkMode, toggleTheme } = useTheme()

  const { inactiveCashiers, lowStockProducts, noSaleBranches, refundSpikes } = useStoreAlerts(storeInfo?.id, {
    pollIntervalMs: NOTIFICATIONS_POLL_INTERVAL_MS,
  })

  const notifications = [
    ...lowStockProducts.map((p) => ({
      id: `stock-${p.id}`,
      message: `${p.name} is low on stock (${p.quantity} left)`,
    })),
    ...noSaleBranches.map((b) => ({
      id: `branch-${b.id}`,
      message: `No sales recorded today at ${b.name}`,
    })),
    ...refundSpikes.map((r) => ({
      id: `refund-${r.id}`,
      message: `Large refund of ${r.amount} by ${r.cashierName}`,
    })),
    ...inactiveCashiers.map((c) => ({
      id: `cashier-${c.id}`,
      message: `${c.fullName} hasn't logged in since ${c.lastLogin}`,
    })),
  ]

  React.useEffect(() => {
    fetchStoreInfo()
    fetchCurrentUser()
    const handleStoreInfoUpdate = () => fetchStoreInfo()
    window.addEventListener('storeInfoUpdated', handleStoreInfoUpdate)
    return () => window.removeEventListener('storeInfoUpdated', handleStoreInfoUpdate)
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const profile = await userAPI.getProfile()
      setCurrentUser(profile)
    } catch (error) {
      console.error('Error fetching current user:', error)
    }
  }

  const fetchStoreInfo = async () => {
    try {
      const stores = await storeAPI.getByAdmin()
      if (stores && stores.length > 0) {
        setStoreInfo(stores[0])
      }
    } catch (error) {
      console.error('Error fetching store info:', error)
      setStoreInfo({ brand: 'Store', description: '' })
    }
  }

  const handleNavigate = (path) => {
    navigate(path)
    setSidebarOpen(false)
  }

  const handleLogout = () => {
    setLogoutConfirmOpen(true)
  }

  const confirmLogout = () => {
    dispatch(logoutUser())
    navigate('/auth/login')
  }

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      localStorage.setItem('storeAdminSidebarCollapsed', String(!prev))
      return !prev
    })
  }

  const isActive = (path) => {
    if (path === '/store' || path === '/store/') {
      return location.pathname === '/store' || location.pathname === '/store/'
    }
    return location.pathname.startsWith(path)
  }

  const displayName = currentUser?.fullName || currentUser?.name || 'Store Admin'
  const initial = displayName.charAt(0).toUpperCase()

  const StoreInfoBlock = () => (
    <div className="rounded-lg bg-blue-50/60 dark:bg-blue-500/5 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
        Store
      </div>
      <div className="text-xs">
        <p className="font-medium text-slate-900 dark:text-white truncate">{storeInfo?.brand || 'N/A'}</p>
        <p className="text-slate-500 dark:text-slate-400 truncate">{storeInfo?.storeType || storeInfo?.description || 'N/A'}</p>
      </div>
    </div>
  )

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F8FAFE] dark:bg-[#0B1220] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {/* Header */}
      <header className="h-16 shrink-0 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 flex items-center justify-between px-4 sm:px-6 z-10 gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <HeaderBrand />
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
          <div className="hidden sm:flex items-center gap-2.5 border border-slate-200 dark:border-white/10 rounded-full px-3.5 py-2 bg-slate-50 dark:bg-white/5 w-64 max-w-[40%]">
            <Search className="size-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              className="outline-none bg-transparent text-sm w-full text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={toggleTheme}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer">
                <Bell className="size-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 font-semibold text-sm text-slate-900 dark:text-white">
                Notifications
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">Nothing new right now</div>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/10">
                  {notifications.map((n) => (
                    <div key={n.id} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {n.message}
                    </div>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2.5 pl-2 ml-1 border-l border-slate-200 dark:border-white/10">
            <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {initial}
            </div>
            <div className="hidden sm:block text-sm">
              <div className="font-semibold text-slate-900 dark:text-white leading-tight">{displayName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Store Admin</div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            'hidden lg:flex relative shrink-0 flex-col border-r border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 transition-all duration-200',
            collapsed ? 'w-[76px]' : 'w-64'
          )}
        >
          <div className="pt-3" />
          <NavItems isActive={isActive} onNavigate={handleNavigate} collapsed={collapsed} />
          <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-2">
            {!collapsed && <StoreInfoBlock />}
            <button
              onClick={toggleCollapse}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer',
                collapsed && 'justify-center px-0'
              )}
            >
              {collapsed ? <ChevronRight className="size-[18px] shrink-0" /> : <ChevronLeft className="size-[18px] shrink-0" />}
              {!collapsed && 'Collapse'}
            </button>
            <button
              onClick={handleLogout}
              title={collapsed ? 'Log Out' : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer',
                collapsed && 'justify-center px-0'
              )}
            >
              <LogOut className="size-[18px] shrink-0" />
              {!collapsed && 'Log Out'}
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0 flex flex-col">
            <SheetHeader className="p-4 border-b border-slate-200 dark:border-white/10">
              <SheetTitle asChild>
                <div>
                  <HeaderBrand />
                </div>
              </SheetTitle>
            </SheetHeader>
            <NavItems isActive={isActive} onNavigate={handleNavigate} collapsed={false} />
            <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-2">
              <StoreInfoBlock />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="size-[18px]" />
                Log Out
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-[#F8FAFE] dark:bg-[#0B1220]">{children}</main>
      </div>
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setLogoutConfirmOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Log out?</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Are you sure you want to end your session?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setLogoutConfirmOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer">Cancel</button>
              <button type="button" onClick={confirmLogout} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer">Log out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StoreAdminLayout
