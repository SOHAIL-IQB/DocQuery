import { useEffect, useRef } from 'react'
import { ArrowUp, Paperclip, Square, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import ScopePicker from './ScopePicker'
import { cn } from '@/lib/utils'

export default function Composer({
  value, onChange, onSubmit, onStop, streaming, uploading, onAttach, documents, scope, onScopeChange, autoFocus, placeholder,
}) {
  const ref = useRef(null)

  // Auto-grow up to ~8 lines.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [value])

  useEffect(() => {
    if (autoFocus && window.matchMedia('(pointer: fine)').matches) ref.current?.focus()
  }, [autoFocus])

  const canSend = value.trim().length > 0 && !streaming

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canSend) onSubmit()
      }}
      className={cn(
        'rounded-2xl border bg-card shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)] transition-[border-color,box-shadow]',
        'focus-within:border-primary/40 focus-within:shadow-[0_0_0_4px_var(--ring),0_8px_30px_-12px_rgb(0_0_0/0.25)]',
        '[--ring:color-mix(in_oklch,var(--primary)_12%,transparent)]',
      )}
    >
      <Textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            if (canSend) onSubmit()
          }
        }}
        placeholder={placeholder || 'Ask anything about your documents…'}
        className="max-h-[220px] min-h-[52px] px-4 pt-3.5 pb-1"
        maxLength={4000}
        aria-label="Message"
      />
      <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Tooltip content="Upload documents">
            <Button type="button" variant="ghost" size="icon-sm" onClick={onAttach} disabled={uploading} className="text-muted-foreground" aria-label="Upload documents">
              {uploading ? <Loader2 className="animate-spin" /> : <Paperclip />}
            </Button>
          </Tooltip>
          <ScopePicker documents={documents} selected={scope} onChange={onScopeChange} />
        </div>
        {streaming ? (
          <Tooltip content="Stop generating">
            <Button type="button" size="icon-sm" variant="secondary" onClick={onStop} className="rounded-full" aria-label="Stop generating">
              <Square className="size-3 fill-current" />
            </Button>
          </Tooltip>
        ) : (
          <Button type="submit" size="icon-sm" disabled={!canSend} className="rounded-full" aria-label="Send message">
            <ArrowUp className="size-4" strokeWidth={2.5} />
          </Button>
        )}
      </div>
    </form>
  )
}
