import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import api, { errorMessage } from '@/lib/api'

const WorkspaceContext = createContext(null)

export const LIMITS = {
  fileBytes: 10 * 1024 * 1024,
  storageBytes: 50 * 1024 * 1024,
  documents: 20,
}
export const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md']
export const ACCEPT_ATTR = '.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown'

/**
 * Shared, app-wide state for documents and chats so the sidebar, dashboard,
 * chat view and command menu stay in sync without refetching everywhere.
 */
export function WorkspaceProvider({ children }) {
  const [documents, setDocuments] = useState([])
  const [chats, setChats] = useState([])
  const [docsLoaded, setDocsLoaded] = useState(false)
  const [chatsLoaded, setChatsLoaded] = useState(false)
  const [uploads, setUploads] = useState([]) // in-flight uploads: { id, name, size, progress }
  const prevDocs = useRef([])

  const refreshDocuments = useCallback(async () => {
    try {
      const { data } = await api.get('/documents')
      setDocuments(data.data)
    } catch (err) {
      if (err.response?.status !== 401) console.error(err)
    } finally {
      setDocsLoaded(true)
    }
  }, [])

  const refreshChats = useCallback(async () => {
    try {
      const { data } = await api.get('/chat')
      setChats(data.data)
    } catch (err) {
      if (err.response?.status !== 401) console.error(err)
    } finally {
      setChatsLoaded(true)
    }
  }, [])

  useEffect(() => {
    refreshDocuments()
    refreshChats()
  }, [refreshDocuments, refreshChats])

  // Poll while anything is processing, and announce when documents finish.
  const processing = documents.some((d) => d.status === 'Processing')
  useEffect(() => {
    if (!processing) return
    const id = setInterval(refreshDocuments, 1500)
    return () => clearInterval(id)
  }, [processing, refreshDocuments])

  useEffect(() => {
    for (const doc of documents) {
      const before = prevDocs.current.find((d) => d._id === doc._id)
      if (before?.status !== 'Processing') continue
      if (doc.status === 'Ready') {
        toast.success(`${doc.fileName} is ready`, { description: `Indexed into ${doc.chunkCount} searchable passage${doc.chunkCount === 1 ? "" : "s"}.` })
      } else if (doc.status === 'Failed') {
        toast.error(`Couldn't process ${doc.fileName}`, { description: doc.error })
      }
    }
    prevDocs.current = documents
  }, [documents])

  const validateFile = useCallback(
    (file) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!ACCEPTED_EXTENSIONS.includes(ext)) return `${file.name}: only PDF, DOCX, TXT and Markdown files are supported.`
      if (file.size > LIMITS.fileBytes) return `${file.name} is larger than 10 MB.`
      if (file.size === 0) return `${file.name} is empty.`
      return null
    },
    [],
  )

  /** Uploads files one after another; returns the created documents. */
  const uploadFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || [])
      const created = []
      for (const file of files) {
        const problem = validateFile(file)
        if (problem) {
          toast.error('Upload skipped', { description: problem })
          continue
        }
        const id = `${file.name}-${file.size}-${Date.now()}`
        setUploads((u) => [...u, { id, name: file.name, size: file.size, progress: 0 }])
        try {
          const form = new FormData()
          form.append('document', file)
          const { data } = await api.post('/documents/upload', form, {
            onUploadProgress: (e) => {
              const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0
              setUploads((u) => u.map((x) => (x.id === id ? { ...x, progress: pct } : x)))
            },
          })
          setDocuments((d) => [data.data, ...d.filter((x) => x._id !== data.data._id)])
          created.push(data.data)
        } catch (err) {
          toast.error(`Couldn't upload ${file.name}`, { description: errorMessage(err) })
        } finally {
          setUploads((u) => u.filter((x) => x.id !== id))
        }
      }
      return created
    },
    [validateFile],
  )

  const renameDocument = useCallback(async (id, newName) => {
    const name = newName.trim()
    if (!name) return
    const prev = documents
    setDocuments((d) => d.map((x) => (x._id === id ? { ...x, fileName: name } : x)))
    try {
      await api.patch(`/documents/${id}/rename`, { newName: name })
      toast.success('Document renamed')
    } catch (err) {
      setDocuments(prev)
      toast.error('Rename failed', { description: errorMessage(err) })
    }
  }, [documents])

  const deleteDocument = useCallback(async (doc) => {
    try {
      await api.delete(`/documents/${doc._id}`)
      setDocuments((d) => d.filter((x) => x._id !== doc._id))
      toast.success(`Deleted ${doc.fileName}`)
    } catch (err) {
      toast.error('Delete failed', { description: errorMessage(err) })
      throw err
    }
  }, [])

  const createChat = useCallback(async () => {
    const { data } = await api.post('/chat/create', { title: 'New Chat' })
    setChats((c) => [data.data, ...c])
    return data.data
  }, [])

  const renameChat = useCallback(async (id, title) => {
    const t = title.trim()
    if (!t) return
    setChats((c) => c.map((x) => (x._id === id ? { ...x, title: t } : x)))
    try {
      await api.patch(`/chat/${id}/rename`, { title: t })
    } catch (err) {
      toast.error('Rename failed', { description: errorMessage(err) })
      refreshChats()
    }
  }, [refreshChats])

  const deleteChat = useCallback(async (id) => {
    try {
      await api.delete(`/chat/${id}`)
      setChats((c) => c.filter((x) => x._id !== id))
      toast.success('Conversation deleted')
    } catch (err) {
      toast.error('Delete failed', { description: errorMessage(err) })
      throw err
    }
  }, [])

  /** Local update after a message (title change, bump to top) without refetching. */
  const touchChat = useCallback((id, patch = {}) => {
    setChats((c) => {
      const existing = c.find((x) => x._id === id)
      if (!existing) return c
      const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() }
      return [updated, ...c.filter((x) => x._id !== id)]
    })
  }, [])

  const storageUsed = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0)

  return (
    <WorkspaceContext.Provider
      value={{
        documents,
        docsLoaded,
        chats,
        chatsLoaded,
        uploads,
        storageUsed,
        refreshDocuments,
        refreshChats,
        uploadFiles,
        renameDocument,
        deleteDocument,
        createChat,
        renameChat,
        deleteChat,
        touchChat,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspace = () => useContext(WorkspaceContext)
