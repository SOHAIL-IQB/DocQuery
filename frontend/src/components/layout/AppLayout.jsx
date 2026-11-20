import { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Menu, UploadCloud } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { WorkspaceProvider, useWorkspace, ACCEPT_ATTR } from '@/context/WorkspaceContext'
import { SidebarContent } from './Sidebar'
import CommandMenu from './CommandMenu'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/brand/Logo'
import { cn } from '@/lib/utils'

const readCollapsed = () => {
  try {
    return localStorage.getItem('sidebar_collapsed') === '1'
  } catch {
    return false
  }
}

/** Lets users drop files anywhere in the app to upload them. */
function GlobalDropZone() {
  const { uploadFiles } = useWorkspace()
  const [active, setActive] = useState(false)
  const depth = useRef(0)

  useEffect(() => {
    const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files')
    const enter = (e) => { if (hasFiles(e)) { depth.current += 1; setActive(true) } }
    const leave = (e) => { if (hasFiles(e)) { depth.current = Math.max(0, depth.current - 1); if (!depth.current) setActive(false) } }
    const over = (e) => { if (hasFiles(e)) e.preventDefault() }
    const drop = (e) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth.current = 0
      setActive(false)
      uploadFiles(e.dataTransfer.files)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [uploadFiles])

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-background/70 p-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            className="flex w-full max-w-md flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-primary/60 bg-card/80 px-8 py-14 text-center shadow-2xl"
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <UploadCloud className="size-7" />
            </span>
            <p className="text-lg font-semibold tracking-tight">Drop to add to your library</p>
            <p className="text-sm text-muted-foreground">PDF, DOCX, TXT or Markdown · up to 10 MB each</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Shell() {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const fileInput = useRef(null)
  const { uploadFiles } = useWorkspace()
  const navigate = useNavigate()

  useEffect(() => {
    try { localStorage.setItem('sidebar_collapsed', collapsed ? '1' : '0') } catch { /* ignore */ }
  }, [collapsed])

  const openUpload = () => fileInput.current?.click()

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <aside
        className={cn(
          'hidden shrink-0 border-r bg-sidebar transition-[width] duration-200 ease-out md:block',
          collapsed ? 'w-[60px]' : 'w-[264px]',
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          onOpenCommand={() => setCommandOpen(true)}
        />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent onNavigate={() => setMobileOpen(false)} onOpenCommand={() => { setMobileOpen(false); setCommandOpen(true) }} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <Logo />
          <Button variant="ghost" size="icon" onClick={() => navigate('/chat')} aria-label="New chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.4 2.6a2.1 2.1 0 1 1 3 3L12 15l-4 1 1-4Z" /></svg>
          </Button>
        </header>
        <main className="relative min-h-0 flex-1 overflow-hidden">
          <Outlet context={{ openUpload, openCommand: () => setCommandOpen(true) }} />
        </main>
      </div>

      <input
        ref={fileInput}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          uploadFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} onUpload={openUpload} />
      <GlobalDropZone />
    </div>
  )
}

export default function AppLayout() {
  return (
    <WorkspaceProvider>
      <Shell />
    </WorkspaceProvider>
  )
}
