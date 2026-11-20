import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Loader2, Monitor, Moon, Sun, Check } from 'lucide-react'
import { toast } from 'sonner'
import api, { errorMessage } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import AvatarIcon, { AVATARS } from '@/components/common/AvatarIcon'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

function Section({ title, description, children, className }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 py-8 md:grid-cols-[240px_1fr] md:gap-10">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Card className={cn('p-5 sm:p-6', className)}>{children}</Card>
    </motion.section>
  )
}

function ProfileSection() {
  const { user, updateUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [avatar, setAvatar] = useState(user?.avatar || 'avatar1')
  const [saving, setSaving] = useState(false)
  const dirty = name.trim() !== (user?.name || '') || avatar !== user?.avatar

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.patch('/users/profile', { name, avatar })
      updateUser(data.data)
      toast.success('Profile updated')
    } catch (err) {
      toast.error('Could not update profile', { description: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title="Profile" description="How you appear across DocQuery.">
      <form onSubmit={save} className="space-y-6">
        <div className="flex items-center gap-4">
          <AvatarIcon avatarId={avatar} className="size-14" />
          <div className="min-w-0">
            <p className="truncate font-medium">{name || 'Your name'}</p>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email || ''} disabled />
        </div>
        <div className="space-y-3">
          <Label>Avatar</Label>
          <div className="flex flex-wrap gap-2.5">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAvatar(a.id)}
                className={cn(
                  'rounded-full p-0.5 ring-2 ring-transparent transition-all hover:scale-105',
                  avatar === a.id && 'ring-primary',
                )}
                aria-label={`Choose avatar ${a.id.slice(-1)}`}
                aria-pressed={avatar === a.id}
              >
                <AvatarIcon avatarId={a.id} className="size-10" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end border-t pt-5">
          <Button type="submit" disabled={!dirty || !name.trim() || saving}>
            {saving && <Loader2 className="animate-spin" />} Save changes
          </Button>
        </div>
      </form>
    </Section>
  )
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  const options = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ]
  return (
    <Section title="Appearance" description="Choose how DocQuery looks on this device.">
      <div className="grid grid-cols-3 gap-3">
        {options.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTheme(id)}
            className={cn(
              'group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all hover:border-foreground/20',
              theme === id && 'border-primary ring-4 ring-ring/20 hover:border-primary',
            )}
          >
            <div
              className={cn(
                'flex h-20 flex-col gap-1.5 p-3',
                id === 'light' && 'bg-zinc-100',
                id === 'dark' && 'bg-zinc-900',
                id === 'system' && 'bg-gradient-to-r from-zinc-100 from-50% to-zinc-900 to-50%',
              )}
            >
              <span className={cn('h-2 w-10 rounded-full', id === 'dark' ? 'bg-zinc-700' : 'bg-zinc-300')} />
              <span className={cn('h-2 w-16 rounded-full', id === 'dark' ? 'bg-zinc-700' : 'bg-zinc-300')} />
              <span className="mt-auto h-2 w-8 rounded-full bg-violet-500" />
            </div>
            <div className="flex items-center gap-2 border-t px-3 py-2.5 text-sm font-medium">
              <Icon className="size-4 text-muted-foreground" /> {label}
              {theme === id && <Check className="ml-auto size-4 text-primary" />}
            </div>
          </button>
        ))}
      </div>
    </Section>
  )
}

function PasswordSection() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const mismatch = form.confirm && form.next !== form.confirm

  const save = async (e) => {
    e.preventDefault()
    if (form.next.length < 6) return toast.error('New password must be at least 6 characters.')
    if (mismatch) return
    setSaving(true)
    try {
      await api.post('/users/change-password', { currentPassword: form.current, newPassword: form.next })
      toast.success('Password updated')
      setForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      toast.error('Could not update password', { description: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <Section title="Password" description="Use at least 6 characters. A longer passphrase is stronger.">
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current">Current password</Label>
          <Input id="current" type="password" autoComplete="current-password" value={form.current} onChange={set('current')} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="next">New password</Label>
            <Input id="next" type="password" autoComplete="new-password" value={form.next} onChange={set('next')} required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required aria-invalid={!!mismatch} />
            {mismatch && <p className="text-xs text-destructive">Passwords don’t match.</p>}
          </div>
        </div>
        <div className="flex justify-end border-t pt-5">
          <Button type="submit" variant="secondary" disabled={saving || !form.current || !form.next || !!mismatch}>
            {saving && <Loader2 className="animate-spin" />} Update password
          </Button>
        </div>
      </form>
    </Section>
  )
}

function DangerSection() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  const destroy = async () => {
    setBusy(true)
    try {
      await api.delete('/users/account')
      logout()
      toast.success('Your account has been deleted')
      navigate('/')
    } catch (err) {
      toast.error('Could not delete account', { description: errorMessage(err) })
      setBusy(false)
    }
  }

  return (
    <Section title="Delete account" description="Permanently remove your account and everything in it." className="border-destructive/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-muted-foreground">
          This deletes your profile, all documents, their search index, and every conversation. It can’t be undone.
        </p>
        <Button variant="destructive" onClick={() => { setConfirm(''); setOpen(true) }} className="shrink-0">Delete account</Button>
      </div>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              All of your documents and conversations will be permanently erased. Type <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="destructive" onClick={destroy} disabled={confirm !== 'DELETE' || busy}>
              {busy && <Loader2 className="animate-spin" />} Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  )
}

export default function Settings() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Manage your profile, appearance and security.</p>
        <div className="mt-4 divide-y">
          <ProfileSection />
          <AppearanceSection />
          <PasswordSection />
          <DangerSection />
        </div>
      </div>
    </div>
  )
}
