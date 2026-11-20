import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

function Command({ className, ...props }) {
  return <CommandPrimitive className={cn('flex h-full w-full flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground', className)} {...props} />
}

function CommandInput({ className, ...props }) {
  return (
    <div className="flex items-center gap-2 border-b px-4">
      <Search className="size-4 shrink-0 text-muted-foreground" />
      <CommandPrimitive.Input
        className={cn('flex h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70', className)}
        {...props}
      />
    </div>
  )
}

function CommandList({ className, ...props }) {
  return <CommandPrimitive.List className={cn('max-h-[min(400px,60vh)] scroll-py-2 overflow-x-hidden overflow-y-auto p-2', className)} {...props} />
}

function CommandEmpty(props) {
  return <CommandPrimitive.Empty className="py-10 text-center text-sm text-muted-foreground" {...props} />
}

function CommandGroup({ className, ...props }) {
  return (
    <CommandPrimitive.Group
      className={cn('overflow-hidden [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground', className)}
      {...props}
    />
  )
}

function CommandItem({ className, ...props }) {
  return (
    <CommandPrimitive.Item
      className={cn(
        "relative flex cursor-default items-center gap-3 rounded-lg px-2.5 py-2 text-sm outline-none select-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

function CommandSeparator({ className, ...props }) {
  return <CommandPrimitive.Separator className={cn('-mx-2 my-1 h-px bg-border', className)} {...props} />
}

export { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator }
