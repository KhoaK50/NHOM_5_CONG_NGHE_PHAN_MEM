/**
 * ============================================================================
 * GỌI API CỤM UC08–UC10: CHỐNG TRÙNG SHA-256, KIỂM DUYỆT, BÁO CÁO & MÔN HỌC
 * Hợp đồng: {"success":true,"data":...} | {"success":false,"code","message"}
 * ============================================================================
 */

import { getApiBaseUrl, getAuthToken } from './authGuard'

export class ApiRequestError extends Error {
  constructor(status, payload) {
    super(payload?.message || 'Không thể kết nối tới máy chủ. Vui lòng thử lại sau.')
    this.status = status
    this.code = payload?.code || 'NETWORK_ERROR'
    this.details = payload || {}
  }
}

async function request(path, { method = 'GET', body, formData } = {}) {
  const token = getAuthToken()
  let response
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
      },
      body: formData || (body !== undefined ? JSON.stringify(body) : undefined)
    })
  } catch {
    throw new ApiRequestError(0, null)
  }

  if (response.status === 204) return null
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new ApiRequestError(response.status, payload)
  return payload
}

function toQuery(params) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value)
  })
  const text = search.toString()
  return text ? `?${text}` : ''
}

// UC07
export function uploadDocument(payload) {
  const formData = payload instanceof FormData ? payload : new FormData()
  if (!(payload instanceof FormData)) {
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) formData.append(k, v)
    })
  }
  return request('/api/documents', { method: 'POST', formData })
}

// UC08
export function checkDocumentHash(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request('/api/documents/check-hash', { method: 'POST', formData })
}

// UC09
export function listModerationDocuments(params) {
  return request(`/api/admin/documents${toQuery(params)}`)
}

export function getModerationDocument(id) {
  return request(`/api/admin/documents/${id}`)
}

export function moderateDocument(id, body) {
  return request(`/api/admin/documents/${id}/moderate`, { method: 'PATCH', body })
}

export function listReports(params) {
  return request(`/api/admin/reports${toQuery(params)}`)
}

export function resolveReport(id, body) {
  return request(`/api/admin/reports/${id}/resolve`, { method: 'PATCH', body })
}

// UC10
export function listPublicCourses(params) {
  return request(`/api/courses${toQuery(params)}`)
}

export function listCourses(params) {
  return request(`/api/admin/courses${toQuery(params)}`)
}

export function createCourse(body) {
  return request('/api/admin/courses', { method: 'POST', body })
}

export function updateCourse(id, body) {
  return request(`/api/admin/courses/${id}`, { method: 'PATCH', body })
}

export function deleteCourse(id) {
  return request(`/api/admin/courses/${id}`, { method: 'DELETE' })
}

// Nhãn hiển thị cho các giá trị trong CSDL
export const AUTO_CRITERIA = [
  { key: 'metadataComplete', title: 'Thông tin tài liệu đầy đủ', hint: 'Tiêu đề, mô tả, môn học, loại tài liệu' },
  { key: 'notDuplicate', title: 'Không trùng tài liệu đã có', hint: 'Mã băm SHA-256 là duy nhất trong kho' }
]

export const MANUAL_CRITERIA = [
  { key: 'readable', title: 'Rõ nét, đọc được', hint: 'Không mờ, không lỗi phông chữ tiếng Việt' },
  { key: 'academic', title: 'Có giá trị học thuật', hint: 'Nội dung chính xác, đúng chuẩn trình bày' },
  { key: 'courseMatch', title: 'Đúng môn học đã chọn', hint: 'Bám sát chương trình đào tạo của học phần' },
  { key: 'safeContent', title: 'Nội dung an toàn', hint: 'Không có nội dung rác, phản cảm hoặc độc hại' },
  { key: 'copyrightOk', title: 'Không vi phạm bản quyền', hint: 'Không phải đề đang bảo mật hay sách thương mại' },
  { key: 'privacyOk', title: 'Không lộ thông tin cá nhân', hint: 'Không chứa dữ liệu riêng tư của người khác' }
]

export const KNOWLEDGE_BLOCK_LABELS = {
  DAI_CUONG: 'Đại cương',
  CO_SO_NGANH: 'Cơ sở ngành',
  CHUYEN_NGANH: 'Chuyên ngành',
  NGHIEP_VU_SU_PHAM: 'Nghiệp vụ Sư phạm'
}

export const DOC_TYPE_LABELS = {
  KHBD_5512: 'KHBD Công văn 5512',
  SLIDE_BAI_GIANG: 'Slide bài giảng',
  DE_THI_DAP_AN: 'Đề thi & Đáp án',
  DO_AN_MAU: 'Đồ án & Khóa luận',
  GIAO_TRINH: 'Giáo trình & Sách học liệu',
  TAI_LIEU_THAM_KHAO: 'Giáo trình & Sách học liệu'
}

export const REPORT_REASON_LABELS = {
  SAI_KIEN_THUC: 'Sai kiến thức',
  KHONG_CHUAN_5512: 'Không chuẩn CV 5512',
  LOI_HIEN_THI_MO: 'Lỗi hiển thị, mờ',
  SAI_MON_HOC: 'Sai môn học',
  VI_PHAM_BAN_QUYEN: 'Vi phạm bản quyền',
  NOI_DUNG_RAC: 'Nội dung rác'
}

export function formatBytes(bytes) {
  return `${(Number(bytes || 0) / (1024 * 1024)).toFixed(2)} MB`
}

export function formatRelativeTime(iso) {
  if (!iso) return ''
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (diffMinutes < 1) return 'Vừa xong'
  if (diffMinutes < 60) return `${diffMinutes} phút trước`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} giờ trước`
  return `${Math.floor(diffMinutes / 1440)} ngày trước`
}

/** Chỉ mở URL https để tránh javascript: hoặc data: lọt vào thuộc tính src/href. */
export function isSafeHttpsUrl(url) {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}
