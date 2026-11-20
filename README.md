# DocQuery AI

**Ask your documents anything.** Upload PDFs, Word files, text and Markdown — DocQuery finds the passages that matter and writes a clear, streamed answer with inline citations you can verify in one click.

Built on a Retrieval-Augmented Generation (RAG) pipeline: local sentence embeddings for semantic search + Groq-hosted open models for fast, grounded answers.

---

## Highlights

- **Cited answers** — every claim links to the exact passage it came from (`[1]`, `[2]` chips → full source viewer).
- **Real-time streaming** — answers stream token-by-token over Server-Sent Events, with a Stop button.
- **Follow-up aware** — recent conversation turns are sent along so “what about contractors?” just works.
- **Scope control** — ask across your whole library, one document, or any hand-picked set.
- **AI summaries & suggested questions** — generated for every upload and shown on the dashboard and new-chat screen.
- **Live processing progress** — real percentage while a document is chunked and embedded.
- **Command palette** (`⌘K` / `Ctrl K`), drag-and-drop anywhere, light / dark / system themes, fully responsive.
- **Zero-config local dev** — no MongoDB install needed; a local database starts automatically.

## Tech stack

| Layer | Tech |
| --- | --- |
| Frontend | React 19, Vite 7, **Tailwind CSS v4**, **shadcn/ui-style components on Radix UI**, Motion, Sonner, cmdk, Lucide, Geist font |
| Backend | Node.js, Express 5, Mongoose 9, JWT + bcrypt, Multer, Helmet, express-rate-limit |
| AI | `Xenova/all-MiniLM-L6-v2` embeddings (runs locally on the server), Groq `openai/gpt-oss-120b` for generation (automatic fallback if a model is retired) |
| Search | MongoDB Atlas `$vectorSearch` when available, automatic fallback to in-app cosine similarity |

## Quick start

Requires **Node.js 20+**.

```bash
git clone https://github.com/SOHAIL-IQB/DocQuery.git
cd DocQuery
npm run setup        # installs root, backend and frontend dependencies
cp backend/.env.example backend/.env
npm run dev          # starts API on :5001 and web app on :5173
```

Open http://localhost:5173.

With no `MONGO_URI` set, the backend starts a local MongoDB automatically (first run downloads it, ~80 MB) and stores data in `backend/.data/`.

### Turn on AI answers

Add a free Groq key to `backend/.env` (on the same line as the variable name):

```env
GROQ_API_KEY=gsk_...
```

Without a key the app still works end-to-end, but answers show the most relevant passages instead of an AI-written response.

### Environment variables (`backend/.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5001` | API port |
| `MONGO_URI` | *(empty → local DB)* | MongoDB connection string. **Required in production.** |
| `JWT_SECRET` | dev secret | **Required in production.** Long random string. |
| `GROQ_API_KEY` | — | Enables AI-written answers, summaries and suggested questions |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Any Groq chat model. If it is retired, the app falls back to `gpt-oss-120b` → `gpt-oss-20b` → `qwen3.8-27b`. |
| `VECTOR_SEARCH` | `auto` | `auto`, `atlas` or `local` |
| `CLIENT_URLS` | — | Extra comma-separated origins allowed by CORS |

Frontend: `VITE_API_BASE_URL` (defaults to `/api` in development, proxied to the backend).

### Atlas vector index (optional, for large libraries)

Create a Vector Search index named `vector_index` on the `documentchunks` collection:

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 384, "similarity": "cosine" },
    { "type": "filter", "path": "userId" }
  ]
}
```

If the index is missing, search falls back to in-app cosine similarity automatically.

## How it works

1. **Upload** — file is validated (type, 10 MB/file, 50 MB & 20 docs per user) and saved; the API responds immediately.
2. **Extract** — text is pulled from PDF (`pdf-parse`), DOCX (`mammoth`), TXT or Markdown.
3. **Chunk** — split into ~1,000-character passages on paragraph/sentence boundaries with 200 characters of overlap.
4. **Embed** — passages are embedded in batches with MiniLM (384-d, normalized) and stored with their document.
5. **Summarize** — the LLM writes a short summary and three starter questions.
6. **Ask** — the question is embedded, the top passages are retrieved (max 4 per document for diversity), and the LLM answers using only those numbered excerpts, citing them inline. The response streams back over SSE.

## API

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` · `/api/auth/login` | Create account / sign in |
| GET | `/api/auth/me` | Current user |
| GET · POST | `/api/documents` · `/api/documents/upload` | List / upload documents |
| GET · PATCH · DELETE | `/api/documents/:id` · `/:id/rename` · `/:id` | Read / rename / delete |
| GET · POST | `/api/chat` · `/api/chat/create` | List / create conversations |
| POST | `/api/chat/message/stream` | Ask a question (Server-Sent Events) |
| POST | `/api/chat/message` | Ask a question (single JSON response) |
| GET · PATCH · DELETE | `/api/chat/:id` · `/:id/rename` · `/:id` | History / rename / delete |
| GET | `/api/users/analytics` | Dashboard stats |
| PATCH · POST · DELETE | `/api/users/profile` · `/change-password` · `/account` | Account management |

## Project structure

```text
backend/
├── config/        # DB connection (Atlas or auto-started local MongoDB)
├── controllers/   # auth, documents (background processing), chat (SSE), users
├── middleware/    # auth, uploads & quotas, rate limits, error handling
├── models/        # User, Document, DocumentChunk, Chat, Message
├── routes/
├── services/      # ragService — retrieval, prompting, streaming, summaries
└── utils/         # embeddings, chunking, text extraction, Groq client

frontend/src/
├── components/
│   ├── ui/        # shadcn-style primitives (button, dialog, dropdown, command…)
│   ├── layout/    # app shell, sidebar, command palette, route guards
│   ├── chat/      # message, markdown + citations, composer, scope picker
│   └── documents/ # document cards, upload dropzone
├── context/       # auth, theme, workspace (documents + chats)
├── lib/           # API client (axios + SSE stream), utils
└── pages/         # Landing, Auth, Dashboard, Chat, Settings
```

## Testing

```bash
npm test
```

Runs 58 backend tests (Node's built-in test runner) against the real Express app, an in-memory MongoDB and the real embedding model — no network or API key needed. They cover:

- **Auth** — validation, duplicate/racing sign-ups, case-insensitive login, expired/forged tokens, brute-force limiting
- **Documents** — real PDF/DOCX/TXT/MD extraction, non-ASCII names, type/size/count/storage limits, isolation between users, cleanup when deleted mid-processing
- **Chat** — SSE event order, persistence, scoping, cross-user isolation, greetings, stop/abort, rate limiting
- **Accounts** — analytics, profile, password change, full cascade on account deletion
- **Units** — chunking, text extraction (including a regression test for PDF parsing during model load), citation normalization

## Scripts

| Command | What it does |
| --- | --- |
| `npm run setup` | Install all dependencies |
| `npm run dev` | Run API and web app together |
| `npm run build` | Production build of the frontend |
| `npm test` | Run the backend test suite |
| `npm run lint` | Lint the frontend |
| `npm start` | Start the API in production mode |

## Author

**Sohail Iqbal**

## License

MIT — see [LICENSE](LICENSE).
