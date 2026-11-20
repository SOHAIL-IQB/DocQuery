import { memo, useState } from 'react'
import { motion } from 'motion/react'
import { Check, Copy, AlertTriangle, FileText } from 'lucide-react'
import { toast } from 'sonner'
import Markdown from './Markdown'
import SourceDialog from './SourceDialog'
import AvatarIcon from '@/components/common/AvatarIcon'
import { LogoMark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

function Sources({ sources, onOpen }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Sources</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {sources.map((s, i) => (
          <button
            key={`${s.documentId}-${s.chunkIndex}-${i}`}
            onClick={() => onOpen(i)}
            className="group/src flex items-start gap-2.5 rounded-xl border bg-card p-2.5 text-left transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-sm"
          >
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/12 font-mono text-[10.5px] font-semibold text-primary">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-xs font-medium">{s.fileName}</span>
              </span>
              <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{s.chunkText}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Thinking() {
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </span>
      <span className="shimmer-text font-medium">Searching your documents…</span>
    </div>
  )
}

function Message({ message, userAvatar }) {
  const [copied, setCopied] = useState(false)
  const [openSource, setOpenSource] = useState(null)
  const isUser = message.role === 'user'
  const sources = message.sources || []

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-end gap-3"
      >
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-secondary-foreground sm:max-w-[75%]">
          {message.content}
        </div>
        <AvatarIcon avatarId={userAvatar} className="mt-0.5 hidden size-7 sm:inline-flex" />
      </motion.div>
    )
  }

  const streaming = message.pending
  const waiting = streaming && !message.content

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group/msg flex gap-3"
    >
      <LogoMark className="mt-0.5 size-7 rounded-lg" />
      <div className="min-w-0 flex-1 pt-0.5">
        {message.error ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{message.error}</span>
          </div>
        ) : waiting ? (
          <Thinking />
        ) : (
          <div className={cn(streaming && '[&_.prose-chat>*:last-child]:after:ml-0.5 [&_.prose-chat>*:last-child]:after:inline-block [&_.prose-chat>*:last-child]:after:h-4 [&_.prose-chat>*:last-child]:after:w-[3px] [&_.prose-chat>*:last-child]:after:translate-y-0.5 [&_.prose-chat>*:last-child]:after:animate-caret [&_.prose-chat>*:last-child]:after:rounded-full [&_.prose-chat>*:last-child]:after:bg-primary [&_.prose-chat>*:last-child]:after:content-[""]')}>
            <Markdown content={message.content} sources={sources} onCite={setOpenSource} />
          </div>
        )}

        {!streaming && sources.length > 0 && <Sources sources={sources} onOpen={setOpenSource} />}

        {!streaming && !message.error && message.content && (
          <div className="mt-2 flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover/msg:opacity-100">
            <Tooltip content={copied ? 'Copied' : 'Copy answer'}>
              <Button variant="ghost" size="icon-xs" onClick={copy} className="text-muted-foreground" aria-label="Copy answer">
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </Tooltip>
          </div>
        )}
      </div>
      <SourceDialog
        source={openSource !== null ? sources[openSource] : null}
        index={openSource ?? 0}
        onOpenChange={(o) => !o && setOpenSource(null)}
      />
    </motion.div>
  )
}

export default memo(Message)
