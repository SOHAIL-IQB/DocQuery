import axios from 'axios'

const DEFAULT_PROD_API = 'https://docquerry.onrender.com/api'
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : DEFAULT_PROD_API)

const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('auth:unauthorized'))
    }
    return Promise.reject(error)
  },
)

/** Extracts a human-readable message from an axios/fetch error. */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection and try again.'
  return err?.response?.data?.error || err?.response?.data?.message || err?.message || fallback
}

/**
 * Streams an answer from the backend using Server-Sent Events over fetch.
 * Calls handlers.onEvent for each parsed event: meta | sources | token | done | error.
 */
export async function streamChat({ chatId, question, documentIds, signal, onEvent }) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE_URL}/chat/message/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ chatId, question, documentIds }),
    signal,
    credentials: 'include',
  })

  if (!res.ok || !res.body) {
    let msg = `Request failed (${res.status})`
    try {
      const data = await res.json()
      msg = data.error || data.message || msg
    } catch { /* not JSON */ }
    if (res.status === 401) window.dispatchEvent(new Event('auth:unauthorized'))
    throw new Error(msg)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const line = raw.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      try {
        onEvent(JSON.parse(line.slice(6)))
      } catch { /* ignore malformed event */ }
    }
  }
}

export default api
