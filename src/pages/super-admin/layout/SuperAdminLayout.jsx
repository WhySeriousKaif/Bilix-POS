import React, { useState, useRef, useMemo } from 'react'
import {
  LayoutDashboard,
  Store,
  FileText,
  Clock,
  Download,
  Settings,
  Menu,
  X,
  LogOut,
  Search,
  Bell,
  ShoppingCart,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Users as UsersIcon,
  Bot,
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useDispatch, useSelector } from 'react-redux'
import { logoutUser } from '@/store/slices/authSlice'
import { userAPI, storeAPI } from '@/services/api'
import { useTheme } from '@/contexts/ThemeContext'
import { formatDistanceToNow } from 'date-fns'
import AssistantWidget from '@/components/assistant/AssistantWidget'

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/super-admin' },
  { id: 'stores', label: 'Stores', icon: Store, path: '/super-admin/stores' },
  { id: 'users', label: 'Users', icon: UsersIcon, path: '/super-admin/users' },
  { id: 'subscription-plans', label: 'Subscription Plans', icon: FileText, path: '/super-admin/subscription-plans' },
  { id: 'pending-requests', label: 'Pending Requests', icon: Clock, path: '/super-admin/pending-requests' },
  { id: 'sales', label: 'Sales', icon: ShoppingCart, path: '/super-admin/sales' },
  { id: 'exports', label: 'Exports', icon: Download, path: '/super-admin/exports' },
  { id: 'assistant', label: 'AI Insights', icon: Bot, path: '/super-admin/assistant' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/super-admin/settings' },
]

const HeaderBrand = () => (
  <div className="flex items-center gap-2.5 shrink-0">
    <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shadow-md overflow-hidden border border-blue-900/40 shrink-0">
      <img src="/bilix_logo.png" alt="Bilix" className="w-full h-full object-cover" />
    </div>
    <div className="hidden sm:block leading-tight">
      <div className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-tight">Bilix</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Super Admin</div>
    </div>
  </div>
)

