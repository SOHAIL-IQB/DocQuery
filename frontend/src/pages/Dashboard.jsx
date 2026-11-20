import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { FileText, Layers, MessagesSquare, HardDrive, Search, Upload, SquarePen, ArrowRight, MessageCircle, Check } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace, LIMITS } from '@/context/WorkspaceContext'
import DocumentCard, { UploadingCard } from '@/components/documents/DocumentCard'
import UploadDropzone from '@/components/documents/UploadDropzone'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatBytes, timeAgo } from '@/lib/utils'

const FILTERS = ['All', 'Ready', 'Processing', 'Failed']

function Stat({ icon: Icon, label, value, hint, children, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}>
      <Card className="h-full p-4 sm:p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[13px] font-medium">{label}</span>
          <Icon className="size-4" />
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums sm:text-[28px]">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        {children}
      </Card>
    </motion.div>
  )
}

function Onboarding({ hasDocs, hasReady, hasChats }) {
  const steps = [
    { done: hasDocs, label: 'Upload a document', desc: 'PDF, Word, text or Markdown.' },
    { done: hasReady, label: 'Let it index', desc: 'We split it into passages and embed them.' },
    { done: hasChats, label: 'Ask your first question', desc: 'Get an answer with citations.' },
  ]
  if (steps.every((s) => s.done)) return null
  return (
    <Card className="overflow-hidden">
      <div className="relative p-5 sm:p-6">
        <div className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full bg-primary/15 blur-3xl" />
        <h3 className="text-[15px] font-semibold tracking-tight">Get started</h3>
        <p className="mt-1 text-sm text-muted-foreground">Three steps to your first grounded answer.</p>
        <ol className="mt-5 space-y-4">
          {steps.map((s, i) => (
            <li key={s.label} className="flex gap-3">
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  s.done ? 'border-transparent bg-success text-white' : 'text-muted-foreground',
                )}
              >
                {s.done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <div>
                <p className={cn('text-sm font-medium', s.done && 'text-muted-foreground line-through')}>{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { openUpload } = useOutletContext()
  const navigate = useNavigate()
  const { documents, docsLoaded, uploads, chats, storageUsed } = useWorkspace()
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')

  useEffect(() => {
    api.get('/users/analytics').then(({ data }) => setStats(data.data)).catch(() => {})
  }, [documents.length, chats.length])

  const counts = useMemo(() => {
    const c = { All: documents.length, Ready: 0, Processing: 0, Failed: 0 }
    for (const d of documents) c[d.status] = (c[d.status] || 0) + 1
    return c
  }, [documents])

  const visible = documents.filter(
    (d) => (filter === 'All' || d.status === filter) && d.fileName.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const storagePct = Math.min(100, (storageUsed / LIMITS.storageBytes) * 100)
  const passages = documents.reduce((n, d) => n + (d.chunkCount || 0), 0)
  const firstName = user?.name && user.name !== 'User' ? user.name.split(' ')[0] : null
  // Accounts created in the last 30 minutes get "Welcome" instead of "Welcome back".
  const [isNew] = useState(() => !!user?.createdAt && Date.now() - new Date(user.createdAt).getTime() < 30 * 60 * 1000)

  return (
    <div className="h-full overflow-y-auto">
      <div className="@container mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {`${isNew ? 'Welcome' : 'Welcome back'}${firstName ? `, ${firstName}` : ''}`}
            </motion.h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Your private knowledge base. Upload documents, then ask anything.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openUpload}><Upload /> Upload</Button>
            <Button onClick={() => navigate('/chat')}><SquarePen /> New chat</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <Stat icon={FileText} label="Documents" value={documents.length} hint={`${counts.Ready} ready · ${LIMITS.documents - documents.length} slots left`} />
          <Stat icon={Layers} label="Indexed passages" value={passages.toLocaleString()} hint="Searchable by meaning" delay={0.04} />
          <Stat icon={MessagesSquare} label="Questions asked" value={stats ? stats.questionsAsked.toLocaleString() : '—'} hint={`across ${chats.length} conversation${chats.length === 1 ? '' : 's'}`} delay={0.08} />
          <Stat icon={HardDrive} label="Storage" value={formatBytes(storageUsed)} delay={0.12}>
            <Progress value={storagePct} className="mt-3" indicatorClassName={storagePct > 90 ? 'bg-destructive' : storagePct > 75 ? 'bg-warning' : undefined} />
            <p className="mt-1.5 text-xs text-muted-foreground">{Math.round(storagePct)}% of 50 MB</p>
          </Stat>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 @4xl:grid-cols-[minmax(0,1fr)_300px]">
          {/* Library */}
          <section className="@container min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Library</h2>
              {documents.length > 0 && (
                <div className="relative sm:w-64">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents" className="h-9 pl-9" />
                </div>
              )}
            </div>

            {documents.length > 0 && (
              <div className="mt-3 flex gap-1 overflow-x-auto">
                {FILTERS.filter((f) => f === 'All' || counts[f]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'relative h-8 rounded-full px-3 text-[13px] font-medium transition-colors',
                      filter === f ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {filter === f && <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-full bg-secondary" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />}
                    <span className="relative">{f} <span className="text-muted-foreground tabular-nums">{counts[f]}</span></span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4">
              {!docsLoaded ? (
                <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
                </div>
              ) : documents.length === 0 && uploads.length === 0 ? (
                <UploadDropzone />
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
                    <AnimatePresence mode="popLayout">
                      {uploads.map((u) => <UploadingCard key={u.id} upload={u} />)}
                      {visible.map((d) => <DocumentCard key={d._id} doc={d} />)}
                    </AnimatePresence>
                  </div>
                  {visible.length === 0 && uploads.length === 0 && (
                    <p className="py-12 text-center text-sm text-muted-foreground">No documents match your search.</p>
                  )}
                  <div className="mt-3">
                    <UploadDropzone compact disabled={documents.length >= LIMITS.documents || storageUsed >= LIMITS.storageBytes} />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Side column */}
          <aside className="grid min-w-0 grid-cols-1 content-start gap-6 @2xl:grid-cols-2 @4xl:grid-cols-1">
            <Onboarding hasDocs={documents.length > 0} hasReady={counts.Ready > 0} hasChats={(stats?.questionsAsked || 0) > 0} />

            <Card>
              <div className="flex items-center justify-between p-5 pb-3">
                <h3 className="text-[15px] font-semibold tracking-tight">Recent conversations</h3>
                {chats.length > 0 && <Link to="/chat" className="text-xs font-medium text-primary hover:underline">New</Link>}
              </div>
              {chats.length === 0 ? (
                <div className="px-5 pb-5">
                  <p className="text-sm text-muted-foreground">No conversations yet.</p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/chat')}>
                    Start a conversation <ArrowRight />
                  </Button>
                </div>
              ) : (
                <ul className="px-2 pb-2">
                  {chats.slice(0, 6).map((c) => (
                    <li key={c._id}>
                      <Link to={`/chat/${c._id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent">
                        <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-sm">{c.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(c.updatedAt || c.createdAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}
