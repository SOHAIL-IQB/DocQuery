import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutGrid, MessageSquareText, Settings, LogOut, PanelLeft, SquarePen, Search,
  MoreHorizontal, Pencil, Trash2, Moon, Sun, ChevronsUpDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useWorkspace, LIMITS } from '@/context/WorkspaceContext'
import { Logo, LogoMark } from '@/components/brand/Logo'
import AvatarIcon from '@/components/common/AvatarIcon'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, formatBytes, isMac } from '@/lib/utils'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/chat', label: 'Ask AI', icon: MessageSquareText, match: '/chat' },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function groupChats(chats) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const day = 86400000
  const groups = { Today: [], Yesterday: [], 'Previous 7 days': [], Older: [] }
  for (const c of chats) {
    const t = new Date(c.updatedAt || c.createdAt).getTime()
    if (t >= startOfToday) groups.Today.push(c)
    else if (t >= startOfToday - day) groups.Yesterday.push(c)
    else if (t >= startOfToday - 7 * day) groups['Previous 7 days'].push(c)
    else groups.Older.push(c)
  }
  return Object.entries(groups).filter(([, list]) => list.length)
}

function ChatItem({ chat, active, onNavigate }) {
  const { renameChat, deleteChat } = useWorkspace()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(chat.title)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const inputRef = useRef(null)
  const openingDialog = useRef(false)
  const menuButton = useRef(null)

  // Focus and select the whole title when editing starts, so typing replaces it.
  useEffect(() => {
    if (!editing) return
    const id = setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
    return () => clearTimeout(id)
  }, [editing])

  const commit = () => {
    setEditing(false)
    if (title.trim() && title.trim() !== chat.title) renameChat(chat._id, title)
    else setTitle(chat.title)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={title}
        maxLength={100}
        aria-label="Chat title"
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setTitle(chat.title); setEditing(false) }
        }}
        className="h-8 w-full rounded-md border border-primary/50 bg-background px-2 text-[13px] outline-none ring-4 ring-ring/15"
      />
    )
  }

  return (
    <div className={cn('group/item relative flex items-center rounded-md transition-colors', active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60')}>
      <NavLink
        to={`/chat/${chat._id}`}
        onClick={onNavigate}
        className={cn('flex h-8 min-w-0 flex-1 items-center px-2 text-[13px]', active ? 'font-medium' : 'text-muted-foreground group-hover/item:text-foreground')}
        title={chat.title}
      >
        <span className="truncate">{chat.title || 'Untitled'}</span>
      </NavLink>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            ref={menuButton}
            className={cn(
              'mr-1 flex size-6 items-center justify-center rounded text-muted-foreground opacity-0 transition hover:bg-background/80 hover:text-foreground group-hover/item:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100',
              active && 'opacity-100',
            )}
            aria-label="Chat actions"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-40"
          onCloseAutoFocus={(e) => {
            if (openingDialog.current) e.preventDefault()
            openingDialog.current = false
          }}
        >
          <DropdownMenuItem onSelect={() => { setTitle(chat.title); setEditing(true) }}>
            <Pencil /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => { openingDialog.current = true; setConfirmOpen(true) }}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete conversation?"
        description={<>“{chat.title}” and all of its messages will be permanently deleted.</>}
        confirmText="Delete"
        returnFocusRef={menuButton}
        onConfirm={async () => {
          await deleteChat(chat._id)
          if (active) navigate('/chat')
        }}
      />
    </div>
  )
}

