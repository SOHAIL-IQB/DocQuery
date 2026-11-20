import { useState } from 'react'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import { Loader2 } from 'lucide-react'
import { Button } from './button'

/**
 * Confirmation dialog for destructive actions.
 * onConfirm may return a promise; the button shows a spinner until it settles.
 */
function ConfirmDialog({ open, onOpenChange, title, description, confirmText = 'Confirm', destructive = true, onConfirm, returnFocusRef }) {
  const [busy, setBusy] = useState(false)

  const handleConfirm = async (e) => {
    e.preventDefault()
    try {
      setBusy(true)
      await onConfirm?.()
      onOpenChange(false)
    } catch {
      // The caller already reported the error (toast); keep the dialog open so the user can retry.
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <AlertDialogPrimitive.Content
          onCloseAutoFocus={(e) => {
            if (returnFocusRef?.current?.isConnected) {
              e.preventDefault()
              returnFocusRef.current.focus()
            }
          }}
          className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 rounded-2xl border bg-popover p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
          <div className="grid gap-1.5">
            <AlertDialogPrimitive.Title className="text-base font-semibold tracking-tight">{title}</AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </AlertDialogPrimitive.Description>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline" disabled={busy}>Cancel</Button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              <Button variant={destructive ? 'destructive' : 'default'} onClick={handleConfirm} disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                {confirmText}
              </Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}

export { ConfirmDialog }
