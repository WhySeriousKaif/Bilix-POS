import React, { useState, useEffect } from 'react'
import { Search, RefreshCw, Users as UsersIcon, Mail, Phone } from 'lucide-react'
import { format } from 'date-fns'
import { useSearchParams } from 'react-router-dom'
import { userAPI } from '@/services/api'

const Card = ({ className = '', children }) => <div className={`rounded-xl border bg-white dark:bg-slate-900 ${className}`}>{children}</div>
const CardHeader = ({ children }) => <div className="p-6 pb-3">{children}</div>
const CardContent = ({ className = '', children }) => <div className={`p-6 ${className}`}>{children}</div>
const CardTitle = ({ children }) => <h2 className="text-lg font-bold">{children}</h2>
const Input = (props) => <input {...props} />
const Button = ({ children, className = '', ...props }) => <button {...props} className={`rounded-md px-3 py-2 cursor-pointer ${className}`}>{children}</button>
const Table = ({ children }) => <table className="w-full text-sm">{children}</table>
const TableHeader = ({ children }) => <thead>{children}</thead>
const TableBody = ({ children }) => <tbody>{children}</tbody>
const TableRow = ({ children }) => <tr className="border-b border-slate-100 dark:border-white/10">{children}</tr>
const TableHead = ({ children }) => <th className="p-3 text-left text-slate-500">{children}</th>
const TableCell = ({ children, className = '' }) => <td className={`p-3 ${className}`}>{children}</td>

const ROLE_LABELS = {
  ROLE_ADMIN: 'Super Admin',
  ROLE_STORE_ADMIN: 'Store Admin',
  ROLE_STORE_MANAGER: 'Store Manager',
  ROLE_BRANCH_MANAGER: 'Branch Manager',
  ROLE_BRANCH_CASHIER: 'Cashier',
  ROLE_CASHIER: 'Cashier (Legacy)',
  ROLE_STORE_EMPLOYEE: 'Store Employee',
  ROLE_USER: 'User',
}

const ROLE_BADGE_COLORS = {
  ROLE_ADMIN: 'bg-violet-100 text-violet-800 dark:bg-violet-500/10 dark:text-violet-400',
  ROLE_STORE_ADMIN: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400',
  ROLE_STORE_MANAGER: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400',
  ROLE_BRANCH_MANAGER: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-400',
  ROLE_BRANCH_CASHIER: 'bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300',
  ROLE_CASHIER: 'bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300',
}

const UsersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('search') || '')
  const [roleFilter, setRoleFilter] = useState(() => searchParams.get('role') || 'all')
  const [page, setPage] = useState(() => Math.max(0, Number(searchParams.get('page')) || 0))
  const [pageSize, setPageSize] = useState(() => {
    const value = Number(searchParams.get('size')) || 10
    return [10, 25, 50].includes(value) ? value : 10
  })
  const [sortBy, setSortBy] = useState(() => searchParams.get('sortBy') || 'createdAt')
  const [direction, setDirection] = useState(() => searchParams.get('direction') || 'desc')
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchQuery.trim()
      if (nextSearch !== debouncedSearch) {
        setDebouncedSearch(nextSearch)
        setPage(0)
      }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchQuery, debouncedSearch])

  useEffect(() => {
    fetchUsers()
  }, [page, pageSize, sortBy, direction, debouncedSearch, roleFilter])

  useEffect(() => {
    const next = new URLSearchParams()
    next.set('page', String(page))
    next.set('size', String(pageSize))
    next.set('sortBy', sortBy)
    next.set('direction', direction)
    if (debouncedSearch) next.set('search', debouncedSearch)
    if (roleFilter !== 'all') next.set('role', roleFilter)
    setSearchParams(next, { replace: true })
  }, [page, pageSize, sortBy, direction, debouncedSearch, roleFilter, setSearchParams])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const result = await userAPI.getPaged({
        page,
        size: pageSize,
        sortBy,
        direction,
        search: debouncedSearch,
        role: roleFilter === 'all' ? '' : roleFilter,
      })
      setUsers(result?.content || [])
      setTotalPages(result?.totalPages || 0)
      setTotalElements(result?.totalElements || 0)
    } catch (error) {
      console.error('Error fetching users:', error)
      setUsers([])
      setTotalPages(0)
      setTotalElements(0)
    } finally {
      setLoading(false)
    }
  }

  const roleOptions = Object.keys(ROLE_LABELS)

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Users</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Every user account across every store, system-wide</p>
        </div>
        <Button onClick={fetchUsers} className="inline-flex items-center border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10">
          <RefreshCw className="size-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-10 text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-[#111c35] dark:text-white"
            />
          </div>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(0) }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-[#111c35] dark:text-white sm:w-56">
            <option value="all">All Roles</option>
            {roleOptions.map((role) => <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>)}
          </select>
          <select value={`${sortBy}:${direction}`} onChange={(e) => { const [field, order] = e.target.value.split(':'); setSortBy(field); setDirection(order); setPage(0) }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-[#111c35] dark:text-white sm:w-48">
            <option value="createdAt:desc">Newest joined</option>
            <option value="createdAt:asc">Oldest joined</option>
            <option value="fullName:asc">Name A–Z</option>
            <option value="fullName:desc">Name Z–A</option>
          </select>
          <select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-[#111c35] dark:text-white sm:w-36">
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({totalElements})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="size-8 animate-spin text-blue-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UsersIcon className="size-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || roleFilter !== 'all' ? 'No users found matching your filters' : 'No users yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Store / Branch</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.fullName || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="size-4 text-muted-foreground" />
                            <span>{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="size-4 text-muted-foreground" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${ROLE_BADGE_COLORS[user.role] || 'bg-gray-100 text-gray-800'}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.storeId ? `Store #${user.storeId}` : ''}
                        {user.branchId ? ` / Branch #${user.branchId}` : ''}
                        {!user.storeId && !user.branchId && '—'}
                      </TableCell>
                      <TableCell>
                        {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && totalPages > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} of {totalElements} users · Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button disabled={page === 0} onClick={() => setPage((current) => current - 1)} className="border border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15">Previous</Button>
                <Button disabled={page + 1 >= totalPages} onClick={() => setPage((current) => current + 1)} className="border border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15">Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default UsersPage
