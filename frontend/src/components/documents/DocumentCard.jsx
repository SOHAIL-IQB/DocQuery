import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { MoreHorizontal, Pencil, Trash2, MessageSquareText, AlertCircle, Loader2, Sparkles } from 'lucide-react'
import FileIcon from './FileIcon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useWorkspace } from '@/context/WorkspaceContext'
import { cn, formatBytes, timeAgo } from '@/lib/utils'

function StatusBadge({ doc }) {
  if (doc.status === 'Ready') return <Badge variant="success"><span className="size-1.5 rounded-full bg-current" />Ready</Badge>
  if (doc.status === 'Failed') return <Badge variant="destructive"><AlertCircle />Failed</Badge>
  return <Badge variant="default"><Loader2 className="animate-spin" />Indexing</Badge>
}

export function UploadingCard({ upload }) {
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <FileIcon name={upload.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{upload.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(upload.size)} · Uploading…</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Progress value={upload.progress} className="flex-1" />
        <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{upload.progress}%</span>
      </div>
    </motion.div>
  )
}

export default function DocumentCard({ doc }) {
  const navigate = useNavigate()
  const { renameDocument, deleteDocument } = useWorkspace()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState(doc.fileName)
  const ready = doc.status === 'Ready'
  const processing = doc.status === 'Processing'

  const ask = () => navigate('/chat', { state: { documentIds: [doc._id] } })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-all',
        ready && 'hover:border-foreground/15 hover:shadow-[0_8px_30px_-12px_rgb(0_0_0/0.2)]',
      )}
    >
      <div className="flex items-start gap-3">
        <FileIcon name={doc.fileName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={doc.fileName}>{doc.fileName}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {formatBytes(doc.fileSize)} · {timeAgo(doc.createdAt)}
            {ready && doc.chunkCount ? ` · ${doc.chunkCount} passage${doc.chunkCount === 1 ? '' : 's'}` : ''}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="-mt-1 -mr-1 text-muted-foreground" aria-label="Document actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {ready && <DropdownMenuItem onSelect={ask}><MessageSquareText /> Ask about this</DropdownMenuItem>}
            <DropdownMenuItem onSelect={() => { setName(doc.fileName); setRenameOpen(true) }}><Pencil /> Rename</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}><Trash2 /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {processing ? (
        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{doc.progress < 5 ? 'Reading document…' : doc.progress < 90 ? 'Creating embeddings…' : 'Writing summary…'}</span>
            <span className="tabular-nums text-muted-foreground">{doc.progress || 0}%</span>
          </div>
          <Progress value={Math.max(4, doc.progress || 0)} />
        </div>
      ) : doc.status === 'Failed' ? (
        <p className="mt-auto rounded-lg bg-destructive/8 px-3 py-2 text-xs leading-relaxed text-destructive">
          {doc.error || 'Processing failed. Try uploading the file again.'}
        </p>
      ) : (
        <>
          {doc.summary ? (
            <p className="line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
              <Sparkles className="mr-1 inline size-3 -translate-y-px text-primary" />
              {doc.summary}
            </p>
          ) : (
            <p className="text-[13px] text-muted-foreground">Indexed and ready for questions.</p>
          )}
          <div className="mt-auto flex items-center justify-between pt-1">
            <StatusBadge doc={doc} />
            <Button variant="ghost" size="sm" onClick={ask} className="-mr-1.5 text-primary hover:text-primary">
              Ask <MessageSquareText />
            </Button>
          </div>
        </>
      )}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              renameDocument(doc._id, name)
              setRenameOpen(false)
            }}
          >
            <DialogHeader><DialogTitle>Rename document</DialogTitle></DialogHeader>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={200} onFocus={(e) => {
              const dot = e.target.value.lastIndexOf('.')
              e.target.setSelectionRange(0, dot > 0 ? dot : e.target.value.length)
            }} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!name.trim()}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete document?"
        description={<>“{doc.fileName}” and its search index will be permanently removed. Past answers that cited it will keep their text.</>}
        confirmText="Delete document"
        onConfirm={() => deleteDocument(doc)}
      />
    </motion.div>
  )
}
