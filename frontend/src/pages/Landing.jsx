import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import {
  ArrowRight, Quote, Zap, Files, ShieldCheck, Sparkles, Command, UploadCloud, ScanText, MessageSquareText, Moon, Sun,
} from 'lucide-react'
import { Logo, LogoMark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import FileIcon from '@/components/documents/FileIcon'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const ANSWER =
  'Eligible employees receive a one-time **$500 home office stipend**, which must be claimed within **60 days** of approval [1]. Remote work is available up to three days per week after the 90-day probation period [2].'

function TypedAnswer() {
  const reduce = useReducedMotion()
  const [n, setN] = useState(reduce ? ANSWER.length : 0)
  useEffect(() => {
    if (reduce) return
    let i = 0
    let id
    const start = setTimeout(() => {
      id = setInterval(() => {
        i += 2
        setN(Math.min(i, ANSWER.length))
        if (i >= ANSWER.length) clearInterval(id)
      }, 22)
    }, 900)
    return () => { clearTimeout(start); clearInterval(id) }
  }, [reduce])

  const text = ANSWER.slice(0, n)
  // Tiny renderer for **bold** and [n] chips — enough for the demo.
  const parts = text.split(/(\*\*[^*]+\*\*|\[\d\])/g).filter(Boolean)
  return (
    <p className="text-[13.5px] leading-relaxed sm:text-sm">
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>
        ) : /^\[\d\]$/.test(p) ? (
          <span key={i} className="mx-0.5 inline-flex h-[18px] min-w-[18px] -translate-y-px items-center justify-center rounded-md bg-primary/15 px-1 align-middle font-mono text-[10.5px] font-semibold text-primary">
            {p[1]}
          </span>
        ) : (
          <span key={i}>{p.replace(/\*+$/, '')}</span>
        ),
      )}
      {n < ANSWER.length && <span className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-caret rounded-full bg-primary" />}
    </p>
  )
}

function ProductPreview() {
  return (
    <div className="relative mx-auto mt-16 w-full max-w-4xl sm:mt-20">
      <div className="pointer-events-none absolute -inset-x-20 -top-16 -bottom-10 bg-[radial-gradient(50%_50%_at_50%_40%,var(--glow),transparent)]" />
      <motion.div
        initial={{ opacity: 0, y: 30, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformPerspective: 1200 }}
        className="relative overflow-hidden rounded-2xl border bg-card/80 text-left shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:ring-white/5"
      >
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 hidden rounded-md bg-muted px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:block">docquery.ai/chat</span>
        </div>
        <div className="grid sm:grid-cols-[200px_1fr]">
          <div className="hidden border-r bg-sidebar/60 p-3 sm:block">
            <p className="px-2 pb-2 text-[11px] font-medium text-muted-foreground">Library</p>
            {[
              ['Remote-Work-Policy.pdf', true],
              ['Employee-Handbook.docx', false],
              ['Benefits-FAQ.md', false],
            ].map(([n, active]) => (
              <div key={n} className={cn('mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5', active && 'bg-accent')}>
                <FileIcon name={n} className="size-6 rounded-md text-[7px]" />
                <span className="truncate text-xs">{n}</span>
              </div>
            ))}
          </div>
          <div className="space-y-5 p-4 text-left sm:p-6">
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-br-md bg-secondary px-3.5 py-2 text-[13.5px] sm:text-sm">
                How much is the home office stipend, and when do I need to claim it?
              </div>
            </div>
            <div className="flex gap-3">
              <LogoMark className="size-7 rounded-lg" />
              <div className="min-w-0 flex-1">
                <TypedAnswer />
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 3.4 }}
                  className="mt-4 grid gap-2 sm:grid-cols-2"
                >
                  {[
                    ['Remote-Work-Policy.pdf', 'Equipment. Acme provides a laptop and a one-time home office stipend of $500…'],
                    ['Remote-Work-Policy.pdf', 'Eligibility. All full-time employees who have completed their 90-day…'],
                  ].map(([f, t], i) => (
                    <div key={i} className="flex gap-2 rounded-xl border bg-background/60 p-2.5">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/12 font-mono text-[10.5px] font-semibold text-primary">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-medium">{f}</span>
                        <span className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{t}</span>
                      </span>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const FEATURES = [
  {
    icon: Quote,
    title: 'Every answer is cited',
    desc: 'Inline references link to the exact passage used, so you can verify any claim in one click.',
    className: 'md:col-span-2',
    visual: (
      <div className="mt-6 flex flex-wrap gap-2">
        {['Policy.pdf · p.3', 'Handbook.docx · §4', 'Notes.md'].map((t, i) => (
          <span key={t} className="inline-flex items-center gap-1.5 rounded-lg border bg-background/70 px-2.5 py-1.5 text-xs">
            <span className="flex size-4 items-center justify-center rounded bg-primary/15 font-mono text-[10px] font-semibold text-primary">{i + 1}</span>
            {t}
          </span>
        ))}
      </div>
    ),
  },
  { icon: Zap, title: 'Streams in real time', desc: 'Answers appear word by word, powered by Groq’s low-latency inference.' },
  { icon: Files, title: 'Ask across many files', desc: 'Query one document, a hand-picked set, or your whole library at once.' },
  { icon: Sparkles, title: 'Instant summaries', desc: 'Each upload gets a short summary and suggested questions to get you started.' },
  {
    icon: Command,
    title: 'Keyboard first',
    desc: (
      <>Jump to any chat or document with <Kbd>⌘</Kbd> <Kbd>K</Kbd>. Drop files anywhere to upload.</>
    ),
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    desc: 'Your documents are isolated to your account and embeddings are generated on our own server — nothing is shared between users.',
    className: 'md:col-span-3',
  },
]

const STEPS = [
  { icon: UploadCloud, title: 'Upload', desc: 'Drop in PDFs, Word documents, text or Markdown files.' },
  { icon: ScanText, title: 'Index', desc: 'Text is split into passages and embedded for semantic search.' },
  { icon: MessageSquareText, title: 'Ask', desc: 'Ask in plain language and get grounded, cited answers.' },
]

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] } }),
}

