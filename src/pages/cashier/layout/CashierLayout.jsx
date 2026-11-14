import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  ShoppingCart,
  Clock,
  RefreshCw,
  Users,
  Wallet,
  Settings,
  Menu,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useDispatch } from 'react-redux'
import { logoutUser } from '@/store/slices/authSlice'
import { userAPI, branchAPI } from '@/services/api'
import { useTheme } from '@/contexts/ThemeContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import babyImage from '@/assets/newborn-5036843_1920.jpg'

const menuItems = [
  { id: 'pos-terminal', label: 'POS Terminal', icon: ShoppingCart, path: '/cashier' },
  { id: 'order-history', label: 'Order History', icon: Clock, path: '/cashier/orders' },
  { id: 'returns-refunds', label: 'Returns/Refunds', icon: RefreshCw, path: '/cashier/returns' },
  { id: 'customers', label: 'Customers', icon: Users, path: '/cashier/customers' },
  { id: 'shift-summary', label: 'Shift Summary', icon: Wallet, path: '/cashier/shift-summary' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/cashier/settings' },
]

const HeaderBrand = () => (
  <div className="flex items-center gap-2.5 shrink-0">
    <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shadow-md overflow-hidden border border-blue-900/40 shrink-0">
      <img src="/bilix_logo.png" alt="Bilix" className="w-full h-full object-cover" />
    </div>
    <div className="hidden sm:block leading-tight">
      <div className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-tight">Bilix</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Cashier</div>
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

const CashierLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cashierSidebarCollapsed') === 'true')
  const [userInfo, setUserInfo] = useState(null)
  const [branchInfo, setBranchInfo] = useState(null)
  const [showBranchInfo, setShowBranchInfo] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { darkMode, toggleTheme } = useTheme()
  const confirm = useConfirm()

  React.useEffect(() => {
    fetchUserInfo()
    const savedAvatar = localStorage.getItem('cashierAvatar')
    if (savedAvatar) setAvatarUrl(savedAvatar)

    const shouldShowBranch = localStorage.getItem('cashierShowBranchInfo') === 'true'
    setShowBranchInfo(shouldShowBranch)
    if (shouldShowBranch) fetchBranchInfo()

    const handleAvatarUpdate = () => {
      const saved = localStorage.getItem('cashierAvatar')
      if (saved) setAvatarUrl(saved)
    }
    const handleBranchInfoUpdate = () => {
      fetchBranchInfo()
      setShowBranchInfo(true)
      localStorage.setItem('cashierShowBranchInfo', 'true')
    }
    window.addEventListener('avatarUpdated', handleAvatarUpdate)
    window.addEventListener('branchInfoUpdated', handleBranchInfoUpdate)
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate)
      window.removeEventListener('branchInfoUpdated', handleBranchInfoUpdate)
    }
  }, [])

  const fetchUserInfo = async () => {
    try {
      const profile = await userAPI.getProfile()
      setUserInfo(profile)
    } catch (error) {
      console.error('Error fetching user info:', error)
    }
  }

  const fetchBranchInfo = async () => {
    try {
      const profile = await userAPI.getProfile()
      const branchId = profile?.branchId || 1
      const branch = await branchAPI.getById(branchId)
      setBranchInfo(branch)
    } catch (error) {
      console.error('Error fetching branch info:', error)
      setBranchInfo({ name: 'Branch', address: 'Address not available' })
    }
  }

  const handleNavigate = (path) => {
    navigate(path)
    setSidebarOpen(false)
  }

  const handleLogout = async () => {
    const shouldLogout = await confirm({
      title: 'End shift and log out?',
      description: 'Your cashier session will be closed and you will return to the login page.',
      confirmLabel: 'End Shift & Logout',
      variant: 'destructive',
    })
    if (!shouldLogout) return
    dispatch(logoutUser())
    navigate('/auth/login')
  }

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      localStorage.setItem('cashierSidebarCollapsed', String(!prev))
      return !prev
    })
  }

  const isActive = (path) => {
    if (path === '/cashier' || path === '/cashier/') {
      return location.pathname === '/cashier' || location.pathname === '/cashier/'
    }
    return location.pathname.startsWith(path)
  }

  const displayName = userInfo?.fullName || userInfo?.name || 'Cashier'
  const initial = displayName.charAt(0).toUpperCase()

  const InfoBlock = ({ compact }) => (
    <div className={cn('rounded-lg bg-blue-50/60 dark:bg-blue-500/5 px-3 py-2.5', compact && 'px-0 py-0 bg-transparent')}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
        {showBranchInfo ? 'Branch' : 'Cashier'}
      </div>
      {showBranchInfo ? (
        <div className="text-xs">
          <p className="font-medium text-slate-900 dark:text-white truncate">{branchInfo?.name || 'N/A'}</p>
          <p className="text-slate-500 dark:text-slate-400 truncate">{branchInfo?.address || 'N/A'}</p>
        </div>
      ) : (
        <div className="text-xs">
          <p className="font-medium text-slate-900 dark:text-white truncate">{displayName}</p>
          <p className="text-slate-500 dark:text-slate-400 truncate">{userInfo?.email || 'N/A'}</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="cashier-density h-screen w-screen flex flex-col bg-[#F8FAFE] dark:bg-[#0B1220] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
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
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2.5 pl-2 ml-1 border-l border-slate-200 dark:border-white/10 cursor-pointer">
                <Avatar className="size-9">
                  <AvatarImage src={avatarUrl || babyImage} alt={displayName} />
                  <AvatarFallback className="bg-blue-600 text-white font-bold text-sm">{initial}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-sm text-left">
                  <div className="font-semibold text-slate-900 dark:text-white leading-tight">{displayName}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Cashier</div>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarImage src={avatarUrl || babyImage} alt={displayName} />
                    <AvatarFallback className="bg-blue-600 text-white font-bold">{initial}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-slate-900 dark:text-white">{displayName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userInfo?.email || 'No email'}</p>
                  </div>
                </div>
                <div className="border-t border-slate-100 dark:border-white/10 pt-3">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="size-4" />
                    Logout
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
            {!collapsed && <InfoBlock />}
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
              title={collapsed ? 'End Shift & Logout' : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer',
                collapsed && 'justify-center px-0'
              )}
            >
              <LogOut className="size-[18px] shrink-0" />
              {!collapsed && 'End Shift & Logout'}
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
              <InfoBlock />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="size-[18px]" />
                End Shift & Logout
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden bg-[#F8FAFE] dark:bg-[#0B1220]">{children}</main>
      </div>
    </div>
  )
}

export default CashierLayout
