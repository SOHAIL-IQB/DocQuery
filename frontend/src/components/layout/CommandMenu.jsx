import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { LayoutGrid, MessageSquareText, Settings, SquarePen, Upload, Moon, Sun, MessageCircle, LogOut } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import FileIcon from '@/components/documents/FileIcon'
import { timeAgo } from '@/lib/utils'

export default function CommandMenu({ open, onOpenChange, onUpload }) {
  const navigate = useNavigate()
  const { chats, documents } = useWorkspace()
  const { resolved, toggle } = useTheme()
  const { logout } = useAuth()

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const run = (fn) => () => {
    onOpenChange(false)
    fn()
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[14vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border bg-popover shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          <DialogPrimitive.Title className="sr-only">Command menu</DialogPrimitive.Title>
          <Command loop>
            <CommandInput placeholder="Search chats, documents, or jump to…" autoFocus />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Actions">
                <CommandItem onSelect={run(() => navigate('/chat'))}><SquarePen /> New chat</CommandItem>
                <CommandItem onSelect={run(onUpload)}><Upload /> Upload documents</CommandItem>
                <CommandItem onSelect={run(toggle)}>
                  {resolved === 'dark' ? <Sun /> : <Moon />} Switch to {resolved === 'dark' ? 'light' : 'dark'} mode
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Navigate">
                <CommandItem onSelect={run(() => navigate('/dashboard'))}><LayoutGrid /> Dashboard</CommandItem>
                <CommandItem onSelect={run(() => navigate('/chat'))}><MessageSquareText /> Ask AI</CommandItem>
                <CommandItem onSelect={run(() => navigate('/settings'))}><Settings /> Settings</CommandItem>
              </CommandGroup>
              {chats.length > 0 && (
                <CommandGroup heading="Conversations">
                  {chats.slice(0, 30).map((c) => (
                    <CommandItem key={c._id} value={`chat ${c.title} ${c._id}`} onSelect={run(() => navigate(`/chat/${c._id}`))}>
                      <MessageCircle />
                      <span className="flex-1 truncate">{c.title}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(c.updatedAt || c.createdAt)}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {documents.length > 0 && (
                <CommandGroup heading="Ask about a document">
                  {documents.filter((d) => d.status === 'Ready').map((d) => (
                    <CommandItem key={d._id} value={`doc ${d.fileName} ${d._id}`} onSelect={run(() => navigate('/chat', { state: { documentIds: [d._id] } }))}>
                      <FileIcon name={d.fileName} className="size-6 rounded-md text-[7px]" />
                      <span className="flex-1 truncate">{d.fileName}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={run(() => { logout(); navigate('/login') })}><LogOut /> Sign out</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
