import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  LayoutDashboard,
  ShoppingCart,
  RefreshCw,
  CreditCard,
  Package,
  Users,
  FileText,
  Settings,
  Menu,
  X,
  LogOut,
  Building2,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  UserCheck,
  Store,
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useDispatch } from 'react-redux'
import { logoutUser } from '@/store/slices/authSlice'
import { branchAPI, userAPI } from '@/services/api'
import { useTheme } from '@/contexts/ThemeContext'

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/branch' },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/branch/orders' },
  { id: 'refunds', label: 'Refunds', icon: RefreshCw, path: '/branch/refunds' },
  { id: 'transactions', label: 'Transactions', icon: CreditCard, path: '/branch/transactions' },
  { id: 'inventory', label: 'Inventory', icon: Package, path: '/branch/inventory' },
  { id: 'employees', label: 'Employees', icon: Users, path: '/branch/employees' },
  { id: 'customers', label: 'Customers', icon: UserCheck, path: '/branch/customers' },
  { id: 'reports', label: 'Reports', icon: FileText, path: '/branch/reports' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/branch/settings' },
]

const HeaderBrand = () => (
  <div className="flex items-center gap-2.5 shrink-0">
    <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center shadow-md overflow-hidden border border-blue-500/30 shrink-0">
      <img src="/bilix_logo.png" alt="Bilix" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
      <Building2 className="size-5 text-blue-400 hidden" />
    </div>
    <div className="hidden sm:block leading-tight">
      <div className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-tight">Bilix</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Branch Manager</div>
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
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all border-l-[3px] cursor-pointer',
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

const BranchLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('branchSidebarCollapsed') === 'true')
  const [branchInfo, setBranchInfo] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [globalSearch, setGlobalSearch] = useState('')
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { darkMode, toggleTheme } = useTheme()

  React.useEffect(() => {
    fetchBranchInfo()
    fetchCurrentUser()
  }, [])

  React.useEffect(() => {
    const handleBranchInfoUpdate = () => fetchBranchInfo()
    window.addEventListener('branchInfoUpdated', handleBranchInfoUpdate)
    return () => window.removeEventListener('branchInfoUpdated', handleBranchInfoUpdate)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('branchSidebarCollapsed', String(next))
      return next
    })
  }

  const fetchCurrentUser = async () => {
    try {
      const profile = await userAPI.getProfile()
      setCurrentUser(profile)
    } catch (error) {
      console.error('Error fetching current user:', error)
    }
  }

  const fetchBranchInfo = async () => {
    try {
      const userProfile = await userAPI.getProfile()
      if (userProfile?.branchId) {
        const branch = await branchAPI.getById(userProfile.branchId)
        setBranchInfo(branch)
      } else {
        const branches = await branchAPI.getAll().catch(() => [])
        if (branches && branches.length > 0) {
          setBranchInfo(branches[0])
        }
      }
    } catch (error) {
      console.error('Error fetching branch info:', error)
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

  const isActive = (path) => {
    if (path === '/branch' || path === '/branch/') {
      return location.pathname === '/branch' || location.pathname === '/branch/'
    }
    return location.pathname.startsWith(path)
  }

  const displayName = currentUser?.fullName || currentUser?.name || 'Branch Manager'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F8FAFE] dark:bg-[#0B1220] text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 text-slate-600 dark:text-slate-400"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <HeaderBrand />
          {branchInfo && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-full text-xs font-semibold text-blue-700 dark:text-blue-400">
              <Building2 className="size-3.5" />
              <span>{branchInfo.name}</span>
            </div>
          )}
        </div>

        {/* Center Quick Search */}
        <div className="hidden sm:flex items-center gap-2.5 border border-slate-200 dark:border-white/10 rounded-full px-3.5 py-1.5 bg-slate-50 dark:bg-white/5 w-64 max-w-[40%]">
          <Search className="size-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search orders, inventory, staff..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && globalSearch.trim()) {
                navigate(`/branch/orders?search=${encodeURIComponent(globalSearch.trim())}`)
              }
            }}
            className="outline-none bg-transparent text-xs w-full text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <Bell className="size-4" />
                <span className="absolute top-1.5 right-1.5 size-2 bg-blue-600 rounded-full ring-2 ring-white dark:ring-slate-900" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Branch Notifications</h4>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">Active</span>
              </div>
              <div className="p-3 space-y-2 text-xs">
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                  <p className="font-medium text-slate-800 dark:text-slate-200">System Connected</p>
                  <p className="text-slate-500 text-[11px]">Branch Manager session live with database sync.</p>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
            onClick={toggleTheme}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-600" />}
          </Button>

          {/* User Profile Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div className="size-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow">
                  {initial}
                </div>
                <div className="hidden sm:block text-left pr-1">
                  <p className="text-xs font-bold leading-none">{displayName}</p>
                  <p className="text-[10px] text-slate-500 font-semibold leading-none mt-0.5">Branch Manager</p>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser?.email || 'manager@molla-pos.com'}</p>
              </div>
              <div className="pt-2 space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-xs h-8 font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  onClick={() => navigate('/branch/settings')}
                >
                  <Settings className="size-3.5 mr-2" />
                  Branch Settings
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-xs h-8 font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  onClick={handleLogout}
                >
                  <LogOut className="size-3.5 mr-2" />
                  Sign Out
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={cn(
            'hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-200 relative shrink-0',
            collapsed ? 'w-[76px]' : 'w-64'
          )}
        >
          <div className="pt-3" />
          <NavItems isActive={isActive} onNavigate={handleNavigate} collapsed={collapsed} />

          {/* Bottom Sidebar Footer Section */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            {!collapsed && branchInfo && (
              <div className="rounded-lg bg-blue-50/60 dark:bg-blue-500/5 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                  Branch
                </div>
                <div className="text-xs">
                  <p className="font-medium text-slate-900 dark:text-white truncate">{branchInfo.name}</p>
                  <p className="text-slate-500 dark:text-slate-400 truncate">{branchInfo.address || 'Active Outlet'}</p>
                </div>
              </div>
            )}
            
            {/* Collapse button located at the bottom of the sidebar */}
            <button
              onClick={toggleCollapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer',
                collapsed && 'justify-center px-0'
              )}
            >
              {collapsed ? <ChevronRight className="size-[18px] shrink-0" /> : <ChevronLeft className="size-[18px] shrink-0" />}
              {!collapsed && <span>Collapse</span>}
            </button>

            <button
              onClick={handleLogout}
              title={collapsed ? 'Sign Out' : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer',
                collapsed && 'justify-center px-0'
              )}
            >
              <LogOut className="size-[18px] shrink-0" />
              {!collapsed && <span>Log Out</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Drawer Sheet */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            <SheetHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <SheetTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <HeaderBrand />
              </SheetTitle>
            </SheetHeader>

            <NavItems isActive={isActive} onNavigate={handleNavigate} collapsed={false} />

            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                className="w-full justify-center gap-2 h-10 border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold text-xs"
                onClick={handleLogout}
              >
                <LogOut className="size-4" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFE] dark:bg-[#0B1220] p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">
            {children}
          </div>
        </main>
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

export default BranchLayout
