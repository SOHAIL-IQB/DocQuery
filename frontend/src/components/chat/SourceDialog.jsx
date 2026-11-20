import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import FileIcon from '@/components/documents/FileIcon'

export default function SourceDialog({ source, index, onOpenChange }) {
  return (
    <Dialog open={!!source} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {source && (
          <>
            <DialogHeader className="flex-row items-center gap-3 pr-8">
              <FileIcon name={source.fileName} />
              <div className="min-w-0">
                <DialogTitle className="truncate">{source.fileName}</DialogTitle>
                <DialogDescription className="mt-0.5 flex items-center gap-2">
                  Source [{index + 1}]
                  {typeof source.chunkIndex === 'number' && <span>· Passage {source.chunkIndex + 1}</span>}
                  {typeof source.score === 'number' && (
                    <Badge variant="secondary">{Math.round(source.score * 100)}% match</Badge>
                  )}
                </DialogDescription>
              </div>
            </DialogHeader>
            <div className="max-h-[55vh] overflow-y-auto rounded-xl border bg-muted/40 p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {source.chunkText}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
