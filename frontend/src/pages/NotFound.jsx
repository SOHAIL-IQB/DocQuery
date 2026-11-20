import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/brand/Logo'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark className="size-12 rounded-2xl" />
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">This page doesn’t exist</h1>
      <p className="max-w-sm text-sm text-muted-foreground">The link may be broken, or the page may have been moved.</p>
      <Button asChild className="mt-2"><Link to="/">Back home</Link></Button>
    </div>
  )
}
