import React, { useState, useEffect } from 'react'
import { RefreshCw, Check, X, Clock, Store, Mail, Phone, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { storeAPI } from '@/services/api'
import { useConfirm } from '@/contexts/ConfirmContext'

const Card = ({ children, className = '' }) => <div className={`rounded-xl border bg-white dark:bg-slate-900 ${className}`}>{children}</div>
const CardHeader = ({ children }) => <div className="p-6 pb-3">{children}</div>
const CardContent = ({ children, className = '' }) => <div className={`p-6 ${className}`}>{children}</div>
const CardTitle = ({ children }) => <h2 className="text-lg font-bold">{children}</h2>
const Button = ({ children, className = '', ...props }) => <button {...props} className={`cursor-pointer rounded-md px-3 py-2 ${className}`}>{children}</button>
const Table = ({ children }) => <table className="w-full text-sm">{children}</table>
const TableHeader = ({ children }) => <thead>{children}</thead>
const TableBody = ({ children }) => <tbody>{children}</tbody>
const TableRow = ({ children }) => <tr className="border-b border-slate-100 dark:border-white/10">{children}</tr>
const TableHead = ({ children, className = '' }) => <th className={`p-3 text-left text-slate-500 ${className}`}>{children}</th>
const TableCell = ({ children, className = '' }) => <td className={`p-3 ${className}`}>{children}</td>

const PendingRequestsPage = () => {
  const confirm = useConfirm()
  const [pendingStores, setPendingStores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPendingRequests()
  }, [])

  const fetchPendingRequests = async () => {
    try {
      setLoading(true)
      const allStores = await storeAPI.getAll()
      const pending = allStores.filter(store => store.storeStatus === 'PENDING')
      setPendingStores(pending)
    } catch (error) {
      console.error('Error fetching pending requests:', error)
      setPendingStores([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (storeId) => {
    try {
      await storeAPI.moderate(storeId, 'ACTIVE')
      await fetchPendingRequests()
      toast.success('Store approved successfully!')
    } catch (error) {
      console.error('Error approving store:', error)
      toast.error('Failed to approve store')
    }
  }

  const handleReject = async (storeId) => {
    const ok = await confirm({
      title: 'Reject this store request?',
      description: 'Are you sure you want to reject this store request?',
      confirmLabel: 'Reject',
      variant: 'destructive',
    })
    if (!ok) return

    try {
      await storeAPI.moderate(storeId, 'BLOCKED')
      await fetchPendingRequests()
      toast.success('Store request rejected')
    } catch (error) {
      console.error('Error rejecting store:', error)
      toast.error('Failed to reject store')
    }
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Pending Requests</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Review and approve store registration requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPendingRequests}>
          <RefreshCw className="size-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Store Requests ({pendingStores.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : pendingStores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="size-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No pending requests</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingStores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            <Store className="size-4" />
                            {store.brand || 'N/A'}
                          </div>
                          {store.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px] mt-1">
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
                        {store.createdAt
                          ? format(new Date(store.createdAt), 'MMM d, yyyy')
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(store.id)}
                          >
                            <Check className="size-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReject(store.id)}
                          >
                            <X className="size-4 mr-2" />
                            Reject
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
    </div>
  )
}

export default PendingRequestsPage
