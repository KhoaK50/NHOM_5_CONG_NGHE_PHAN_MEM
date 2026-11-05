/**
 * Kết nối luồng sự kiện của máy chủ. Dùng fetch thay vì EventSource để gửi được header Authorization
 * và không phải đưa token lên URL. Tự kết nối lại với thời gian chờ tăng dần.
 */

import { getApiBaseUrl, getAuthToken } from './authGuard'

const MAX_RETRY_DELAY_MS = 30000

function parseBlock(block) {
  let event = 'message'
  let data = ''
  block.split('\n').forEach((line) => {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data += line.slice(5).trim()
  })
  return { event, data }
}

function parsePayload(data) {
  try {
    return JSON.parse(data)
  } catch {
    return {}
  }
}

export function connectRealtime({ onEvent, onStatusChange }) {
  let stopped = false
  let controller = null
  let retryTimer = null
  let attempt = 0

  const readStream = async (response) => {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        const { event, data } = parseBlock(block)
        if (data) onEvent(event, parsePayload(data))
        boundary = buffer.indexOf('\n\n')
      }
    }
  }

  const run = async () => {
    controller = new AbortController()
    try {
      const token = getAuthToken()
      const response = await fetch(`${getApiBaseUrl()}/api/notifications/stream`, {
        headers: { Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache: 'no-store',
        signal: controller.signal
      })
      if (!response.ok || !response.body) throw new Error('STREAM_UNAVAILABLE')
      attempt = 0
      onStatusChange?.(true)
      await readStream(response)
    } catch {
      // Mạng lỗi hoặc máy chủ từ chối: chuyển sang chờ kết nối lại
    }
    if (stopped) return
    onStatusChange?.(false)
    const delay = Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** attempt) + Math.random() * 1000
    attempt += 1
    retryTimer = setTimeout(run, delay)
  }

  run()

  return () => {
    stopped = true
    clearTimeout(retryTimer)
    controller?.abort()
  }
}
