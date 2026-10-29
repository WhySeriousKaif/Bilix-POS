import React, { useState, useEffect } from 'react'
import { Search, RefreshCw, Check, X, Eye, Store, Users, MapPin, Phone, Mail, Hash, Calendar, Tag, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { storeAPI } from '@/services/api'

// Small local primitives keep this page easy to understand and remove the need
// for a separate UI component library.
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
const TableHead = ({ children, className = '' }) => <th className={`p-3 text-left text-slate-500 ${className}`}>{children}</th>
const TableCell = ({ children, className = '' }) => <td className={`p-3 ${className}`}>{children}</td>
const Dialog = ({ open, onOpenChange, children }) => open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => onOpenChange(false)}>{children}</div> : null
const DialogContent = ({ children, className = '' }) => <div className={`relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900 ${className}`} onClick={(event) => event.stopPropagation()}>{children}</div>
const DialogHeader = ({ children }) => <div>{children}</div>
const DialogTitle = ({ children, className = '' }) => <h2 className={className}>{children}</h2>

const StoresPage = () => {
  const [stores, setStores] = useState([])
  const [filteredStores, setFilteredStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStore, setSelectedStore] = useState(null)

  useEffect(() => {
    fetchStores()
  }, [])

  useEffect(() => {
    filterStores()
  }, [searchQuery, stores])

  const fetchStores = async () => {
    try {
      setLoading(true)
      const data = await storeAPI.getAll()
      setStores(data || [])
    } catch (error) {
      console.error('Error fetching stores:', error)
      setStores([])
    } finally {
      setLoading(false)
    }
  }

  const filterStores = () => {
    if (!searchQuery.trim()) {
      setFilteredStores(stores)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = stores.filter((store) =>
      store.brand?.toLowerCase().includes(query) ||
      store.description?.toLowerCase().includes(query) ||
      store.contact?.email?.toLowerCase().includes(query) ||
      store.contact?.phone?.toLowerCase().includes(query)
    )
    setFilteredStores(filtered)
  }

  const handleModerateStore = async (storeId, status) => {
    try {
      await storeAPI.moderate(storeId, status)
      await fetchStores()
      toast.success(`Store ${status === 'ACTIVE' ? 'approved' : 'blocked'} successfully!`)
    } catch (error) {
      console.error('Error moderating store:', error)
      toast.error('Failed to update store status')
    }
  }

  const getStatusColor = (status) => {
    const colorMap = {
      PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',
      ACTIVE: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400',
      BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status) => {
    const statusMap = {
      PENDING: 'Pending',
      ACTIVE: 'Active',
      BLOCKED: 'Blocked',
    }
    return statusMap[status] || status
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Stores</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage all stores in the system</p>
        </div>
        <Button onClick={fetchStores} className="inline-flex items-center border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10">
          <RefreshCw className="size-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-10 text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-[#111c35] dark:text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stores Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Stores ({filteredStores.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Store className="size-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No stores found matching your search' : 'No stores available'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{store.brand || 'N/A'}</div>
                          {store.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {store.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{store.storeType || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {store.contact?.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="size-4 text-muted-foreground" />
                              <span>{store.contact.email}</span>
                            </div>
                          )}
                          {store.contact?.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="size-4 text-muted-foreground" />
                              <span>{store.contact.phone}</span>
                            </div>
                          )}
                          {store.contact?.address && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="size-4 text-muted-foreground" />
                              <span className="truncate max-w-[150px]">{store.contact.address}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                            store.storeStatus
                          )}`}
                        >
                          {getStatusLabel(store.storeStatus)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {store.createdAt
                          ? format(new Date(store.createdAt), 'MMM d, yyyy')
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {store.storeStatus === 'PENDING' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                onClick={() => handleModerateStore(store.id, 'ACTIVE')}
                                title="Approve"
                              >
                                <Check className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                onClick={() => handleModerateStore(store.id, 'BLOCKED')}
                                title="Reject"
                              >
                                <X className="size-4" />
                              </Button>
                            </>
                          )}
                          {store.storeStatus === 'ACTIVE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleModerateStore(store.id, 'BLOCKED')}
                              title="Block Store"
                            >
                              <X className="size-4" />
                            </Button>
                          )}
                          {store.storeStatus === 'BLOCKED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                              onClick={() => handleModerateStore(store.id, 'ACTIVE')}
                              title="Activate Store"
                            >
                              <Check className="size-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setSelectedStore(store)}
                            title="View Store Details"
                          >
                            <Eye className="size-4" />
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

      {/* Store Details Dialog */}
      <Dialog open={!!selectedStore} onOpenChange={(open) => !open && setSelectedStore(null)}>
        <DialogContent className="p-0">
          {selectedStore && (
            <>
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-6 py-5 text-white">
                <button
                  type="button"
                  aria-label="Close store details"
                  onClick={() => setSelectedStore(null)}
                  className="absolute right-4 top-4 rounded-full bg-white/15 px-2 py-1 text-lg leading-none text-white hover:bg-white/25"
                >
                  ×
                </button>
                <DialogHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 shrink-0 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/20">
                      <Store className="size-7" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <DialogTitle className="text-xl font-black text-white leading-tight truncate">
                        {selectedStore.brand || 'N/A'}
                      </DialogTitle>
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            selectedStore.storeStatus === 'ACTIVE'
                              ? 'bg-blue-400/25 text-blue-50'
                              : selectedStore.storeStatus === 'PENDING'
                              ? 'bg-amber-400/25 text-amber-50'
                              : 'bg-red-400/25 text-red-50'
                          }`}
                        >
                          {getStatusLabel(selectedStore.storeStatus)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-blue-100/80">
                          <Hash className="size-3" />
                          {selectedStore.id}
                        </span>
                      </div>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="space-y-6 px-6 py-6">
                <section>
                  <div className="mb-2 flex items-center gap-3"><FileText className="size-5 text-blue-500" /><h3 className="text-base font-semibold text-slate-900 dark:text-white">Overview</h3></div>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{selectedStore.description || 'No description available.'}</p>
                </section>

                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 dark:border-white/10">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5"><div className="mb-2 flex items-center gap-2 text-xs text-slate-400"><Tag className="size-4" />Type</div><div className="text-sm font-semibold text-slate-900 dark:text-white">{selectedStore.storeType || 'N/A'}</div></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5"><div className="mb-2 flex items-center gap-2 text-xs text-slate-400"><Calendar className="size-4" />Created</div><div className="text-sm font-semibold text-slate-900 dark:text-white">{selectedStore.createdAt ? format(new Date(selectedStore.createdAt), 'MMM d, yyyy') : 'N/A'}</div></div>
                </div>

                <div className="border-t border-slate-100 pt-4 dark:border-white/10 sm:col-span-2">
                  <div className="mb-3 flex items-center gap-3"><div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10"><Users className="size-5 text-blue-500" /></div><h3 className="text-base font-semibold text-slate-900 dark:text-white">Contact Information</h3></div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                        <Mail className="size-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0"><div className="text-xs text-slate-400">Email</div><div className="truncate text-sm text-slate-700 dark:text-slate-200">{selectedStore.contact?.email || 'N/A'}</div></div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                        <Phone className="size-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div><div className="text-xs text-slate-400">Phone</div><div className="text-sm text-slate-700 dark:text-slate-200">{selectedStore.contact?.phone || 'N/A'}</div></div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                        <MapPin className="size-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0"><div className="text-xs text-slate-400">Address</div><div className="text-sm text-slate-700 dark:text-slate-200">{selectedStore.contact?.address || 'N/A'}</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StoresPage
