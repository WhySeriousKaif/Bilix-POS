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
  Bot,
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useDispatch } from 'react-redux'
import { logoutUser } from '@/store/slices/authSlice'
import { branchAPI, userAPI } from '@/services/api'
import { useTheme } from '@/contexts/ThemeContext'
import AssistantWidget from '@/components/assistant/AssistantWidget'

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/branch' },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/branch/orders' },
  { id: 'refunds', label: 'Refunds', icon: RefreshCw, path: '/branch/refunds' },
  { id: 'transactions', label: 'Transactions', icon: CreditCard, path: '/branch/transactions' },
  { id: 'inventory', label: 'Inventory', icon: Package, path: '/branch/inventory' },
  { id: 'employees', label: 'Employees', icon: Users, path: '/branch/employees' },
  { id: 'customers', label: 'Customers', icon: UserCheck, path: '/branch/customers' },
  { id: 'reports', label: 'Reports', icon: FileText, path: '/branch/reports' },
  { id: 'assistant', label: 'AI Copilot', icon: Bot, path: '/branch/assistant' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/branch/settings' },
]

const searchDestinations = [
  { label: 'Orders', description: 'Search and manage branch orders', path: '/branch/orders', keywords: 'sale invoice transaction' },
  { label: 'Inventory', description: 'Check products and stock levels', path: '/branch/inventory', keywords: 'product stock sku' },
  { label: 'Employees', description: 'Manage branch staff and cashiers', path: '/branch/employees', keywords: 'staff cashier manager' },
  { label: 'Customers', description: 'View branch customers', path: '/branch/customers', keywords: 'buyer customer' },
  { label: 'Reports', description: 'Open analytics and reports', path: '/branch/reports', keywords: 'analytics sales performance' },
  { label: 'AI Copilot', description: 'Ask questions about Billix data', path: '/branch/assistant', keywords: 'assistant ai help' },
]

const HeaderBrand = () => (
  <div className="flex items-center gap-2.5 shrink-0">
    <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shadow-md overflow-hidden border border-blue-900/40 shrink-0">
      <img src="/bilix_logo.png" alt="Bilix" className="w-full h-full object-cover" />
    </div>
    <div className="hidden sm:block leading-tight">
      <div className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-tight">Bilix</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Branch Manager</div>
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
  const [searchFocused, setSearchFocused] = useState(false)
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
  const normalizedSearch = globalSearch.trim().toLowerCase()
  const typeaheadSuggestions = normalizedSearch
    ? searchDestinations
        .filter((item) => `${item.label} ${item.description} ${item.keywords}`.toLowerCase().includes(normalizedSearch))
        .slice(0, 5)
    : searchDestinations.slice(0, 5)

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F8FAFE] dark:bg-[#0B1220] text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Top Navigation Bar */}
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
          {branchInfo && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/30 rounded-full text-xs font-semibold text-blue-700 dark:text-blue-300">
              <Building2 className="size-3.5" />
              <span>{branchInfo.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
          <div className="relative hidden w-72 max-w-[42%] sm:block">
            <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 dark:border-white/10 dark:bg-white/5">
              <Search className="size-4 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders, inventory, staff..."
                value={globalSearch}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && globalSearch.trim()) {
                    navigate(`/branch/orders?search=${encodeURIComponent(globalSearch.trim())}`)
                    setGlobalSearch('')
                    setSearchFocused(false)
                  }
                  if (e.key === 'Escape') setSearchFocused(false)
                }}
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              />
            </div>
            {searchFocused && (
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-full min-w-72 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-slate-900">
                {typeaheadSuggestions.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      navigate(item.path)
                      setGlobalSearch('')
                      setSearchFocused(false)
                    }}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <Search className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-900 dark:text-white">{item.label}</span>
                      <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{item.description}</span>
                    </span>
                  </button>
                ))}
                {normalizedSearch && (
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      navigate(`/branch/orders?search=${encodeURIComponent(globalSearch.trim())}`)
                      setGlobalSearch('')
                      setSearchFocused(false)
                    }}
                    className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-xs font-medium text-blue-600 dark:border-white/10 dark:text-blue-400"
                  >
                    <Search className="size-3.5" /> Search orders for “{globalSearch.trim()}”
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            onClick={toggleTheme}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="size-5 text-amber-400" /> : <Moon className="size-5" />}
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer">
                <Bell className="size-5" />
                <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">1</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 font-semibold text-sm text-slate-900 dark:text-white">
                Notifications
              </div>
              <div className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                System Connected
              </div>
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2.5 pl-2 ml-1 border-l border-slate-200 dark:border-white/10">
            <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {initial}
            </div>
            <div className="hidden sm:block text-sm">
              <div className="font-semibold text-slate-900 dark:text-white leading-tight">{displayName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Branch Manager</div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
                  <ChevronRight className="size-4 rotate-90 text-slate-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
                <div className="p-2 border-b border-slate-100 dark:border-white/10">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{displayName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{currentUser?.email || 'manager@molla-pos.com'}</p>
                </div>
                <div className="pt-2 space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-xs h-8 font-semibold text-slate-600 dark:text-slate-300"
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
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={cn(
            'hidden lg:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 transition-all duration-200 relative shrink-0',
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
        <main className="flex-1 overflow-y-auto bg-[#F8FAFE] dark:bg-[#111827]">
          <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
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
      {(location.pathname === '/branch' || location.pathname === '/branch/') && (
        <AssistantWidget mode="branch" />
      )}
    </div>
  )
}

export default BranchLayout
