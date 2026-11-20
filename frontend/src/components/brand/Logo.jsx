import { cn } from '@/lib/utils'

export function LogoMark({ className }) {
  return (
    <span
      className={cn(
        'relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_4px_14px_-4px_rgb(124_58_237/0.6)]',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[60%]" aria-hidden="true">
        <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5Z" fill="currentColor" fillOpacity=".95" />
        <circle cx="11.5" cy="13" r="2.9" stroke="#6d28d9" strokeWidth="1.8" />
        <path d="m13.6 15.1 2.1 2.1" stroke="#6d28d9" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export function Logo({ className, markClassName }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      <span className="text-[15px] font-semibold tracking-tight">
        DocQuery<span className="text-muted-foreground font-normal"> AI</span>
      </span>
    </span>
  )
}
