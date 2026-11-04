import { useEffect, useState } from 'react'
import { Building2, RefreshCw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingState, PageHeader, Panel } from '@/components/ui/page'
import { branchAPI, userAPI } from '@/services/api'
import { toast } from 'sonner'

const fields = [
  { key: 'name', label: 'Branch name', required: true },
  { key: 'address', label: 'Address' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'email', label: 'Email', type: 'email' },
]

export default function SettingsPage() {
  const [branchId, setBranchId] = useState(null)
  const [branch, setBranch] = useState({ name: '', address: '', phone: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const profile = await userAPI.getProfile()
      if (!profile?.branchId) throw new Error('No branch is assigned to this account.')
      const data = await branchAPI.getById(profile.branchId)
      setBranchId(profile.branchId)
      setBranch({ name: data.name || '', address: data.address || '', phone: data.phone || '', email: data.email || '' })
    } catch (err) {
      setError(err.message || 'Unable to load branch settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!branchId) return
    if (!branch.name.trim()) { toast.error('Branch name is required.'); return }
    setSaving(true)
    try {
      const updated = await branchAPI.update(branchId, branch)
      setBranch({ name: updated.name || '', address: updated.address || '', phone: updated.phone || '', email: updated.email || '' })
      window.dispatchEvent(new Event('branchInfoUpdated'))
      toast.success('Branch details saved.')
    } catch (err) {
      toast.error(err.message || 'Could not save branch details.')
    } finally { setSaving(false) }
  }

  return <div className="space-y-6">
    <PageHeader title="Branch Settings" description="Update this branch’s persisted name, location and contact details."
      actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="size-4" /> Refresh</Button>} />
    <Panel title="Branch details" subtitle="Changes are saved to the branch record" className="max-w-4xl">
      {error && <p role="alert" className="mb-4 text-sm text-rose-500">{error}</p>}
      {loading ? <LoadingState label="Loading branch details…" /> : <>
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-white/10">
          <span className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400"><Building2 className="size-5" /></span>
          <div><p className="text-sm font-semibold text-slate-900 dark:text-white">{branch.name || 'Unnamed branch'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Branch #{branchId}</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => <label key={field.key} className={field.key === 'address' ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{field.label}{field.required ? ' *' : ''}</span>
            <Input type={field.type || 'text'} value={branch[field.key]}
              onChange={(event) => setBranch((current) => ({ ...current, [field.key]: event.target.value }))}
              className="h-10 text-sm" />
          </label>)}
        </div>
        <div className="mt-6 flex justify-end border-t border-slate-200 pt-5 dark:border-white/10">
          <Button onClick={save} disabled={saving || !branchId} className="bg-blue-600 text-white hover:bg-blue-700"><Save className="size-4" /> {saving ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </>}
    </Panel>
  </div>
}
