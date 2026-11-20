import { useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { useWorkspace, ACCEPT_ATTR } from '@/context/WorkspaceContext'
import { cn } from '@/lib/utils'

export default function UploadDropzone({ compact = false, disabled = false }) {
  const { uploadFiles } = useWorkspace()
  const [over, setOver] = useState(false)

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      // The drop itself bubbles up to the app-wide drop handler, which uploads the files.
      onDrop={() => setOver(false)}
      className={cn(
        'group relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-2xl border border-dashed bg-card/40 transition-all',
        compact ? 'p-4' : 'flex-col justify-center px-6 py-12 text-center',
        over ? 'border-primary bg-primary/5' : 'hover:border-primary/50 hover:bg-card',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <input
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => { uploadFiles(e.target.files); e.target.value = '' }}
      />
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-transform group-hover:scale-105',
          compact ? 'size-10' : 'size-14 rounded-2xl',
        )}
      >
        <UploadCloud className={compact ? 'size-5' : 'size-7'} />
      </span>
      <span className={cn(compact ? 'min-w-0 text-left' : 'mt-1')}>
        <span className={cn('block font-medium', !compact && 'text-base')}>
          {disabled ? 'Storage limit reached' : <>Drop files here or <span className="text-primary">browse</span></>}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">PDF, DOCX, TXT, MD · up to 10 MB each · 50 MB total</span>
      </span>
    </label>
  )
}
