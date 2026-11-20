import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Tooltip } from '@/components/ui/tooltip'

// Turn "[3]" citation markers into links we can render as chips, but leave real Markdown links alone.
// Also accept the 【3】 / [3†L1-L4] styles some models produce (older saved answers may contain them).
const linkCitations = (text) =>
  text
    .replace(/【(\d{1,2})(?:†[^】]*)?】/g, '[$1]')
    .replace(/\[(\d{1,2})†[^\]]*\]/g, '[$1]')
    .replace(/\[(\d{1,2})\](?!\()/g, '[$1](#cite-$1)')

function Markdown({ content, sources = [], onCite }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children, ...props }) {
            if (href?.startsWith('#cite-')) {
              const n = Number(href.slice(6))
              const src = sources[n - 1]
              if (!src) return <sup className="text-muted-foreground">[{n}]</sup>
              return (
                <Tooltip content={<span className="line-clamp-3">{src.fileName}: {src.chunkText.slice(0, 160)}…</span>}>
                  <button
                    type="button"
                    onClick={() => onCite?.(n - 1)}
                    className="mx-0.5 inline-flex h-[18px] min-w-[18px] -translate-y-px items-center justify-center rounded-md bg-primary/12 px-1 align-middle font-mono text-[10.5px] font-semibold text-primary no-underline transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    {n}
                  </button>
                </Tooltip>
              )
            }
            return <a href={href} target="_blank" rel="noreferrer noopener" {...props}>{children}</a>
          },
          table({ children }) {
            return <div className="my-3 overflow-x-auto rounded-lg border"><table className="my-0">{children}</table></div>
          },
        }}
      >
        {linkCitations(content)}
      </ReactMarkdown>
    </div>
  )
}

export default memo(Markdown)
