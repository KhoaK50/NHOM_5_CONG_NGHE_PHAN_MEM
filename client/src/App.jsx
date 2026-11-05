import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeft, Lock } from 'lucide-react'
import Navbar from './components/common/Navbar'
import AuthSubsystem from './components/auth/AuthSubsystem'
import LandingPage from './components/home/LandingPage'
import DiscoveryPage from './components/home/DiscoveryPage'
import DocumentDetail from './components/document/DocumentDetail'
import UploadModal from './components/upload/UploadModal'
import ModerationQueue from './components/admin/ModerationQueue'
import CourseManagement from './components/admin/CourseManagement'
import AdminDashboard from './components/admin/AdminDashboard'
import UserManagement from './components/admin/UserManagement'
import FeedbackModal from './components/document/FeedbackModal'
import MyDocuments from './components/library/MyDocuments'
import SavedBookmarks from './components/library/SavedBookmarks'
import UserProfile from './components/profile/UserProfile'
import { AuthGuard, getApiBaseUrl } from './utils/authGuard'
import { CURRICULUM_COURSES } from './data/curriculum'
import { api, subscribeNotifications } from './api/notificationReportApi'
import ToastStack from './components/common/ToastStack'
import { listPublicCourses, listModerationDocuments, listReports, uploadDocument } from './utils/documentCourseApi'
import { connectRealtime } from './utils/realtime'
import {
  addBookmark,
  downloadDocument,
  listBookmarks,
  listAllPublicDocuments,
  recordDocumentView,
  removeBookmark
} from './utils/interactionApi'

// Dự phòng khi luồng sự kiện bị ngắt, và tránh tải lại liên tục khi người dùng quay lại tab
const FALLBACK_POLL_MS = 30000
const FOCUS_REFRESH_MIN_MS = 10000
const REALTIME_COALESCE_MS = 250

const KNOWLEDGE_BLOCK_LABEL_MAP = {
  DAI_CUONG: 'Đại cương',
  CO_SO_NGANH: 'Cơ sở ngành',
  CHUYEN_NGANH: 'Chuyên ngành',
  NGHIEP_VU_SU_PHAM: 'Nghiệp vụ Sư phạm'
}

function normalizeCourse(apiCourse) {
  const code = apiCourse.courseCode || apiCourse.code
  const meta = CURRICULUM_COURSES.find((c) => c.code === code) || {}
  const semStr =
    typeof apiCourse.semester === 'number'
      ? `Học kỳ ${apiCourse.semester}`
      : apiCourse.semester || meta.semester || 'Học kỳ 1'
  const blockStr =
    KNOWLEDGE_BLOCK_LABEL_MAP[apiCourse.knowledgeBlock] ||
    apiCourse.knowledgeBlock ||
    meta.knowledgeBlock ||
    'Cơ sở ngành'

  return {
    ...meta,
    ...apiCourse,
    id: apiCourse.id || meta.id,
    code,
    courseCode: code,
    name: apiCourse.courseName || apiCourse.name || meta.name || code,
    courseName: apiCourse.courseName || apiCourse.name || meta.name || code,
    semester: semStr,
    knowledgeBlock: blockStr,
    rawSemester: apiCourse.semester,
    rawKnowledgeBlock: apiCourse.knowledgeBlock,
    credits: apiCourse.credits ?? meta.credits ?? 3,
    summary: apiCourse.summary || meta.summary || '',
    isActive: apiCourse.isActive !== undefined ? apiCourse.isActive : true,
    documentCount: apiCourse.documentCount ?? meta.documentCount ?? 0,
    prerequisites: meta.prerequisites || []
  }
}

function inferNoticeTone(text = '') {
  if (/vui lòng|tạm khóa|bị khóa|hết hạn|không còn/i.test(text)) return 'warning'
  if (/không thể|không tải|không gửi|lỗi|thất bại/i.test(text)) return 'error'
  if (/^đang |^thông báo mới/i.test(text)) return 'info'
  return 'success'
}

function readSharedDocumentId() {
  const match = window.location.pathname.match(/^\/documents\/(\d+)\/?$/)
  return match ? Number(match[1]) : null
}