const NavItems = ({ menuItems, isActive, onNavigate, collapsed }) => (
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

const SuperAdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('superAdminSidebarCollapsed') === 'true')
  const [currentUser, setCurrentUser] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [allStores, setAllStores] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const searchBoxRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const { darkMode, toggleTheme } = useTheme()

  React.useEffect(() => {
    fetchCurrentUser()
    fetchNotifications()
    fetchSearchData()
  }, [])

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const profile = await userAPI.getProfile()
      setCurrentUser(profile)
    } catch (error) {
      console.error('Error fetching current user:', error)
    }
  }

  const fetchNotifications = async () => {
    try {
      const stores = await storeAPI.getAll()
      const pending = stores
        .filter((store) => store.storeStatus === 'PENDING')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((store) => ({
          id: `store-${store.id}`,
          message: `${store.brand || 'A new store'} is awaiting approval`,
          createdAt: store.createdAt,
        }))
      setNotifications(pending)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotifications([])
    }
  }

  const fetchSearchData = async () => {
    try {
      const [stores, users] = await Promise.all([storeAPI.getAll(), userAPI.getAll()])
      setAllStores(stores || [])
      setAllUsers(users || [])
    } catch (error) {
      console.error('Error fetching search data:', error)
    }
  }

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return { pages: [], stores: [], users: [] }

    const pages = menuItems.filter((item) => item.label.toLowerCase().includes(q)).slice(0, 4)

    const stores = allStores
      .filter((store) =>
        [store.brand, store.storeType, store.contact?.email, store.contact?.address]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(q))
      )
      .slice(0, 5)

    const users = allUsers
      .filter((u) => [u.fullName, u.email, u.role].filter(Boolean).some((field) => field.toLowerCase().includes(q)))
      .slice(0, 5)

    return { pages, stores, users }
  }, [searchQuery, allStores, allUsers])

  const hasSearchResults =
    searchResults.pages.length > 0 || searchResults.stores.length > 0 || searchResults.users.length > 0

  const handleSearchNavigate = (path) => {
    navigate(path)
    setSearchOpen(false)
    setSearchQuery('')
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
      localStorage.setItem('superAdminSidebarCollapsed', String(!prev))
      return !prev
    })
  }

  const isActive = (path) => {
    if (path === '/super-admin' || path === '/super-admin/') {
      return location.pathname === '/super-admin' || location.pathname === '/super-admin/'
    }
    return location.pathname.startsWith(path)
  }

  const displayName = currentUser?.fullName || user?.fullName || 'Admin'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F8FAFE] dark:bg-[#0B1220] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {/* Header */}
      <header className="h-16 shrink-0 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 flex items-center justify-between px-4 sm:px-6 z-10 gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <button
            className="lg:hidden shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <HeaderBrand />
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
          <div ref={searchBoxRef} className="relative hidden sm:block w-64">
            <div className="flex items-center gap-2.5 border border-slate-200 dark:border-white/10 rounded-full px-3.5 py-2 bg-slate-50 dark:bg-white/5">
              <Search className="size-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search stores, users, pages..."
                className="outline-none bg-transparent text-sm w-full text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSearchOpen(false)
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer shrink-0"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            {searchOpen && searchQuery.trim() && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden z-20 max-h-96 overflow-y-auto">
                {!hasSearchResults ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">No results for "{searchQuery}"</div>
                ) : (
                  <>
                    {searchResults.pages.length > 0 && (
                      <div className="py-1.5">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Pages</div>
                        {searchResults.pages.map((item) => {
                          const Icon = item.icon
                          return (
                            <button
                              key={`page-${item.id}`}
                              onClick={() => handleSearchNavigate(item.path)}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                            >
                              <Icon className="size-4 text-slate-400 shrink-0" />
                              {item.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {searchResults.stores.length > 0 && (
                      <div className="py-1.5 border-t border-slate-100 dark:border-white/5">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Stores</div>
                        {searchResults.stores.map((store) => (
                          <button
                            key={`store-${store.id}`}
                            onClick={() => handleSearchNavigate('/super-admin/stores')}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                          >
                            <Store className="size-4 text-slate-400 shrink-0" />
                            <span className="truncate">{store.brand || `Store #${store.id}`}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.users.length > 0 && (
                      <div className="py-1.5 border-t border-slate-100 dark:border-white/5">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Users</div>
                        {searchResults.users.map((u) => (
                          <button
                            key={`user-${u.id}`}
                            onClick={() => handleSearchNavigate('/super-admin/users')}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                          >
                            <UsersIcon className="size-4 text-slate-400 shrink-0" />
                            <span className="truncate">{u.fullName || u.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <button
            onClick={toggleTheme}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <div className="relative">
              <button onClick={() => setNotificationsOpen((open) => !open)} className="relative p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer">
                <Bell className="size-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                    {notifications.length}
                  </span>
                )}
              </button>
            {notificationsOpen && <div className="absolute right-0 top-full mt-2 z-30 w-80 rounded-xl border bg-white dark:bg-slate-900 shadow-lg border-slate-200 dark:border-white/10">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 font-semibold text-sm text-slate-900 dark:text-white">
                Notifications
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">No message yet</div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        setNotificationsOpen(false)
                        navigate('/super-admin/pending-requests')
                      }}
                      className="w-full text-left px-4 py-3 border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <p className="text-sm text-slate-800 dark:text-slate-200">{n.message}</p>
                      {n.createdAt && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>}
          </div>
          <div className="flex items-center gap-2.5 pl-2 ml-1 border-l border-slate-200 dark:border-white/10">
            <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {initial}
            </div>
            <div className="hidden sm:block text-sm">
              <div className="font-semibold text-slate-900 dark:text-white leading-tight">{displayName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Super Admin</div>
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
          <NavItems menuItems={menuItems} isActive={isActive} onNavigate={handleNavigate} collapsed={collapsed} />
          <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-1">
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
        {sidebarOpen && <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative h-full w-64 bg-white dark:bg-slate-900 flex flex-col shadow-xl">
            <div className="p-4 border-b border-slate-200 dark:border-white/10"><HeaderBrand /></div>
            <NavItems menuItems={menuItems} isActive={isActive} onNavigate={handleNavigate} />
            <div className="p-3 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="size-[18px]" />
                Log Out
              </button>
            </div>
          </aside>
        </div>}

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-[#F8FAFE] dark:bg-[#0B1220]">{children}</main>
      </div>

      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setLogoutConfirmOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Log out?</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Are you sure you want to leave the Super Admin panel?</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setLogoutConfirmOpen(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10">Cancel</button>
              <button onClick={confirmLogout} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Log out</button>
            </div>
          </div>
        </div>
      )}
      {(location.pathname === '/super-admin' || location.pathname === '/super-admin/') && (
        <AssistantWidget mode="system" />
      )}
    </div>
  )
}

export default SuperAdminLayout
