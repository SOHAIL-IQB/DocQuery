import { User, Bot, Smile, Star, Zap, Hexagon, Heart, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'

// eslint-disable-next-line react-refresh/only-export-components
export const AVATARS = [
  { id: 'avatar1', icon: User, tone: 'from-sky-500 to-indigo-500' },
  { id: 'avatar2', icon: Bot, tone: 'from-violet-500 to-fuchsia-500' },
  { id: 'avatar3', icon: Smile, tone: 'from-amber-400 to-orange-500' },
  { id: 'avatar4', icon: Star, tone: 'from-yellow-400 to-amber-500' },
  { id: 'avatar5', icon: Zap, tone: 'from-emerald-400 to-teal-500' },
  { id: 'avatar6', icon: Hexagon, tone: 'from-cyan-400 to-blue-500' },
  { id: 'avatar7', icon: Heart, tone: 'from-rose-400 to-pink-500' },
  { id: 'avatar8', icon: Cpu, tone: 'from-slate-400 to-zinc-600' },
]

export default function AvatarIcon({ avatarId, className, iconClassName }) {
  const a = AVATARS.find((x) => x.id === avatarId) || AVATARS[0]
  const Icon = a.icon
  return (
    <span className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]', a.tone, className)}>
      <Icon className={cn('size-[50%]', iconClassName)} strokeWidth={2.2} />
    </span>
  )
}