export default function App() {
  const [actorRole, setActorRole] = useState(() => {
    const saved = AuthGuard.getSavedUserProfile()
    if (saved && AuthGuard.getAuthToken()) {
      return saved.role === 'ADMIN' ? 'ADMIN' : 'USER'
    }
    return 'GUEST'
  }) // 'GUEST' | 'USER' | 'ADMIN'

  const [activeView, setActiveView] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('reset_token')) {
        return 'auth'
      }
      if (readSharedDocumentId() != null) {
        return 'discovery'
      }
    }
    return 'landing'
  })
  const [authTab, setAuthTab] = useState('login')
  const [afterAuthView, setAfterAuthView] = useState(null)
  const [adminSubTab, setAdminSubTab] = useState('dashboard') // 'dashboard' | 'moderation' | 'courses' | 'users'
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [discoveryQuery, setDiscoveryQuery] = useState('')

  const [courses, setCourses] = useState(() => CURRICULUM_COURSES.map(normalizeCourse))
  const [documents, setDocuments] = useState([])
  const [notifications, setNotifications] = useState([])
  const [users, setUsers] = useState([])
  const [downloadHistory, setDownloadHistory] = useState([])
  const [bookmarkedIds, setBookmarkedIds] = useState([])
  const [selectedDocId, setSelectedDocId] = useState(null)
  const [toasts, setToasts] = useState([])
  const [adminPendingCount, setAdminPendingCount] = useState(0)
  // Tăng mỗi khi máy chủ báo có thay đổi để các màn hình đang mở tự nạp lại
  const [liveVersion, setLiveVersion] = useState(0)
  const selectedDocIdRef = useRef(null)
  const activeViewRef = useRef(activeView)
  const [userSession, setUserSession] = useState(() => {
    const saved = AuthGuard.getSavedUserProfile()
    if (saved && AuthGuard.getAuthToken()) {
      return saved
    }
    return null
  })

  const closeToast = useCallback((id) => {
    setToasts((items) => items.filter((item) => item.id !== id))
  }, [])

  // Một kiểu thông báo cho toàn hệ thống. Lỗi giữ lại đến khi đóng, loại khác tự ẩn sau 5 giây.
  const showNotice = useCallback((text, tone) => {
    if (!text) return
    const resolvedTone = tone || inferNoticeTone(text)
    const id = `${Date.now()}-${Math.random()}`
    setToasts((items) => [...items.filter((item) => item.text !== text), { id, text, tone: resolvedTone }].slice(-3))
    if (resolvedTone !== 'error') setTimeout(() => closeToast(id), 5000)
  }, [closeToast])

  // Nạp danh mục môn học
  useEffect(() => {
    let cancelled = false
    Promise.all([
      listPublicCourses({ page: 1, limit: 50 }),
      listPublicCourses({ page: 2, limit: 50 })
    ])
      .then(([res1, res2]) => {
        if (cancelled) return
        const list1 = Array.isArray(res1?.data) ? res1.data : []
        const list2 = Array.isArray(res2?.data) ? res2.data : []
        const combined = [...list1, ...list2]
        const apiCourses = combined.map(normalizeCourse)
        const apiCodes = new Set(apiCourses.map((c) => c.code))
        const fallbackCourses = CURRICULUM_COURSES.filter((c) => !apiCodes.has(c.code)).map(normalizeCourse)
        setCourses([...apiCourses, ...fallbackCourses])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Nạp kho tài liệu công khai
  useEffect(() => {
    let cancelled = false
    listAllPublicDocuments()
      .then((items) => {
        if (cancelled) return
        setDocuments(items)
        // Link chia sẻ dạng /documents/:id
        const sharedId = readSharedDocumentId()
        if (sharedId == null) return
        window.history.replaceState(null, '', '/')
        if (items.some((item) => item.id === sharedId)) {
          setSelectedDocId(sharedId)
          setActiveView('detail')
          recordDocumentView(sharedId).catch(() => {})
        } else {
          setActiveView('discovery')
          showNotice('Tài liệu trong liên kết không tồn tại hoặc không còn công khai.', 'error')
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setDocuments([])
          showNotice(`Không tải được danh sách tài liệu từ máy chủ: ${error.message}`, 'error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [showNotice])

  // Nạp danh sách bookmark của tài khoản sinh viên
  useEffect(() => {
    if (actorRole === 'GUEST' || !userSession?.id) {
      return undefined
    }
    let cancelled = false
    listBookmarks()
      .then((items) => {
        if (!cancelled) setBookmarkedIds(items.map((item) => item.id))
      })
      .catch((error) => {
        if (!cancelled) showNotice(`Không tải được tài liệu đã lưu: ${error.message}`, 'error')
      })
    return () => {
      cancelled = true
    }
  }, [actorRole, userSession?.id, showNotice])

  useEffect(() => {
    selectedDocIdRef.current = selectedDocId
  }, [selectedDocId])

  useEffect(() => {
    activeViewRef.current = activeView
  }, [activeView])

  // Làm mới Kho học liệu nhưng giữ tài liệu đang đọc, kể cả khi tài liệu đó chưa hoặc không còn công khai
  const refreshDocuments = useCallback(async () => {
    const items = await listAllPublicDocuments()
    setDocuments((prev) => {
      const selectedId = selectedDocIdRef.current
      if (selectedId == null || items.some((item) => item.id === selectedId)) return items
      const selected = prev.find((item) => item.id === selectedId)
      return selected ? [selected, ...items] : items
    })
  }, [])

  // UC03: Nhận thông báo và thay đổi của Kho ngay khi máy chủ báo, không cần tải lại trang
  const sessionUserId = userSession?.id
  useEffect(() => {
    let isCancelled = false
    let knownIds = null
    let streamConnected = false
    let hasConnectedBefore = false
    let lastRefreshAt = Date.now()
    const pendingTasks = new Set()
    let coalesceTimer = null

    const loadNotifications = (announce) => {
      if (!sessionUserId) return
      api
        .getNotifications({ limit: 20 })
        .then((res) => {
          const items = res?.data?.items
          if (isCancelled || !Array.isArray(items)) return
          if (announce && knownIds) {
            const fresh = items.filter((item) => !knownIds.has(item.id) && !item.isRead)
            if (fresh.length === 1) showNotice(`Thông báo mới: ${fresh[0].title}`, 'info')
            else if (fresh.length > 1) showNotice(`Bạn có ${fresh.length} thông báo mới.`, 'info')
          }
          knownIds = new Set(items.map((item) => item.id))
          setNotifications(items)
        })
        .catch(() => {})
    }

    const loadDocuments = () => {
      refreshDocuments().catch(() => {})
    }

    const refreshAll = () => {
      lastRefreshAt = Date.now()
      loadNotifications(true)
      loadDocuments()
      setLiveVersion((version) => version + 1)
    }

    // Gom các sự kiện đến sát nhau thành một lần nạp
    const schedule = (task) => {
      pendingTasks.add(task)
      if (coalesceTimer) return
      coalesceTimer = setTimeout(() => {
        coalesceTimer = null
        const tasks = [...pendingTasks]
        pendingTasks.clear()
        tasks.forEach((run) => run())
        setLiveVersion((version) => version + 1)
      }, REALTIME_COALESCE_MS)
    }

    const announceNotifications = () => loadNotifications(true)
    const noop = () => {}

    loadNotifications(false)

    const disconnect = connectRealtime({
      onEvent: (event) => {
        if (isCancelled) return
        if (event === 'notification') schedule(announceNotifications)
        else if (event === 'documents') schedule(loadDocuments)
        else if (event === 'moderation') schedule(noop)
      },
      onStatusChange: (connected) => {
        streamConnected = connected
        // Kết nối lại: nạp bù những gì đã lỡ trong lúc mất kết nối
        if (connected && hasConnectedBefore && !isCancelled) refreshAll()
        if (connected) hasConnectedBefore = true
      }
    })

    const pollTimer = setInterval(() => {
      if (!streamConnected && document.visibilityState === 'visible') refreshAll()
    }, FALLBACK_POLL_MS)

    const handleVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefreshAt > FOCUS_REFRESH_MIN_MS) refreshAll()
    }
    document.addEventListener('visibilitychange', handleVisible)
    window.addEventListener('focus', handleVisible)

    const unsubscribe = subscribeNotifications((newEvent) => {
      if (isCancelled) return
      if (newEvent?.type === 'NOTIFICATION_CREATED' && newEvent.data) {
        setNotifications((prev) => [newEvent.data, ...prev])
        showNotice(`Thông báo mới: ${newEvent.data.title || 'Bạn có thông báo mới'}`, 'info')
      }
    })

    return () => {
      isCancelled = true
      clearTimeout(coalesceTimer)
      clearInterval(pollTimer)
      document.removeEventListener('visibilitychange', handleVisible)
      window.removeEventListener('focus', handleVisible)
      disconnect()
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [sessionUserId, refreshDocuments, showNotice])

  const fetchAdminUsersList = useCallback((authToken) => {
    const tokenToUse = authToken || AuthGuard.getAuthToken()
    if (!tokenToUse) return
    fetch(`${getApiBaseUrl()}/api/auth/users`, {
      headers: { Authorization: `Bearer ${tokenToUse}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success' && Array.isArray(data.users) && data.users.length > 0) {
          setUsers(data.users)
        }
      })
      .catch(() => {})
  }, [])

  // Đối chiếu phiên JWT trực tiếp với máy chủ xác thực
  useEffect(() => {
    const token = AuthGuard.getAuthToken()
    if (!token) return

    fetch(`${getApiBaseUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        return { ok: res.ok, status: res.status, data }
      })
      .then(({ ok, status, data }) => {
        if (data.status === 'session_revoked' || status === 401 || status === 403 || !ok) {
          AuthGuard.clearAuthSession()
          setUserSession(null)
          setActorRole('GUEST')
          setBookmarkedIds([])
          if (data.status === 'session_revoked') {
            setActiveView('auth')
            showNotice(
              'Phiên đăng nhập của bạn đã bị thu hồi do thay đổi mật khẩu hoặc kích hoạt khóa khẩn cấp.'
            )
          }
          return
        }

        if (data.status === 'success' && data.user) {
          const nextRole = data.user.role === 'ADMIN' ? 'ADMIN' : 'USER'
          AuthGuard.updateSavedUserProfile(data.user, token)
          setUserSession(data.user)
          setActorRole(nextRole)
          if (nextRole === 'ADMIN') {
            fetchAdminUsersList(token)
          }
        }
      })
      .catch(() => {
        // Giữ phiên hiện tại nếu mạng tạm thời gián đoạn
      })
  }, [showNotice, fetchAdminUsersList])

  const isCurrentUserLocked = Boolean(
    userSession &&
      (userSession.isActive === false ||
        users.some(
          (u) =>
            (u.id === userSession.id || u.email === userSession.email) &&
            u.isActive === false
        ))
  )

  const handleOpenUpload = () => {
    if (actorRole === 'GUEST') {
      handleOpenAuth('login', 'upload')
      return
    }
    if (isCurrentUserLocked) {
      showNotice('Tài khoản của bạn đang bị tạm khóa. Không thể thực hiện đóng góp học liệu.')
      return
    }
    setActiveView('upload')
  }

  // Danh sách tài khoản không còn giữ token: đổi tài khoản phải đăng nhập lại
  const handleSwitchSavedAccount = (savedEntry) => {
    showNotice(`Vui lòng đăng nhập để chuyển sang tài khoản ${savedEntry?.email || 'đã chọn'}.`)
    handleOpenAuth('login')
  }

  const handleNavigate = (view) => {
    if (view === 'feedback') {
      if (actorRole === 'GUEST') handleOpenAuth('login')
      else setIsFeedbackOpen(true)
      return
    }
    if (view === 'admin') {
      setActiveView('admin')
      return
    }
    if (actorRole === 'GUEST' && ['upload', 'my-docs', 'bookmarks', 'profile'].includes(view)) {
      handleOpenAuth('login', view)
      return
    }
    if (view === 'upload' && isCurrentUserLocked) {
      showNotice('Tài khoản của bạn đang bị tạm khóa. Không thể thực hiện đóng góp học liệu.')
      return
    }
    if (view === 'discovery') setDiscoveryQuery('')
    setActiveView(view)
    try {
      window.scrollTo({ top: 0, behavior: 'instant' })
    } catch {
      // ignore
    }
  }

  const handleSearchFromHome = (query) => {
    setDiscoveryQuery(query)
    setActiveView('discovery')
  }

  const handleOpenAuth = (tab = 'login', destination = null) => {
    setAfterAuthView(destination)
    setAuthTab(tab)
    setActiveView('auth')
  }

  const handleAuthSuccess = (profile) => {
    const isLocked =
      profile.isActive === false ||
      profile.status === 'locked' ||
      users.some(
        (u) => (u.id === profile.id || u.email === profile.email) && u.isActive === false
      )
    if (isLocked) {
      showNotice('Tài khoản đã bị tạm khóa do vi phạm chuẩn mực học thuật. Vui lòng liên hệ Ban Quản trị.')
      return
    }
    const nextRole = profile.role === 'ADMIN' ? 'ADMIN' : 'USER'
    setUserSession(profile)
    setActorRole(nextRole)
    setActiveView(afterAuthView || 'discovery')
    setAfterAuthView(null)
    if (nextRole === 'ADMIN') {
      fetchAdminUsersList(AuthGuard.getAuthToken())
    }
    showNotice(
      `Đăng nhập thành công! Chào mừng ${profile.fullName} (${
        nextRole === 'ADMIN' ? 'Quản trị viên' : 'Sinh viên'
      }).`
    )
  }

  const handleLogout = () => {
    AuthGuard.clearAuthSession()
    setUserSession(null)
    setActorRole('GUEST')
    setBookmarkedIds([])
    setNotifications([])
    if (
      [
        'upload',
        'my-docs',
        'bookmarks',
        'profile',
        'admin',
        'admin-dashboard',
        'admin-moderation',
        'admin-courses',
        'admin-users'
      ].includes(activeView)
    ) {
      setActiveView('discovery')
    }
    showNotice('Đã đăng xuất.')
  }

  const handleSelectDocument = (docOrId) => {
    const id = typeof docOrId === 'object' ? docOrId.id : docOrId
    setSelectedDocId(id)
    if (typeof docOrId === 'object' && !documents.some((item) => item.id === id)) {
      setDocuments((prev) => [docOrId, ...prev])
    }
    setActiveView('detail')
    recordDocumentView(id)
      .then(() => {
        setDocuments((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, viewCount: (item.viewCount || 0) + 1 } : item
          )
        )
      })
      .catch(() => {})
  }

  const handleDownloadDocument = async (doc) => {
    if (actorRole === 'GUEST') {
      handleOpenAuth('login')
      return
    }
    try {
      await downloadDocument(doc.id, doc.fileName)
      setDocuments((prev) =>
        prev.map((item) =>
          item.id === doc.id ? { ...item, downloadCount: (item.downloadCount || 0) + 1 } : item
        )
      )
      setDownloadHistory((prev) => [
        {
          id: `dl-${Date.now()}`,
          docId: doc.id,
          title: doc.title,
          fileName: doc.fileName,
          format: doc.format || 'PDF',
          downloadedAt: new Date().toISOString()
        },
        ...prev
      ])
      showNotice(`Đã tải "${doc.fileName}".`)
    } catch (error) {
      showNotice(error.message, 'error')
      if (error.status === 401 || error.status === 403) handleOpenAuth('login')
    }
  }

  const handleToggleBookmark = async (docId) => {
    if (actorRole === 'GUEST') {
      handleOpenAuth('login')
      return
    }
    const exists = bookmarkedIds.includes(docId)
    try {
      if (exists) {
        await removeBookmark(docId)
        setBookmarkedIds((prev) => prev.filter((id) => id !== docId))
        showNotice('Đã bỏ lưu tài liệu.')
      } else {
        await addBookmark(docId)
        setBookmarkedIds((prev) => (prev.includes(docId) ? prev : [...prev, docId]))
        showNotice('Đã lưu tài liệu vào Tủ cá nhân.')
      }
    } catch (error) {
      showNotice(error.message, 'error')
      throw error
    }
  }

  // UC04: ReportModal đã gửi báo cáo lên máy chủ, ở đây chỉ báo kết quả cho người dùng
  const handleSubmitReport = () => {
    showNotice('Báo cáo vi phạm đã được ghi nhận và gửi tới Ban Quản trị.')
  }

  const handleUpdateProfile = async (updatedFields) => {
    const token = AuthGuard.getAuthToken()
    if (!token) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    }

    const res = await fetch(`${getApiBaseUrl()}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        fullName: updatedFields.fullName,
        cohort: updatedFields.cohort,
        studentCode: updatedFields.studentId,
        avatarUrl: updatedFields.avatarUrl
      })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.status !== 'success') {
      throw new Error(data.message || 'Không thể cập nhật thông tin hồ sơ trên máy chủ.')
    }

    const mergedUser = {
      ...userSession,
      ...data.user,
      avatarPreset: updatedFields.avatarPreset || userSession?.avatarPreset
    }
    setUserSession(mergedUser)
    AuthGuard.updateSavedUserProfile(mergedUser, token)
    setUsers((prev) =>
      prev.map((u) => (u.id === mergedUser.id ? { ...u, ...mergedUser } : u))
    )
    showNotice(data.message || 'Đã cập nhật thông tin hồ sơ cá nhân thành công!')
  }

  const handleAvatarUploaded = (updatedUser, uploadedUrl) => {
    const mergedUser = {
      ...userSession,
      ...updatedUser,
      avatar_url: uploadedUrl,
      avatarUrl: uploadedUrl
    }
    setUserSession(mergedUser)
    setUsers((prev) =>
      prev.map((u) => (u.id === mergedUser.id ? { ...u, ...mergedUser } : u))
    )
    showNotice('Đã cập nhật ảnh đại diện.')
  }

  const handleChangePassword = async ({ oldPassword, newPassword, confirmPassword }) => {
    if (!newPassword || newPassword !== confirmPassword) {
      throw new Error('Mật khẩu xác nhận không trùng khớp.')
    }
    const token = AuthGuard.getAuthToken()
    if (!token) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    }

    const res = await fetch(`${getApiBaseUrl()}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ oldPassword, newPassword })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.status !== 'success') {
      throw new Error(data.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.')
    }

    const updatedUser = { ...userSession, ...(data.user || {}) }
    const freshToken = data.token || token
    setUserSession(updatedUser)
    AuthGuard.updateSavedUserProfile(updatedUser, freshToken)
    showNotice(
      data.message || 'Đổi mật khẩu thành công! Các phiên đăng nhập cũ trên thiết bị khác đã được thu hồi.'
    )
  }

  const handleSubmitNewDocument = async (newDocPayload, { onProgress } = {}) => {
    if (isCurrentUserLocked) {
      return { ok: false, message: 'Tài khoản của bạn đang bị tạm khóa. Không thể thực hiện đóng góp học liệu.' }
    }

    if (actorRole === 'GUEST' || !userSession?.id) {
      showNotice('Vui lòng đăng nhập tài khoản sinh viên hoặc giảng viên để tải học liệu lên hệ thống.')
      handleOpenAuth('login')
      return { ok: false }
    }

    try {
      const res = await uploadDocument(
        {
          title: newDocPayload.title,
          courseCode: newDocPayload.courseCode,
          courseId: newDocPayload.courseId,
          docType: newDocPayload.docType,
          description: newDocPayload.description,
          file: newDocPayload.file
        },
        { onProgress }
      )
      showNotice(res?.message || 'Đã gửi tài liệu. Tài liệu đang chờ quản trị viên kiểm duyệt.', 'success')
      // Chỉ chuyển màn hình nếu người dùng vẫn đang ở trang Đóng góp
      if (activeViewRef.current === 'upload') setActiveView('my-docs')
      else setLiveVersion((version) => version + 1)
      return { ok: true }
    } catch (err) {
      const message = err.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.'
      if (activeViewRef.current !== 'upload') showNotice(`Không gửi được tài liệu: ${message}`, 'error')
      return { ok: false, message }
    }
  }

  // Cập nhật điểm đánh giá trên Kho ngay sau khi có người đánh giá
  const handleRatingSummaryChange = useCallback((documentId, summary) => {
    setDocuments((prev) =>
      prev.map((item) =>
        item.id === documentId
          ? { ...item, ratingAvg: Number(summary.average) || 0, ratingCount: summary.totalRatings || 0 }
          : item
      )
    )
  }, [])

  const handleToggleUserStatus = async (userId, lockReason = null) => {
    const target = users.find((u) => u.id === userId)
    if (!target) return

    const nextDbStatus = target.isActive ? 'locked' : 'active'
    const token = AuthGuard.getAuthToken()

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: nextDbStatus })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.status !== 'success') {
        showNotice(data.message || 'Không thể cập nhật trạng thái tài khoản này.')
        return false
      }
    } catch {
      showNotice('Không kết nối được máy chủ, trạng thái tài khoản chưa thay đổi.', 'error')
      return false
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextStatus = !u.isActive
          showNotice(
            nextStatus
              ? `Đã mở khóa tài khoản thành viên "${u.fullName}".`
              : `Đã khóa tài khoản thành viên "${u.fullName}". Tài khoản bị chặn đóng góp học liệu.`
          )
          return {
            ...u,
            isActive: nextStatus,
            lockReason: nextStatus ? null : lockReason,
            lockedAt: nextStatus ? null : new Date().toISOString()
          }
        }
        return u
      })
    )
    return true
  }

  const handleToggleUserRole = async (userId, nextRole) => {
    const token = AuthGuard.getAuthToken()
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ role: nextRole })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.status !== 'success') {
        showNotice(data.message || 'Không thể thay đổi quyền của tài khoản này.')
        return false
      }
    } catch {
      showNotice('Không kết nối được máy chủ, quyền của tài khoản chưa thay đổi.', 'error')
      return false
    }

    const canonicalUiRole = nextRole === 'ADMIN' ? 'ADMIN' : 'USER'
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, role: canonicalUiRole, dbRole: nextRole } : u
      )
    )
    return true
  }

  const handleMarkOneRead = async (notifId) => {
    try {
      await api.markNotificationsRead({ ids: [notifId] })
    } catch {
      // Bỏ qua lỗi mạng cục bộ khi đánh dấu thông báo
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    )
  }

  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationsRead({ markAll: true })
    } catch (error) {
      showNotice(error.message, 'error')
      return
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    showNotice('Đã đánh dấu toàn bộ thông báo là đã đọc.')
  }

  const handleSelectNotification = (notif) => {
    if (notif.targetScreen) {
      setActiveView(notif.targetScreen)
      return
    }
    if (['REJECTED', 'DOC_REJECTED', 'DOCUMENT_REJECTED'].includes(notif.type)) {
      setActiveView('my-docs')
      return
    }
    const documentId = notif.targetDocId || notif.documentId
    if (documentId) {
      const documentItem = documents.find((item) => Number(item.id) === Number(documentId))
      if (documentItem) handleSelectDocument(documentItem)
      else showNotice('Tài liệu liên quan không còn trong Kho học liệu.')
    }
  }

  const selectedDocument =
    documents.find((d) => d.id === selectedDocId) || documents[0]
  const isStudent = actorRole === 'USER'

  const isAuthorizedAdmin = Boolean(
    userSession &&
      userSession.role === 'ADMIN' &&
      actorRole === 'ADMIN' &&
      AuthGuard.getAuthToken()
  )
  const isAdminView =
    activeView === 'admin' ||
    ['admin-dashboard', 'admin-moderation', 'admin-courses', 'admin-users'].includes(activeView)

  const currentAdminTab =
    activeView === 'admin-dashboard'
      ? 'dashboard'
      : activeView === 'admin-moderation'
      ? 'moderation'
      : activeView === 'admin-courses'
      ? 'courses'
      : activeView === 'admin-users'
      ? 'users'
      : adminSubTab

  // Đếm số lượng tài liệu & báo cáo chờ duyệt từ CSDL thật
  useEffect(() => {
    if (!isAdminView || !AuthGuard.getAuthToken()) return undefined
    let cancelled = false
    Promise.all([
      listModerationDocuments({ status: 'PENDING', limit: 1 }),
      listReports({ status: 'PENDING', limit: 1 })
    ])
      .then(([docResult, reportResult]) => {
        if (!cancelled) {
          const docTotal = docResult?.pagination?.total || 0
          const repTotal = reportResult?.pagination?.total || 0
          setAdminPendingCount(docTotal + repTotal)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isAdminView, liveVersion])

  const handleSelectAdminSubTab = (tabId) => {
    setAdminSubTab(tabId)
    if (activeView !== 'admin') {
      setActiveView('admin')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* Thanh điều hướng chính */}
      <Navbar
        actorRole={actorRole}
        userSession={userSession}
        activeView={activeView}
        onNavigate={handleNavigate}
        onSwitchSavedAccount={handleSwitchSavedAccount}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        notifications={notifications}
        onMarkOneRead={handleMarkOneRead}
        onMarkAllRead={handleMarkAllRead}
        onSelectNotification={handleSelectNotification}
        logoVariant="loops-weave"
      />

      {/* Thông báo phản hồi thao tác */}
      <ToastStack toasts={toasts} onClose={closeToast} />

      {/* Vùng hiển thị màn hình chính */}
      {isAdminView ? (
        !isAuthorizedAdmin ? (
          <div className="admin-lock-screen">
            <div className="admin-lock-card">
              <div className="admin-lock-icon">
                <Lock size={22} />
              </div>
              <h2 className="admin-lock-title">Yêu cầu quyền Quản trị viên</h2>
              <p className="admin-lock-desc">
                Bạn cần đăng nhập bằng tài khoản Quản trị viên để truy cập không gian này.
              </p>
              <div className="admin-lock-actions">
                <button
                  type="button"
                  className="btn-solid-primary"
                  onClick={() => handleOpenAuth('login')}
                >
                  Đăng nhập tài khoản quản trị
                </button>
                <button type="button" className="btn-ghost" onClick={() => setActiveView('discovery')}>
                  <ArrowLeft size={16} />
                  <span>Về Kho học liệu</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="admin-workspace-shell">
            <nav className="admin-tabs" aria-label="Điều hướng quản trị">
              {[
                { id: 'dashboard', label: 'Tổng quan' },
                {
                  id: 'moderation',
                  label: adminPendingCount > 0 ? `Kiểm duyệt (${adminPendingCount})` : 'Kiểm duyệt'
                },
                { id: 'courses', label: 'Môn học' },
                { id: 'users', label: 'Người dùng' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`admin-tab ${currentAdminTab === tab.id ? 'active' : ''}`}
                  aria-current={currentAdminTab === tab.id ? 'page' : undefined}
                  onClick={() => handleSelectAdminSubTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <main className="admin-workspace-content">
              {currentAdminTab === 'moderation' && (
                <ModerationQueue onNotice={showNotice} onPendingCountChange={setAdminPendingCount} refreshSignal={liveVersion} />
              )}

              {currentAdminTab === 'courses' && (
                <CourseManagement onNotice={showNotice} />
              )}

              {currentAdminTab === 'dashboard' && (
                <AdminDashboard
                  onSelectDoc={handleSelectDocument}
                  onNavigateTab={handleSelectAdminSubTab}
                  refreshSignal={liveVersion}
                />
              )}

              {currentAdminTab === 'users' && (
                <UserManagement
                  users={users}
                  currentUser={userSession}
                  onToggleUserStatus={handleToggleUserStatus}
                  onToggleUserRole={handleToggleUserRole}
                  onNotice={showNotice}
                />
              )}
            </main>
          </div>
        )
      ) : (
        <main
          className={
            activeView === 'auth'
              ? 'auth-page-wrapper'
              : activeView === 'landing'
              ? 'landing-page-shell'
              : 'platform-container'
          }
          style={{ flex: 1 }}
        >
          {activeView === 'auth' && (
            <AuthSubsystem
              key={authTab}
              initialTab={authTab}
              logoVariant="loops-weave"
              onLoginSuccess={handleAuthSuccess}
            />
          )}

          {activeView === 'landing' && (
            <LandingPage
              documents={documents}
              onSearch={handleSearchFromHome}
              onExploreDiscovery={() => handleNavigate('discovery')}
              onOpenUpload={handleOpenUpload}
              onSelectDoc={handleSelectDocument}
            />
          )}

          {activeView === 'discovery' && (
            <DiscoveryPage
              key={discoveryQuery}
              initialQuery={discoveryQuery}
              documents={documents}
              courses={courses}
              bookmarkedIds={bookmarkedIds}
              onSelectDoc={handleSelectDocument}
              onToggleBookmark={isStudent ? handleToggleBookmark : undefined}
              onOpenUpload={handleOpenUpload}
            />
          )}

          {activeView === 'detail' && (
            <DocumentDetail
              documentItem={selectedDocument}
              isAuthenticated={actorRole !== 'GUEST'}
              currentUser={userSession}
              isBookmarked={bookmarkedIds.includes(selectedDocument?.id)}
              onBackToDiscovery={() => setActiveView('discovery')}
              onDownload={handleDownloadDocument}
              onToggleBookmark={handleToggleBookmark}
              onSubmitReport={handleSubmitReport}
              onRequireLogin={() => handleOpenAuth('login')}
              onRatingSummaryChange={handleRatingSummaryChange}
            />
          )}

          {activeView === 'upload' && (
            <UploadModal
              courses={courses}
              existingDocuments={documents}
              onSubmitNewDocument={handleSubmitNewDocument}
              onCancel={() => setActiveView('discovery')}
            />
          )}

          {activeView === 'my-docs' && (
            <MyDocuments
              currentUser={userSession}
              onSelectDoc={handleSelectDocument}
              onOpenUpload={handleOpenUpload}
              refreshSignal={liveVersion}
            />
          )}

          {activeView === 'bookmarks' && (
            <SavedBookmarks
              onSelectDoc={handleSelectDocument}
              onToggleBookmark={handleToggleBookmark}
              onNavigateDiscovery={() => setActiveView('discovery')}
            />
          )}

          {activeView === 'profile' && (
            <UserProfile
              key={userSession?.id || userSession?.email || 'guest-profile'}
              currentUser={userSession}
              documents={documents}
              downloadHistory={downloadHistory}
              onSelectDoc={handleSelectDocument}
              onUpdateProfile={handleUpdateProfile}
              onAvatarUploaded={handleAvatarUploaded}
              onChangePassword={handleChangePassword}
            />
          )}
        </main>
      )}

      {/* MODAL HÒM THƯ GÓP Ý HỆ THỐNG TOÀN CỤC */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        currentUser={userSession}
      />
    </div>
  )
}