function UserMenu({ collapsed }) {
  const { user, logout } = useAuth()
  const { resolved, toggle } = useTheme()
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-accent data-[state=open]:bg-accent',
            collapsed && 'justify-center',
          )}
        >
          <AvatarIcon avatarId={user?.avatar} className="size-8" />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{user?.name || 'User'}</span>
                <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
              </span>
              <ChevronsUpDown className="size-4 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={collapsed ? 'right' : 'top'} align={collapsed ? 'end' : 'start'} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium text-foreground">{user?.name}</span>
          <span className="block truncate">{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/settings')}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toggle() }}>
          {resolved === 'dark' ? <Sun /> : <Moon />} {resolved === 'dark' ? 'Light mode' : 'Dark mode'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            logout()
            toast('Signed out', { description: 'See you soon.' })
            navigate('/login')
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SidebarContent({ collapsed = false, onToggle, onNavigate, onOpenCommand }) {
  const { chats, chatsLoaded, storageUsed } = useWorkspace()
  const location = useLocation()
  const navigate = useNavigate()
  const grouped = useMemo(() => groupChats(chats), [chats])
  const storagePct = Math.min(100, (storageUsed / LIMITS.storageBytes) * 100)

  const newChat = () => {
    onNavigate?.()
    navigate('/chat')
  }

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-14 shrink-0 items-center gap-2 px-3', collapsed ? 'justify-center' : 'justify-between')}>
        {collapsed ? (
          <Tooltip content="Expand sidebar" side="right">
            <button onClick={onToggle} className="group/logo relative" aria-label="Expand sidebar">
              <LogoMark className="transition-opacity group-hover/logo:opacity-0" />
              <PanelLeft className="absolute inset-0 m-auto size-4 opacity-0 transition-opacity group-hover/logo:opacity-100" />
            </button>
          </Tooltip>
        ) : (
          <>
            <NavLink to="/dashboard" onClick={onNavigate} className="rounded-md px-1">
              <Logo />
            </NavLink>
            {onToggle && (
              <Tooltip content="Collapse sidebar" side="right">
                <Button variant="ghost" size="icon-sm" onClick={onToggle} className="text-muted-foreground" aria-label="Collapse sidebar">
                  <PanelLeft />
                </Button>
              </Tooltip>
            )}
          </>
        )}
      </div>

      <div className={cn('flex flex-col gap-1 px-3 pt-1 pb-3', collapsed && 'items-center px-2')}>
        {collapsed ? (
          <>
            <Tooltip content="New chat" side="right">
              <Button variant="outline" size="icon" onClick={newChat} aria-label="New chat"><SquarePen /></Button>
            </Tooltip>
            <Tooltip content={`Search  ${isMac ? '⌘' : 'Ctrl'} K`} side="right">
              <Button variant="ghost" size="icon" onClick={onOpenCommand} aria-label="Search"><Search /></Button>
            </Tooltip>
          </>
        ) : (
          <>
            <Button variant="outline" className="h-9 justify-start gap-2 px-2.5 font-medium" onClick={newChat}>
              <SquarePen /> New chat
            </Button>
            <button
              onClick={onOpenCommand}
              className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Search className="size-4" />
              <span className="flex-1 text-left">Search</span>
              <span className="flex gap-0.5"><Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd><Kbd>K</Kbd></span>
            </button>
          </>
        )}
      </div>

      <nav className={cn('flex flex-col gap-0.5 px-3', collapsed && 'items-center px-2')}>
        {NAV.map(({ to, label, icon: Icon, match }) => {
          const active = match ? location.pathname.startsWith(match) : location.pathname === to
          const link = (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={cn(
                'relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors',
                collapsed && 'size-9 justify-center px-0',
                active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && label}
            </NavLink>
          )
          return collapsed ? <Tooltip key={to} content={label} side="right">{link}</Tooltip> : link
        })}
      </nav>

      <div className={cn('mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-2', collapsed && 'invisible')}>
        {!chatsLoaded ? (
          <div className="space-y-2 px-2 pt-2">
            {[70, 55, 80].map((w) => <div key={w} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />)}
          </div>
        ) : chats.length === 0 ? (
          <p className="px-2.5 pt-2 text-xs leading-relaxed text-muted-foreground">
            Your conversations will appear here.
          </p>
        ) : (
          grouped.map(([label, list]) => (
            <div key={label} className="mb-3">
              <p className="sticky top-0 z-10 bg-sidebar px-2.5 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground/80">{label}</p>
              <div className="flex flex-col gap-px">
                {list.map((chat) => (
                  <ChatItem key={chat._id} chat={chat} active={location.pathname === `/chat/${chat._id}`} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className={cn('shrink-0 border-t p-3', collapsed && 'px-2')}>
        {!collapsed && (
          <NavLink to="/dashboard" onClick={onNavigate} className="mb-2 block rounded-lg px-2.5 py-2 transition-colors hover:bg-accent/60">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Storage</span>
              <span className="font-medium tabular-nums">{formatBytes(storageUsed)} <span className="text-muted-foreground">/ 50 MB</span></span>
            </div>
            <Progress value={storagePct} className="h-1" indicatorClassName={storagePct > 90 ? 'bg-destructive' : storagePct > 75 ? 'bg-warning' : undefined} />
          </NavLink>
        )}
        <UserMenu collapsed={collapsed} />
      </div>
    </div>
  )
}
