import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { AlertCircle, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import api, { errorMessage } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Logo, LogoMark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function PasswordInput({ id, value, onChange, autoComplete, disabled }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        disabled={disabled}
        placeholder="••••••••"
        className="pr-10"
        required
        minLength={autoComplete === 'new-password' ? 6 : undefined}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        aria-label={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

function strength(pw) {
  let s = 0
  if (pw.length >= 6) s++
  if (pw.length >= 10) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s++
  return s
}

function ShowcasePanel() {
  return (
    <div className="relative hidden overflow-hidden border-l bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-70 [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)]" />
      <div />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto w-full max-w-md space-y-4"
      >
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-sm">
          What does the contract say about termination notice?
        </div>
        <div className="flex gap-3 rounded-2xl border bg-card/80 p-4 shadow-xl backdrop-blur">
          <LogoMark className="size-7 rounded-lg" />
          <div className="text-sm leading-relaxed">
            Either party may terminate with <strong>30 days’ written notice</strong>
            <span className="mx-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-primary/15 px-1 font-mono text-[10.5px] font-semibold text-primary">1</span>
            and immediate termination is allowed for material breach
            <span className="mx-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-primary/15 px-1 font-mono text-[10.5px] font-semibold text-primary">2</span>.
          </div>
        </div>
      </motion.div>
      <div className="relative">
        <p className="text-lg font-medium tracking-tight">Grounded answers, with receipts.</p>
        <p className="mt-1 text-sm text-muted-foreground">Every response cites the exact passages it came from.</p>
      </div>
    </div>
  )
}

export default function Auth({ mode }) {
  const isSignup = mode === 'signup'
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const pwStrength = strength(form.password)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (isSignup && form.password.length < 6) return setError('Password must be at least 6 characters.')
    try {
      setLoading(true)
      const payload = isSignup ? form : { email: form.email, password: form.password }
      const { data } = await api.post(isSignup ? '/auth/register' : '/auth/login', payload)
      login(data.data.token, data.data)
      toast.success(isSignup ? 'Welcome to DocQuery!' : `Welcome back${data.data.name && data.data.name !== 'User' ? `, ${data.data.name.split(' ')[0]}` : ''}`)
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (err) {
      setError(errorMessage(err, isSignup ? 'Could not create your account.' : 'Invalid email or password.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link to="/"><ArrowLeft /> Home</Link>
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm"
          >
            <h1 className="text-2xl font-semibold tracking-tight">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isSignup ? 'Start asking questions about your documents in minutes.' : 'Sign in to continue to your workspace.'}
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4" noValidate={false}>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm text-destructive"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={form.name} onChange={set('name')} placeholder="Ada Lovelace" autoComplete="name" disabled={loading} maxLength={50} required />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" autoComplete="email" disabled={loading} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput id="password" value={form.password} onChange={set('password')} autoComplete={isSignup ? 'new-password' : 'current-password'} disabled={loading} />
                {isSignup && form.password && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className={cn(
                            'h-1 flex-1 rounded-full bg-muted transition-colors',
                            pwStrength >= i && (pwStrength <= 1 ? 'bg-destructive' : pwStrength === 2 ? 'bg-warning' : 'bg-success'),
                          )}
                        />
                      ))}
                    </div>
                    <span className="w-12 text-right text-xs text-muted-foreground">{['Too short', 'Weak', 'Fair', 'Good', 'Strong'][pwStrength]}</span>
                  </div>
                )}
              </div>

              <Button type="submit" className="h-10 w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                {isSignup ? 'Create account' : 'Sign in'}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              {isSignup ? 'Already have an account?' : 'New to DocQuery?'}{' '}
              <Link to={isSignup ? '/login' : '/signup'} className="font-medium text-foreground underline-offset-4 hover:underline">
                {isSignup ? 'Sign in' : 'Create an account'}
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
      <ShowcasePanel />
    </div>
  )
}
