import { cn, fileExt } from '@/lib/utils'

const TONES = {
  pdf: 'bg-rose-500/12 text-rose-500 ring-rose-500/20',
  docx: 'bg-sky-500/12 text-sky-500 ring-sky-500/20',
  txt: 'bg-zinc-500/12 text-zinc-500 ring-zinc-500/20 dark:text-zinc-400',
  md: 'bg-emerald-500/12 text-emerald-500 ring-emerald-500/20',
}

export default function FileIcon({ name, className }) {
  const ext = fileExt(name)
  return (
    <span
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-xl font-mono text-[10px] font-semibold tracking-wide uppercase ring-1 ring-inset',
        TONES[ext] || TONES.txt,
        className,
      )}
    >
      {ext.slice(0, 4)}
    </span>
  )
}