export default function Landing() {
  const { resolved, toggle } = useTheme()
  const { user } = useAuth()

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      {/* backdrop */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] bg-grid [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none absolute top-[-200px] left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)]" />

      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-transparent backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/"><Logo /></Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          </nav>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Toggle theme" className="text-muted-foreground">
              {resolved === 'dark' ? <Sun /> : <Moon />}
            </Button>
            {user ? (
              <Button size="sm" asChild><Link to="/dashboard">Open app <ArrowRight /></Link></Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="max-sm:hidden"><Link to="/login">Sign in</Link></Button>
                <Button size="sm" asChild><Link to="/signup">Get started</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-10 text-center sm:px-6 sm:pt-24">
        <motion.div initial="hidden" animate="show" variants={fade}>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
            Retrieval-augmented answers with citations
          </span>
        </motion.div>
        <motion.h1
          initial="hidden"
          animate="show"
          custom={1}
          variants={fade}
          className="mx-auto mt-6 max-w-3xl text-[40px] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-6xl md:text-7xl"
        >
          Ask your documents <span className="text-gradient">anything.</span>
        </motion.h1>
        <motion.p
          initial="hidden"
          animate="show"
          custom={2}
          variants={fade}
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg"
        >
          Upload PDFs, Word files and notes. DocQuery finds the exact passages that matter and writes a clear answer — with sources you can check.
        </motion.p>
        <motion.div initial="hidden" animate="show" custom={3} variants={fade} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" variant="glow" asChild className="w-full sm:w-auto">
            <Link to={user ? '/dashboard' : '/signup'}>Get started <ArrowRight /></Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
            <a href="#how">See how it works</a>
          </Button>
        </motion.div>
        <motion.p initial="hidden" animate="show" custom={4} variants={fade} className="mt-5 text-xs text-muted-foreground">
          PDF · DOCX · TXT · Markdown — up to 20 documents per account
        </motion.p>

        <ProductPreview />
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fade} className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Features</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Answers you can actually trust</h2>
          <p className="mt-4 text-muted-foreground">Built on a retrieval pipeline that keeps the model grounded in your content — not the internet.</p>
        </motion.div>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              custom={i}
              variants={fade}
              className={cn('group relative overflow-hidden rounded-2xl border bg-card/60 p-6 transition-colors hover:bg-card', f.className)}
            >
              <div className="pointer-events-none absolute -top-20 -right-20 size-48 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
              <span className="flex size-10 items-center justify-center rounded-xl border bg-background text-primary shadow-xs">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-5 font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              {f.visual}
            </motion.div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-6">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fade} className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From file to answer in seconds</h2>
        </motion.div>
        <div className="relative mt-14 grid gap-4 md:grid-cols-3">
          <div className="pointer-events-none absolute top-11 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              custom={i}
              variants={fade}
              className="relative flex flex-col items-center px-4 text-center"
            >
              <span className="relative flex size-[88px] items-center justify-center rounded-3xl border bg-card shadow-sm">
                <s.icon className="size-8 text-primary" strokeWidth={1.6} />
                <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-foreground font-mono text-[11px] font-semibold text-background">{i + 1}</span>
              </span>
              <h3 className="mt-6 font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fade}
          className="relative overflow-hidden rounded-3xl border bg-card px-6 py-16 text-center sm:px-16"
        >
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)]" />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Stop searching. Start asking.</h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">Create an account and turn your first document into answers in under a minute.</p>
            <Button size="lg" variant="glow" asChild className="mt-8">
              <Link to={user ? '/dashboard' : '/signup'}>Create your account <ArrowRight /></Link>
            </Button>
          </div>
        </motion.div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} DocQuery AI · Built by Sohail Iqbal</p>
        </div>
      </footer>
    </div>
  )
}
