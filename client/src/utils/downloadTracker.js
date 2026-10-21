const GUEST_DOWNLOAD_KEY = '5share_guest_download_log'
const MAX_GUEST_DOWNLOADS = 3

export function getGuestDownloadStats() {
  try {
    const raw = localStorage.getItem(GUEST_DOWNLOAD_KEY)
    const timestamps = raw ? JSON.parse(raw) : []
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const validLogs = (Array.isArray(timestamps) ? timestamps : []).filter(
      (ts) => typeof ts === 'number' && ts > oneDayAgo
    )
    if (validLogs.length !== (Array.isArray(timestamps) ? timestamps.length : 0)) {
      localStorage.setItem(GUEST_DOWNLOAD_KEY, JSON.stringify(validLogs))
    }
    const count = validLogs.length
    const remaining = Math.max(0, MAX_GUEST_DOWNLOADS - count)
    const isExhausted = count >= MAX_GUEST_DOWNLOADS
    return { count, remaining, isExhausted, limit: MAX_GUEST_DOWNLOADS }
  } catch {
    return { count: 0, remaining: MAX_GUEST_DOWNLOADS, isExhausted: false, limit: MAX_GUEST_DOWNLOADS }
  }
}

export function recordGuestDownload() {
  try {
    const raw = localStorage.getItem(GUEST_DOWNLOAD_KEY)
    const timestamps = raw ? JSON.parse(raw) : []
    const arr = Array.isArray(timestamps) ? timestamps : []
    arr.push(Date.now())
    localStorage.setItem(GUEST_DOWNLOAD_KEY, JSON.stringify(arr))
  } catch {
    // ignore
  }
}
