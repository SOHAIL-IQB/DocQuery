import { Files, ChevronDown, Loader2 } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export default function ScopePicker({ documents, selected, onChange }) {
  const ready = documents.filter((d) => d.status === 'Ready')
  const processing = documents.filter((d) => d.status === 'Processing')
  const label =
    selected.length === 0
      ? 'All documents'
      : selected.length === 1
        ? documents.find((d) => d._id === selected[0])?.fileName || '1 document'
        : `${selected.length} documents`

  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'inline-flex h-8 max-w-[220px] items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium transition-colors hover:bg-accent data-[state=open]:bg-accent',
            selected.length ? 'border-primary/40 bg-primary/8 text-primary' : 'text-muted-foreground',
          )}
        >
          <Files className="size-3.5 shrink-0" />
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-72">
        <DropdownMenuLabel>Answer from</DropdownMenuLabel>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onChange([]) }} className={cn(!selected.length && 'font-medium text-primary')}>
          <Files /> All documents
          <span className="ml-auto text-xs text-muted-foreground">{ready.length}</span>
        </DropdownMenuItem>
        {ready.length > 0 && <DropdownMenuSeparator />}
        <div className="max-h-64 overflow-y-auto">
          {ready.map((d) => (
            <DropdownMenuCheckboxItem
              key={d._id}
              checked={selected.includes(d._id)}
              onCheckedChange={() => toggle(d._id)}
              onSelect={(e) => e.preventDefault()}
            >
              <span className="truncate">{d.fileName}</span>
            </DropdownMenuCheckboxItem>
          ))}
          {processing.map((d) => (
            <div key={d._id} className="flex items-center gap-2 py-1.5 pr-2 pl-8 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              <span className="truncate">{d.fileName}</span>
            </div>
          ))}
        </div>
        {!ready.length && !processing.length && (
          <p className="px-2 py-3 text-xs text-muted-foreground">No documents yet — upload one to get started.</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
