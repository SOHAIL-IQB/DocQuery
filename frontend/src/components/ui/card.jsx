import { cn } from '@/lib/utils'

function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn('rounded-2xl border bg-card text-card-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]', className)}
      {...props}
    />
  )
}
function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-0 sm:p-6 sm:pb-0', className)} {...props} />
}
function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-[15px] font-semibold tracking-tight', className)} {...props} />
}
function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}
function CardContent({ className, ...props }) {
  return <div className={cn('p-5 sm:p-6', className)} {...props} />
}
function CardFooter({ className, ...props }) {
  return <div className={cn('flex items-center border-t px-5 py-4 sm:px-6', className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
