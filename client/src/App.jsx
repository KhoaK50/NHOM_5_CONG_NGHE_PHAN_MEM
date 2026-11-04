import { useState, useEffect, useCallback } from 'react'
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
import BountyBoard from './components/bounty/BountyBoard'
import { AuthGuard, getApiBaseUrl } from './utils/authGuard'
import { CURRICULUM_COURSES } from './data/curriculum'
import { listPublicCourses, listModerationDocuments, listReports, uploadDocument } from './utils/documentCourseApi'
import {
  addBookmark,
  downloadDocument,
  listBookmarks,
  listPublicDocuments,
  recordDocumentView,
  removeBookmark
} from './utils/interactionApi'

const KNOWLEDGE_BLOCK_LABEL_MAP = {
  DAI_CUONG: 'Đại cương',
  CO_SO_NGANH: 'Cơ sở ngành',
  CHUYEN_NGANH: 'Chuyên ngành',
  NGHIEP_VU_SU_PHAM: 'Nghiệp vụ Sư phạm'
};

function normalizeCourse(apiCourse) {
  const code = apiCourse.courseCode || apiCourse.code;
  const meta = CURRICULUM_COURSES.find((c) => c.code === code) || {};
  const semStr = typeof apiCourse.semester === 'number'
    ? `Học kỳ ${apiCourse.semester}`
    : (apiCourse.semester || meta.semester || 'Học kỳ 1');
  const blockStr = KNOWLEDGE_BLOCK_LABEL_MAP[apiCourse.knowledgeBlock] || apiCourse.knowledgeBlock || meta.knowledgeBlock || 'Cơ sở ngành';

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
  };
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
    }
    return 'landing'
  })
  const [authTab, setAuthTab] = useState('login')
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
  const [bannerNotice, setBannerNotice] = useState(null)
  const [adminPendingCount, setAdminPendingCount] = useState(0)
  const [userSession, setUserSession] = useState(() => {
    const saved = AuthGuard.getSavedUserProfile()
    if (saved && AuthGuard.getAuthToken()) {
      return saved
    }
    return null
  })

  const showNotice = useCallback((text) => {
    setBannerNotice(text)
    setTimeout(() => setBannerNotice(null), 4500)
  }, [])

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
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    listPublicDocuments({ page: 1, limit: 100 })
      .then((items) => { if (!cancelled) setDocuments(items || []) })
      .catch((error) => {
        if (!cancelled) {
          setDocuments([])
          showNotice(`Không tải được danh sách tài liệu từ máy chủ: ${error.message}`)
        }
      })
    return () => { cancelled = true }
  }, [showNotice])

  useEffect(() => {
    if (actorRole === 'GUEST' || !userSession?.id) {
      return undefined
    }
    let cancelled = false
    listBookmarks()
      .then((items) => { if (!cancelled) setBookmarkedIds(items.map((item) => item.id)) })
      .catch((error) => { if (!cancelled) showNotice(`Không tải được tài liệu đã lưu: ${error.message}`) })
    return () => { cancelled = true }
  }, [actorRole, userSession?.id, showNotice])

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

  // Đối chiếu phiên JWT (token_version) trực tiếp với bảng public.users trên Supabase
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
      handleOpenAuth('login')
      return
    }
    if (isCurrentUserLocked) {
      showNotice('Tài khoản của bạn đang bị tạm khóa. Không thể thực hiện đóng góp học liệu.')
      return
    }
    setActiveView('upload')
  }

  const handleSwitchSavedAccount = async (savedEntry) => {
    if (!savedEntry || !savedEntry.token) {
      handleOpenAuth('login')
      return
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${savedEntry.token}` }
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || data.status !== 'success' || !data.user) {
        AuthGuard.removeSavedAccount(savedEntry.email)
        showNotice('Phiên đã lưu của tài khoản này đã hết hạn hoặc bị thu hồi. Vui lòng đăng nhập lại.')
        handleOpenAuth('login')
        return
      }

      const verifiedUser = data.user
      const nextRole = verifiedUser.role === 'ADMIN' ? 'ADMIN' : 'USER'
      AuthGuard.saveAuthSession(savedEntry.token, verifiedUser, true)
      setUserSession(verifiedUser)
      setActorRole(nextRole)

      if (nextRole === 'ADMIN') {
        fetchAdminUsersList(savedEntry.token)
      } else if (
        ['admin', 'admin-dashboard', 'admin-moderation', 'admin-courses', 'admin-users'].includes(
          activeView
        )
      ) {
        setActiveView('discovery')
      }
      if (nextRole === 'ADMIN' && ['bounty', 'bookmarks'].includes(activeView)) {
        setActiveView('discovery')
      }

      showNotice(
        `Đã chuyển sang tài khoản "${verifiedUser.fullName}" (${
          nextRole === 'ADMIN' ? 'Quản trị viên' : 'Sinh viên'
        }).`
      )
    } catch {
      showNotice('Không thể xác thực phiên tài khoản đã lưu với máy chủ.')
    }
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
    if (actorRole === 'GUEST' && ['upload', 'my-docs', 'bookmarks', 'profile', 'bounty'].includes(view)) {
      handleOpenAuth('login')
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

  const handleOpenAuth = (tab = 'login') => {
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
    setActiveView('discovery')
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
    if (
      [
        'upload',
        'my-docs',
        'bookmarks',
        'profile',
        'bounty',
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

  const handleSelectDocument = (doc) => {
    setSelectedDocId(doc.id)
    setDocuments((previous) => previous.some((item) => item.id === doc.id) ? previous : [doc, ...previous])
    setActiveView('detail')
    recordDocumentView(doc.id)
      .then(() => setDocuments((previous) => previous.map((item) => item.id === doc.id ? { ...item, viewCount: (item.viewCount || 0) + 1 } : item)))
      .catch(() => {})
  }

  const handleDownloadDocument = async (doc) => {
    if (actorRole === 'GUEST') {
      handleOpenAuth('login')
      return
    }
    try {
      await downloadDocument(doc.id, doc.fileName)
      setDocuments((prev) => prev.map((item) => item.id === doc.id ? { ...item, downloadCount: (item.downloadCount || 0) + 1 } : item))
      setDownloadHistory((prev) => [{ id: `dl-${Date.now()}`, docId: doc.id, title: doc.title, fileName: doc.fileName, format: 'PDF', downloadedAt: new Date().toISOString() }, ...prev])
      showNotice(`Đã tải "${doc.fileName}".`)
    } catch (error) {
      showNotice(error.message)
      if (error.status === 401 || error.status === 403) handleOpenAuth('login')
    }
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

  const handleToggleBookmark = async (docId) => {
    if (actorRole === 'GUEST') {
      handleOpenAuth('login')
      return
    }
    const exists = bookmarkedIds.includes(docId)
    try {
      if (exists) {
        await removeBookmark(docId)
        setBookmarkedIds((previous) => previous.filter((id) => id !== docId))
        showNotice('Đã bỏ lưu tài liệu.')
      } else {
        await addBookmark(docId)
        setBookmarkedIds((previous) => previous.includes(docId) ? previous : [...previous, docId])
        showNotice('Đã lưu tài liệu.')
      }
    } catch (error) {
      showNotice(error.message)
      throw error
    }
  }

  const handleSubmitNewDocument = async (newDocPayload) => {
    if (isCurrentUserLocked) {
      showNotice('Tài khoản của bạn đang bị tạm khóa. Không thể thực hiện đóng góp học liệu.')
      return
    }
    if (actorRole === 'GUEST' || !userSession?.id) {
      showNotice('Vui lòng đăng nhập tài khoản sinh viên hoặc giảng viên để tải học liệu lên hệ thống.')
      handleOpenAuth('login')
      return
    }

    try {
      showNotice('Đang tải tệp lên...')
      const res = await uploadDocument({
        title: newDocPayload.title,
        courseCode: newDocPayload.courseCode,
        courseId: newDocPayload.courseId,
        docType: newDocPayload.docType,
        description: newDocPayload.description,
        file: newDocPayload.file
      })

      if (res?.success) {
        showNotice(res.message || 'Đã gửi tài liệu. Tài liệu đang chờ quản trị viên kiểm duyệt.')
        setActiveView('my-docs')
      } else {
        showNotice(res?.message || 'Không thể tải tài liệu lên. Vui lòng thử lại.')
      }
    } catch (err) {
      showNotice(`Lỗi tải học liệu: ${err.message || 'Không thể kết nối máy chủ'}`)
    }
  }

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
        return
      }
    } catch {
      // Nếu chạy ngoại tuyến thì vẫn cập nhật state cục bộ
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
        return
      }
    } catch {
      // Nếu chạy ngoại tuyến thì vẫn cập nhật state cục bộ
    }

    const canonicalUiRole = nextRole === 'ADMIN' ? 'ADMIN' : 'USER'
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, role: canonicalUiRole, dbRole: nextRole } : u
      )
    )
  }

  const handleMarkOneRead = (notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    )
  }

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    showNotice('Đã đánh dấu toàn bộ thông báo là đã đọc.')
  }

  const handleSelectNotification = (notif) => {
    if (notif.targetDocId) {
      setSelectedDocId(notif.targetDocId)
    }
    if (notif.targetScreen) {
      setActiveView(notif.targetScreen)
    }
  }

  const selectedDocument =
    documents.find((d) => d.id === selectedDocId) || documents[0]
  const canContribute = actorRole !== 'GUEST'
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

  // Số trên sidebar Admin lấy từ CSDL thật, không phải dữ liệu mẫu
  useEffect(() => {
    if (!isAdminView || !AuthGuard.getAuthToken()) return undefined
    let cancelled = false
    Promise.all([
      listModerationDocuments({ status: 'PENDING', limit: 1 }),
      listReports({ status: 'PENDING', limit: 1 })
    ])
      .then(([docResult, reportResult]) => {
        if (!cancelled) setAdminPendingCount(docResult.pagination.total + reportResult.pagination.total)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isAdminView])

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
      {bannerNotice && (
        <div className="app-notice" role="status">
          <span>{bannerNotice}</span>
        </div>
      )}

      {/* Vùng hiển thị màn hình chính */}
      {isAdminView ? (
        !isAuthorizedAdmin ? (
          /* THẺ TỪ CHỐI TRUY CẬP (ACCESS DENIED CARD) CHO GUEST / STUDENT */
          <div className="platform-container">
            <div className="empty-state-box" style={{ maxWidth: '480px', margin: '48px auto' }}>
              <Lock size={28} style={{ color: 'var(--text-secondary)', marginBottom: '8px' }} />
              <h2 className="section-title">Bạn không có quyền xem trang này</h2>
              <p className="page-sub" style={{ margin: '4px 0 16px' }}>
                Trang này chỉ dành cho quản trị viên.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="btn-solid-primary" onClick={() => handleOpenAuth('login')}>
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
                { id: 'moderation', label: adminPendingCount > 0 ? `Kiểm duyệt (${adminPendingCount})` : 'Kiểm duyệt' },
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
                <ModerationQueue onNotice={showNotice} onPendingCountChange={setAdminPendingCount} />
              )}

              {currentAdminTab === 'courses' && (
                <CourseManagement onNotice={showNotice} />
              )}

              {currentAdminTab === 'dashboard' && (
                <AdminDashboard
                  onSelectDoc={handleSelectDocument}
                  onNavigateTab={handleSelectAdminSubTab}
                />
              )}

              {currentAdminTab === 'users' && (
                <UserManagement
                  users={users}
                  currentUser={userSession}
                  onToggleUserStatus={handleToggleUserStatus}
                  onToggleUserRole={handleToggleUserRole}
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
              onLoginSuccess={handleAuthSuccess}
            />
          )}

          {activeView === 'landing' && (
            <LandingPage
              documents={documents}
              canUpload={canContribute}
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
              onOpenUpload={canContribute ? handleOpenUpload : undefined}
            />
          )}

          {activeView === 'detail' && (
            <DocumentDetail
              documentItem={selectedDocument}
              isAuthenticated={actorRole !== 'GUEST'}
              canBookmark={isStudent}
              canReport={isStudent}
              canComment={isStudent}
              currentUser={userSession}
              isBookmarked={bookmarkedIds.includes(selectedDocument?.id)}
              onBackToDiscovery={() => setActiveView('discovery')}
              onDownload={handleDownloadDocument}
              onToggleBookmark={handleToggleBookmark}
              onRequireLogin={() => handleOpenAuth('login')}
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

          {activeView === 'bounty' && isStudent && (
            <BountyBoard
              currentUser={userSession}
              actorRole={actorRole}
              courses={courses}
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
