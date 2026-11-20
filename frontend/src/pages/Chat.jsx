import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowDown, FileUp, Sparkles, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import api, { errorMessage, streamChat } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import Message from '@/components/chat/Message'
import Composer from '@/components/chat/Composer'
import { LogoMark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const GENERIC_PROMPTS = [
  'Summarize the key points across my documents',
  'What deadlines or important dates are mentioned?',
  'List any requirements or action items',
  'Explain the main ideas in simple terms',
]

function greeting(name) {
  const h = new Date().getHours()
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return name && name !== 'User' ? `${part}, ${name.split(' ')[0]}` : part
}

function EmptyState({ user, documents, uploads, onPick, onUpload }) {
  const ready = documents.filter((d) => d.status === 'Ready')
  const suggestions = useMemo(() => {
    const fromDocs = ready.flatMap((d) => (d.suggestedQuestions || []).map((q) => ({ q, doc: d })))
    return fromDocs.length ? fromDocs.slice(0, 4) : GENERIC_PROMPTS.map((q) => ({ q }))
  }, [ready])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pt-[10vh] pb-8 text-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
        <LogoMark className="size-12 rounded-2xl" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        {greeting(user?.name)}
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mt-2 text-muted-foreground">
        {documents.length
          ? 'What would you like to know from your documents?'
          : 'Upload a document to start asking questions about it.'}
      </motion.p>

      {documents.length === 0 && uploads.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-8">
          <Button size="lg" onClick={onUpload}>
            <FileUp /> Upload your first document
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">PDF, DOCX, TXT or Markdown · or drop files anywhere</p>
        </motion.div>
      ) : (
        <div className="mt-8 grid w-full gap-2 sm:grid-cols-2 max-sm:[&>*:nth-child(n+3)]:hidden">
          {suggestions.map(({ q, doc }, i) => (
            <motion.button
              key={q}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.05 }}
              onClick={() => onPick(q, doc ? [doc._id] : [])}
              className="group flex flex-col items-start gap-1 rounded-xl border bg-card/60 p-3.5 text-left text-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-md"
            >
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {doc ? <Sparkles className="size-3 text-primary" /> : <Lightbulb className="size-3" />}
                <span className="truncate">{doc ? doc.fileName : 'Try asking'}</span>
              </span>
              <span className="font-medium leading-snug">{q}</span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Chat() {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { openUpload } = useOutletContext()
  const { user } = useAuth()
  const { documents, uploads, createChat, touchChat, chats } = useWorkspace()

  const [messages, setMessages] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [scope, setScope] = useState(() => location.state?.documentIds || [])
  const [atBottom, setAtBottom] = useState(true)

  const abortRef = useRef(null)
  const skipLoadFor = useRef(null)
  const scrollRef = useRef(null)
  const bottomRef = useRef(null)

  const chat = chats.find((c) => c._id === chatId)

  // Keep the scope in sync when navigating here from "Ask about this document".
  useEffect(() => {
    if (location.state?.documentIds) setScope(location.state.documentIds)
  }, [location.state])

  // Drop documents from the scope once they're deleted.
  useEffect(() => {
    setScope((s) => s.filter((id) => documents.some((d) => d._id === id)))
  }, [documents])

  // Load history when switching chats.
  useEffect(() => {
    // A chat we just created while sending — keep the in-flight stream and local messages.
    if (chatId && skipLoadFor.current === chatId) {
      skipLoadFor.current = null
      return
    }
    abortRef.current?.abort()
    if (!chatId) {
      setMessages([])
      return
    }
    let cancelled = false
    setLoadingHistory(true)
    setMessages([])
    api
      .get(`/chat/${chatId}`)
      .then(({ data }) => !cancelled && setMessages(data.data))
      .catch((err) => {
        if (cancelled) return
        toast.error('Could not open this conversation', { description: errorMessage(err) })
        navigate('/chat', { replace: true })
      })
      .finally(() => !cancelled && setLoadingHistory(false))
    return () => { cancelled = true }
  }, [chatId, navigate])

  useEffect(() => () => abortRef.current?.abort(), [])

  // Track whether the user is reading older messages so we don't yank the scroll.
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
  }

  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, atBottom])

  const updateLast = useCallback((fn) => {
    setMessages((m) => {
      const copy = m.slice()
      copy[copy.length - 1] = fn(copy[copy.length - 1])
      return copy
    })
  }, [])

  const send = useCallback(
    async (text, scopeOverride) => {
      const question = (text ?? input).trim()
      if (!question || streaming) return
      const documentIds = scopeOverride ?? scope
      if (scopeOverride) setScope(scopeOverride)

      setInput('')
      setAtBottom(true)
      setStreaming(true)
      setMessages((m) => [
        ...m,
        { _id: `u-${Date.now()}`, role: 'user', content: question },
        { _id: `a-${Date.now()}`, role: 'assistant', content: '', sources: [], pending: true },
      ])

      let id = chatId
      try {
        if (!id) {
          const created = await createChat()
          id = created._id
          skipLoadFor.current = id
          navigate(`/chat/${id}`, { replace: true })
        }

        const controller = new AbortController()
        abortRef.current = controller

        await streamChat({
          chatId: id,
          question,
          documentIds,
          signal: controller.signal,
          onEvent: (ev) => {
            if (ev.type === 'meta') touchChat(id, { title: ev.chatTitle })
            else if (ev.type === 'sources') updateLast((m) => ({ ...m, sources: ev.sources }))
            else if (ev.type === 'token') updateLast((m) => ({ ...m, content: m.content + ev.value }))
            else if (ev.type === 'error') updateLast((m) => ({ ...m, error: ev.message, pending: false }))
            else if (ev.type === 'done') updateLast((m) => ({ ...m, _id: ev.messageId || m._id, pending: false }))
          },
        })
      } catch (err) {
        if (err.name === 'AbortError') {
          updateLast((m) => ({ ...m, pending: false, content: m.content ? `${m.content}\n\n_— response stopped_` : '_Stopped._' }))
        } else {
          updateLast((m) => ({ ...m, pending: false, error: errorMessage(err) }))
        }
      } finally {
        updateLast((m) => (m.pending ? { ...m, pending: false } : m))
        setStreaming(false)
        abortRef.current = null
      }
    },
    [input, streaming, scope, chatId, createChat, navigate, touchChat, updateLast],
  )

  const stop = () => abortRef.current?.abort()

  const isEmpty = !chatId && messages.length === 0

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b px-4 max-md:hidden">
        <h1 className="truncate text-sm font-medium">{chatId ? chat?.title || 'Conversation' : 'New chat'}</h1>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto">
        {isEmpty ? (
          <EmptyState user={user} documents={documents} uploads={uploads} onPick={(q, ids) => send(q, ids)} onUpload={openUpload} />
        ) : loadingHistory ? (
          <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
            <Skeleton className="ml-auto h-10 w-2/3 rounded-2xl" />
            <div className="flex gap-3"><Skeleton className="size-7 rounded-lg" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-3/5" /></div></div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-8 px-4 pt-8 pb-6">
            {messages.map((m) => (
              <Message key={m._id} message={m} userAvatar={user?.avatar} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="relative shrink-0 px-4 pb-4 pb-safe">
        {!atBottom && !isEmpty && (
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => { setAtBottom(true); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-full bg-background shadow-md"
            aria-label="Scroll to bottom"
          >
            <ArrowDown />
          </Button>
        )}
        <div className={cn('mx-auto max-w-3xl', isEmpty && 'max-w-2xl')}>
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={() => send()}
            onStop={stop}
            streaming={streaming}
            uploading={uploads.length > 0}
            onAttach={openUpload}
            documents={documents}
            scope={scope}
            onScopeChange={setScope}
            autoFocus
          />
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Answers come only from your documents and include citations. Verify important information.
          </p>
        </div>
      </div>
    </div>
  )
}
