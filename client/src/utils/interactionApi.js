import { getApiBaseUrl, getAuthToken } from './authGuard'

export class InteractionApiError extends Error {
  constructor(status, payload) {
    super(payload?.message || 'Không thể kết nối tới máy chủ. Vui lòng thử lại sau.')
    this.status = status
    this.code = payload?.code || 'NETWORK_ERROR'
  }
}

async function request(path, { method = 'GET', body, binary = false } = {}) {
  let response
  try {
    const token = getAuthToken()
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch {
    throw new InteractionApiError(0)
  }

  if (response.status === 204) return null
  if (binary && response.ok) return response.blob()
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new InteractionApiError(response.status, payload)
  return payload?.data
}

function queryString(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  })
  const text = query.toString()
  return text ? `?${text}` : ''
}

/** Tải đủ Kho theo từng trang, để tìm và lọc không bỏ sót tài liệu sau 100 bản ghi đầu. */
export async function listAllPublicDocuments() {
  const pageSize = 100
  const all = []
  for (let page = 1; page <= 50; page += 1) {
    const items = (await listPublicDocuments({ page, limit: pageSize })) || []
    all.push(...items)
    if (items.length < pageSize) break
  }
  return all
}

export function listPublicDocuments(params) { return request(`/api/documents${queryString(params)}`) }
export function recordDocumentView(documentId) { return request(`/api/documents/${encodeURIComponent(documentId)}/access`, { method: 'POST' }) }
export function getDashboardStats() { return request('/api/stats/dashboard') }
export function listMyUploads(params) { return request(`/api/documents/my-uploads${queryString(params)}`) }
export function listBookmarks() { return request('/api/bookmarks') }
export function addBookmark(documentId, body = {}) { return request('/api/bookmarks', { method: 'POST', body: { documentId, ...body } }) }
export function removeBookmark(documentId) { return request(`/api/bookmarks/${encodeURIComponent(documentId)}`, { method: 'DELETE' }) }

export function getDocumentComments(documentId, params) {
  return request(`/api/documents/${encodeURIComponent(documentId)}/comments${queryString(params)}`)
}
export function saveMyReview(documentId, { score, content }) {
  return request(`/api/documents/${encodeURIComponent(documentId)}/reviews/mine`, { method: 'PUT', body: { score, content } })
}
export function deleteMyReview(documentId) {
  return request(`/api/documents/${encodeURIComponent(documentId)}/reviews/mine`, { method: 'DELETE' })
}
export function deleteDocumentComment(documentId, commentId) {
  return request(`/api/documents/${encodeURIComponent(documentId)}/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' })
}

export async function downloadDocument(documentId, suggestedName = `5share-${documentId}.pdf`) {
  const blob = await request(`/api/documents/${encodeURIComponent(documentId)}/download`, { binary: true })
  let cleanName = String(suggestedName || `5share-${documentId}.pdf`).replace(/[\\/:*?"<>|]/g, '_')
  if (!/\.(pdf|docx|pptx)$/i.test(cleanName)) {
    cleanName += '.pdf'
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = cleanName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}
