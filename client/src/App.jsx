import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  ShieldAlert,
  BookOpen,
  BarChart3,
  ArrowLeft,
  ShieldCheck,
  Users,
  Lock,
  MessageSquarePlus
} from 'lucide-react'
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
import MyDocuments from './components/profile/MyDocuments'
import SavedBookmarks from './components/profile/SavedBookmarks'
import UserProfile from './components/profile/UserProfile'
import BountyBoard from './components/bounty/BountyBoard'
import { getGuestDownloadStats, recordGuestDownload } from './utils/downloadTracker'
import { AuthGuard, getApiBaseUrl } from './utils/authGuard'
import {
  INITIAL_COURSES,
  INITIAL_DOCUMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_REPORTS,
  INITIAL_BOUNTIES,
  INITIAL_DOWNLOAD_HISTORY,
  INITIAL_USERS,
  INITIAL_FEEDBACKS
} from './data/mockData'

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
      if (params.get('verify_token') || params.get('reset_token')) {
        return 'auth'
      }
    }
    return 'landing'
  })
  const [authTab, setAuthTab] = useState('login')
  const [adminSubTab, setAdminSubTab] = useState('dashboard') // 'dashboard' | 'moderation' | 'courses' | 'users'
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  const [courses, setCourses] = useState(INITIAL_COURSES)
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS)
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const [reports, setReports] = useState(INITIAL_REPORTS)
  const [users, setUsers] = useState(INITIAL_USERS)
  const [feedbacks, setFeedbacks] = useState(INITIAL_FEEDBACKS)
  const [bounties, setBounties] = useState(INITIAL_BOUNTIES)
  const [downloadHistory, setDownloadHistory] = useState(INITIAL_DOWNLOAD_HISTORY)
  const [bookmarkedIds, setBookmarkedIds] = useState(['doc-1', 'doc-2', 'doc-4'])
  const [selectedDocId, setSelectedDocId] = useState('doc-1')
  const [bannerNotice, setBannerNotice] = useState(null)
  const [studentPoints, setStudentPoints] = useState(140)
  const [userRatingsByDoc, setUserRatingsByDoc] = useState({
    'doc-1:dat': 5,
    'doc-1:danh': 5,
    'doc-2:tram': 5
  })

  const [userSession, setUserSession] = useState(() => {
    const saved = AuthGuard.getSavedUserProfile()
    if (saved && AuthGuard.getAuthToken()) {
      return saved
    }
    return null
  })

  const showNotice = (text) => {
    setBannerNotice(text)
    setTimeout(() => {
      setBannerNotice(null)
    }, 4500)
  }

  const fetchAdminUsersList = (authToken) => {
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
  }

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
  }, [])

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
      setIsFeedbackOpen(true)
      return
    }
    if (view === 'admin') {
      setActiveView('admin')
      return
    }
    if (actorRole === 'GUEST' && ['upload', 'my-docs', 'bookmarks', 'profile'].includes(view)) {
      handleOpenAuth('login')
      return
    }
    if (view === 'upload' && isCurrentUserLocked) {
      showNotice('Tài khoản của bạn đang bị tạm khóa. Không thể thực hiện đóng góp học liệu.')
      return
    }
    setActiveView(view)
    try {
      window.scrollTo({ top: 0, behavior: 'instant' })
    } catch {
      // ignore
    }
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
    showNotice('Đã đăng xuất khỏi tài khoản. Bạn đang tra cứu học liệu với vai trò Khách vãng lai.')
  }

  const handleSelectDocument = (doc) => {
    setSelectedDocId(doc.id)
    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, viewCount: d.viewCount + 1 } : d))
    )
    setActiveView('detail')
  }

  const handleDownloadDocument = (doc) => {
    if (actorRole === 'GUEST') {
      const stats = getGuestDownloadStats()
      if (stats.isExhausted) {
        showNotice('Khách vãng lai đã dùng hết 3 lượt tải trong ngày. Vui lòng đăng nhập để tải không giới hạn!')
        handleOpenAuth('login')
        return
      }
      recordGuestDownload()
      const nextStats = getGuestDownloadStats()
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, downloadCount: d.downloadCount + 1 } : d))
      )
      showNotice(
        `Đang tải tệp "${doc.fileName}". Khách vãng lai: còn lại ${nextStats.remaining}/3 lượt tải hôm nay.`
      )
      return
    }

    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, downloadCount: d.downloadCount + 1 } : d))
    )

    const newRecord = {
      id: `dl-${Date.now()}`,
      docId: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      format: doc.format || 'pdf',
      downloadedAt: 'Vừa xong'
    }
    setDownloadHistory((prev) => [newRecord, ...prev])
    showNotice(`Đang tải tệp gốc "${doc.fileName}". Đã cập nhật số lượt tải của học liệu.`)
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

  const handleCreateBounty = ({ title, courseCode, courseName, rewardPoints, description }) => {
    if (isCurrentUserLocked) {
      showNotice('Tài khoản của bạn đang bị tạm khóa. Không thể tạo yêu cầu treo thưởng.')
      return
    }
    const pts = Number(rewardPoints) || 50
    const currentPts = userSession?.points ?? studentPoints
    if (currentPts < pts) {
      showNotice(`Số dư điểm (${currentPts} điểm) không đủ để ký quỹ ${pts} điểm thưởng!`)
      return
    }

    const nextPts = currentPts - pts
    setStudentPoints(nextPts)
    setUserSession((prev) => (prev ? { ...prev, points: nextPts } : prev))

    const newBounty = {
      id: `bty-${Date.now()}`,
      title,
      courseCode,
      courseName,
      rewardPoints: pts,
      description,
      status: 'OPEN',
      creatorId: userSession?.id || 'vi',
      creatorName: userSession?.fullName || 'Phan Triệu Vĩ',
      createdAt: 'Vừa xong',
      submissionsCount: 0
    }

    setBounties((prev) => [newBounty, ...prev])
    showNotice(`Đã đăng yêu cầu treo thưởng thành công! Ký quỹ -${pts} điểm thưởng.`)
  }

  const handleFulfillBounty = (bountyId, submittedDocId) => {
    if (isCurrentUserLocked) {
      showNotice('Tài khoản của bạn đang bị tạm khóa. Không thể nộp tài liệu giải thưởng.')
      return
    }
    const targetBounty = bounties.find((b) => b.id === bountyId)
    const targetDoc = documents.find((d) => d.id === submittedDocId)

    setBounties((prev) =>
      prev.map((b) =>
        b.id === bountyId
          ? {
              ...b,
              status: 'FULFILLED',
              fulfilledDocId: submittedDocId,
              fulfilledBy: userSession?.fullName || 'Phan Triệu Vĩ',
              fulfilledAt: 'Vừa xong',
              submissionsCount: (b.submissionsCount || 0) + 1
            }
          : b
      )
    )

    const reward = targetBounty ? targetBounty.rewardPoints : 50
    setStudentPoints((prevPts) => prevPts + reward)
    setUserSession((prevUser) =>
      prevUser ? { ...prevUser, points: (prevUser.points || 0) + reward } : prevUser
    )

    showNotice(
      `Đã nộp học liệu "${targetDoc?.title || 'tài liệu'}" đáp ứng treo thưởng thành công! Nhận +${reward} điểm thưởng.`
    )
  }

  const handleToggleBookmark = (docId) => {
    if (actorRole === 'GUEST') {
      handleOpenAuth('login')
      return
    }
    setBookmarkedIds((prev) => {
      const exists = prev.includes(docId)
      showNotice(
        exists
          ? 'Đã gỡ học liệu khỏi Tủ tài liệu cá nhân.'
          : 'Đã lưu học liệu vào Tủ tài liệu cá nhân.'
      )
      return exists ? prev.filter((id) => id !== docId) : [...prev, docId]
    })
  }

  const handleAddRatingComment = (docId, stars, commentContent) => {
    if (isCurrentUserLocked) {
      showNotice('Tài khoản của bạn đang bị tạm khóa. Không thể gửi đánh giá hoặc bình luận.')
      return
    }
    const currentUserId = userSession?.id || 'vi'
    const currentUserName = userSession?.fullName || 'Phan Triệu Vĩ'
    const ratingKey = `${docId}:${currentUserId}`
    const previousStar = userRatingsByDoc[ratingKey]
    const trimmedComment = (commentContent || '').trim()

    setUserRatingsByDoc((prev) => ({
      ...prev,
      [ratingKey]: stars
    }))

    const targetDoc = documents.find((d) => d.id === docId)

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== docId) return doc

        let nextCount = doc.ratingCount
        let nextAvg
        if (typeof previousStar === 'number' && doc.ratingCount > 0) {
          const totalScore = doc.ratingAvg * doc.ratingCount - previousStar + stars
          nextAvg = Number((totalScore / doc.ratingCount).toFixed(1))
        } else {
          nextCount = doc.ratingCount + 1
          nextAvg = Number(
            ((doc.ratingAvg * doc.ratingCount + stars) / nextCount).toFixed(1)
          )
        }

        let updatedComments = (doc.comments || []).map((c) =>
          c.authorId === currentUserId ? { ...c, rating: stars } : c
        )

        if (trimmedComment) {
          const newComment = {
            id: `cmt-${Date.now()}`,
            authorName: `${currentUserName} (K50 SPTH)`,
            authorId: currentUserId,
            rating: stars,
            createdAt: 'Vừa xong',
            content: trimmedComment
          }
          updatedComments = [newComment, ...updatedComments]
        }

        return {
          ...doc,
          ratingCount: nextCount,
          ratingAvg: nextAvg,
          comments: updatedComments
        }
      })
    )

    if (targetDoc) {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          type: 'COMMENT',
          title: 'Đánh giá & Bình luận học thuật mới',
          message: trimmedComment
            ? `${currentUserName} vừa chấm ${stars}★ và bình luận tại "${targetDoc.title}".`
            : `${currentUserName} vừa chấm ${stars}★ cho học liệu "${targetDoc.title}".`,
          createdAt: 'Vừa xong',
          isRead: false,
          targetDocId: targetDoc.id,
          targetScreen: 'detail'
        },
        ...prev
      ])
    }

    showNotice(
      typeof previousStar === 'number'
        ? `Đã cập nhật mức đánh giá từ ${previousStar}★ thành ${stars}★.`
        : `Đã ghi nhận đánh giá ${stars}★ và gửi thông báo tới tác giả.`
    )
  }

  const handleEditComment = (docId, commentId, newContent) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              comments: (doc.comments || []).map((c) =>
                c.id === commentId ? { ...c, content: newContent, createdAt: 'Đã chỉnh sửa' } : c
              )
            }
          : doc
      )
    )
    showNotice('Đã cập nhật nội dung bình luận của bạn.')
  }

  const handleDeleteComment = (docId, commentId) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId
          ? { ...doc, comments: (doc.comments || []).filter((c) => c.id !== commentId) }
          : doc
      )
    )
    showNotice('Đã xóa bình luận của bạn.')
  }

  const handleSubmitReport = (reportPayload) => {
    const newReport = {
      id: `rep-${Date.now()}`,
      ...reportPayload,
      reporterName: `${userSession?.fullName || 'Sinh viên SPTH'} (K50 SPTH)`,
      createdAt: 'Vừa xong',
      status: 'PENDING'
    }
    setReports((prev) => [newReport, ...prev])
    showNotice('Đã gửi báo cáo chất lượng học liệu về Ban quản trị Khoa CNTT.')
  }

  const handleSubmitNewDocument = (newDocPayload) => {
    if (isCurrentUserLocked) {
      showNotice('Tài khoản của bạn đang bị tạm khóa. Không thể thực hiện đóng góp học liệu.')
      return
    }
    const createdDoc = {
      id: `doc-${Date.now()}`,
      ...newDocPayload,
      uploaderName: userSession?.fullName || 'Phan Triệu Vĩ',
      uploaderId: userSession?.id || 'vi',
      createdAt: '2026-03-20',
      pageCount: 16,
      status: 'PENDING',
      rejectReason: null,
      viewCount: 0,
      downloadCount: 0,
      ratingAvg: 0,
      ratingCount: 0,
      pages: INITIAL_DOCUMENTS[0].pages,
      comments: []
    }
    setDocuments((prev) => [createdDoc, ...prev])
    setCourses((prev) =>
      prev.map((c) =>
        c.code === createdDoc.courseCode
          ? { ...c, documentCount: (c.documentCount || 0) + 1 }
          : c
      )
    )
    setActiveView('my-docs')
    showNotice('Đóng góp thành công! Học liệu đã vượt qua kiểm tra SHA-256 và đang chờ Quản trị viên thẩm định.')
  }

  const handleApproveDocument = (docId) => {
    const target = documents.find((d) => d.id === docId)
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: 'APPROVED', rejectReason: null } : d))
    )
    setStudentPoints((prevPts) => prevPts + 20)
    setUserSession((prevUser) =>
      prevUser && (prevUser.role === 'USER' || prevUser.role === 'STUDENT')
        ? { ...prevUser, points: (prevUser.points || 140) + 20 }
        : prevUser
    )
    if (target) {
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === target.uploaderId || u.fullName === target.uploaderName
            ? { ...u, points: (u.points || 0) + 20 }
            : u
        )
      )
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          type: 'APPROVED',
          title: 'Học liệu được phê duyệt (+20 điểm thưởng)',
          message: `Tài liệu "${target.title}" đã đạt 8/8 tiêu chí kiểm duyệt và được xuất bản công khai.`,
          createdAt: 'Vừa xong',
          isRead: false,
          targetDocId: target.id,
          targetScreen: 'detail'
        },
        ...prev
      ])
    }
    showNotice('Đã phê duyệt xuất bản học liệu, cộng +20 điểm thưởng và gửi thông báo cho tác giả.')
  }

  const handleRejectDocument = (docId, reasonText) => {
    const target = documents.find((d) => d.id === docId)
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, status: 'REJECTED', rejectReason: reasonText } : d
      )
    )
    if (target) {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          type: 'REJECTED',
          title: 'Học liệu cần chỉnh sửa (Bị từ chối phê duyệt)',
          message: `Tài liệu "${target.title}" bị từ chối. Lý do: ${reasonText}`,
          createdAt: 'Vừa xong',
          isRead: false,
          targetDocId: target.id,
          targetScreen: 'my-docs'
        },
        ...prev
      ])
    }
    showNotice('Đã từ chối học liệu và gửi lý do phản hồi chi tiết tới sinh viên đóng góp.')
  }

  const handleResolveReport = (reportId, docId, action, targetType = 'DOCUMENT', commentId = null) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: 'RESOLVED', resolvedAction: action } : r))
    )
    if (targetType === 'COMMENT' || action === 'DELETE_COMMENT') {
      if (commentId) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === docId
              ? { ...d, comments: (d.comments || []).filter((c) => c.id !== commentId) }
              : d
          )
        )
      }
      showNotice('Đã xử lý vi phạm chuẩn mực học thuật đối với bình luận.')
    } else if (action === 'HIDE_DOC') {
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: 'HIDDEN' } : d))
      )
      setBookmarkedIds((prev) => prev.filter((id) => id !== docId))
      showNotice('Đã tạm ẩn học liệu khỏi kho công khai để rà soát nội dung.')
    } else if (action === 'DELETE_DOC') {
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: 'DELETED' } : d))
      )
      setBookmarkedIds((prev) => prev.filter((id) => id !== docId))
      showNotice('Đã gỡ vĩnh viễn tài liệu vi phạm khỏi hệ thống lưu trữ.')
    } else {
      showNotice('Đã đóng báo cáo và giữ nguyên trạng thái xuất bản của tài liệu.')
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

  const handleSubmitFeedback = (feedbackPayload) => {
    setFeedbacks((prev) => [feedbackPayload, ...prev])
    showNotice('Cảm ơn bạn! Đã gửi ý kiến đóng góp thành công tới Ban Quản trị.')
  }

  const handleSaveCourse = (courseObj) => {
    setCourses((prev) => {
      const exists = prev.some((c) => c.id === courseObj.id)
      return exists
        ? prev.map((c) => (c.id === courseObj.id ? courseObj : c))
        : [courseObj, ...prev]
    })
    showNotice(`Đã lưu học phần "${courseObj.code} - ${courseObj.name}" vào danh mục đào tạo.`)
  }

  const handleToggleCourseActive = (courseId) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, isActive: !c.isActive } : c))
    )
    showNotice('Đã cập nhật trạng thái hiển thị của học phần trên bộ lọc tra cứu.')
  }

  const handleDeleteCourse = (courseId) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId))
    showNotice('Đã xóa học phần chưa có tài liệu liên kết khỏi danh mục.')
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
  const pendingDocsCount = documents.filter((d) => d.status === 'PENDING').length
  const pendingReportsCount = reports.filter((r) => r.status === 'PENDING').length
  const totalPendingRequests = pendingDocsCount + pendingReportsCount
  const pendingCount = pendingDocsCount

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
        pendingCount={pendingCount}
        logoVariant="loops-weave"
      />

      {/* Thông báo phản hồi thao tác */}
      {bannerNotice && (
        <div
          style={{
            backgroundColor: 'var(--green-1)',
            borderBottom: '1px solid var(--green-2)',
            color: 'var(--green-7)',
            padding: '10px 28px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{bannerNotice}</span>
        </div>
      )}

      {/* Vùng hiển thị màn hình chính */}
      {isAdminView ? (
        !isAuthorizedAdmin ? (
          /* THẺ TỪ CHỐI TRUY CẬP (ACCESS DENIED CARD) CHO GUEST / STUDENT */
          <div
            style={{
              minHeight: 'calc(100vh - 64px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 16px',
              backgroundColor: 'var(--bg-app)'
            }}
          >
            <div
              style={{
                maxWidth: '520px',
                width: '100%',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xl)',
                padding: '36px 32px',
                textAlign: 'center',
                boxShadow: 'var(--shadow-modal)'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--amber-2)',
                  color: 'var(--amber-9)',
                  border: '1px solid var(--amber-4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px'
                }}
              >
                <Lock size={30} />
              </div>

              <h2
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--text-primary)'
                }}
              >
                Khu vực Yêu cầu Quyền Quản trị viên
              </h2>

              <p
                style={{
                  margin: '0 0 24px 0',
                  fontSize: '13.5px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5
                }}
              >
                Bạn đang đăng nhập với vai trò{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {actorRole === 'GUEST' ? 'Khách vãng lai' : 'Sinh viên'}
                </strong>{' '}
                ({userSession?.fullName || 'Chưa đăng nhập'}). Chỉ tài khoản Quản trị viên thuộc Ban Quản trị Khoa CNTT mới có
                quyền truy cập không gian này.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-solid-primary"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '13.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onClick={() => handleOpenAuth('login')}
                >
                  <ShieldCheck size={16} />
                  <span>Đăng nhập bằng tài khoản Quản trị viên</span>
                </button>

                <button
                  type="button"
                  className="btn-ghost"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onClick={() => setActiveView('discovery')}
                >
                  <ArrowLeft size={16} />
                  <span>Quay lại Kho học liệu</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="admin-workspace-shell">
            {/* Radix Light Left Sidebar cho Admin */}
            <aside className="admin-sidebar" aria-label="Điều hướng Quản trị học thuật">
              <div className="admin-sidebar-brand">
                <div className="admin-sidebar-kicker">
                  <ShieldCheck size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                  5SHARE ADMIN WORKSPACE
                </div>
                <p className="admin-sidebar-title">Quản trị Học liệu Khoa CNTT</p>
              </div>

              <button
                type="button"
                className={`admin-nav-btn ${currentAdminTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleSelectAdminSubTab('dashboard')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                  <BarChart3 size={16} />
                  <span>Tổng quan hệ thống</span>
                </span>
              </button>

              <button
                type="button"
                className={`admin-nav-btn ${currentAdminTab === 'moderation' ? 'active' : ''}`}
                onClick={() => handleSelectAdminSubTab('moderation')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldAlert size={16} />
                  <span>Hàng đợi kiểm duyệt</span>
                </span>
                {totalPendingRequests > 0 && (
                  <span className="admin-nav-badge">{totalPendingRequests}</span>
                )}
              </button>

              <button
                type="button"
                className={`admin-nav-btn ${currentAdminTab === 'courses' ? 'active' : ''}`}
                onClick={() => handleSelectAdminSubTab('courses')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                  <BookOpen size={16} />
                  <span>Quản lý danh mục</span>
                </span>
              </button>

              <button
                type="button"
                className={`admin-nav-btn ${currentAdminTab === 'users' ? 'active' : ''}`}
                onClick={() => handleSelectAdminSubTab('users')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={16} />
                  <span>Quản trị người dùng</span>
                </span>
              </button>

              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  className="admin-nav-btn"
                  onClick={() => setActiveView('discovery')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                    <ArrowLeft size={16} />
                    <span>Quay lại Kho học liệu</span>
                  </span>
                </button>
              </div>
            </aside>

            <main className="admin-workspace-content">
              {currentAdminTab === 'moderation' && (
                <ModerationQueue
                  documents={documents}
                  reports={reports}
                  onApproveDocument={handleApproveDocument}
                  onRejectDocument={handleRejectDocument}
                  onResolveReport={handleResolveReport}
                />
              )}

              {currentAdminTab === 'courses' && (
                <CourseManagement
                  courses={courses}
                  documents={documents}
                  onSaveCourse={handleSaveCourse}
                  onToggleCourseActive={handleToggleCourseActive}
                  onDeleteCourse={handleDeleteCourse}
                />
              )}

              {currentAdminTab === 'dashboard' && (
                <AdminDashboard
                  documents={documents}
                  courses={courses}
                  users={users}
                  reports={reports}
                  feedbacks={feedbacks}
                  downloadHistory={downloadHistory}
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
              logoVariant="loops-weave"
              onLoginSuccess={handleAuthSuccess}
            />
          )}

          {activeView === 'landing' && (
            <LandingPage
              onNavigate={handleNavigate}
              onExploreDiscovery={() => setActiveView('discovery')}
              onOpenUpload={handleOpenUpload}
              userSession={userSession}
              actorRole={actorRole}
            />
          )}

          {activeView === 'discovery' && (
            <DiscoveryPage
              documents={documents}
              courses={courses}
              bookmarkedIds={bookmarkedIds}
              onSelectDoc={handleSelectDocument}
              onToggleBookmark={handleToggleBookmark}
              onOpenUpload={handleOpenUpload}
            />
          )}

          {activeView === 'detail' && (
            <DocumentDetail
              documentItem={selectedDocument}
              isAuthenticated={actorRole !== 'GUEST'}
              currentUser={userSession}
              isBookmarked={bookmarkedIds.includes(selectedDocument?.id)}
              existingReports={reports}
              onBackToDiscovery={() => setActiveView('discovery')}
              onDownload={handleDownloadDocument}
              onToggleBookmark={handleToggleBookmark}
              onAddRatingComment={handleAddRatingComment}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
              onSubmitReport={handleSubmitReport}
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
              documents={documents}
              currentUser={userSession}
              onSelectDoc={handleSelectDocument}
              onOpenUpload={handleOpenUpload}
            />
          )}

          {activeView === 'bookmarks' && (
            <SavedBookmarks
              documents={documents}
              bookmarkedIds={bookmarkedIds}
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
              bookmarkedIds={bookmarkedIds}
              downloadHistory={downloadHistory}
              onSelectDoc={handleSelectDocument}
              onToggleBookmark={handleToggleBookmark}
              onOpenUpload={handleOpenUpload}
              onUpdateProfile={handleUpdateProfile}
              onChangePassword={handleChangePassword}
              onNavigateDiscovery={() => setActiveView('discovery')}
            />
          )}

          {activeView === 'bounty' && (
            <BountyBoard
              currentUser={userSession}
              actorRole={actorRole}
              courses={courses}
              documents={documents}
              bounties={bounties}
              onCreateBounty={handleCreateBounty}
              onFulfillBounty={handleFulfillBounty}
              onSelectDoc={handleSelectDocument}
              onOpenUpload={handleOpenUpload}
              onRequireLogin={() => handleOpenAuth('login')}
            />
          )}
        </main>
      )}

      {/* MODAL HÒM THƯ GÓP Ý HỆ THỐNG TOÀN CỤC */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        currentUser={userSession}
        onSubmitFeedback={handleSubmitFeedback}
      />

      {/* NÚT NỔI GÓP Ý HỆ THỐNG TẠI GÓC PHẢI MÀN HÌNH (FLOATING PILL) */}
      <button
        type="button"
        onClick={() => setIsFeedbackOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 100,
          backgroundColor: '#ffffff',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-strong)',
          borderRadius: '999px',
          padding: '9px 16px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12.5px',
          fontWeight: 700,
          boxShadow: 'var(--shadow-card)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'var(--shadow-card)'
        }}
        aria-label="Mở hòm thư góp ý hệ thống"
      >
        <MessageSquarePlus size={16} style={{ color: 'var(--green-9)' }} />
        <span>Góp ý & Báo lỗi</span>
      </button>
    </div>
  )
}