import { useState } from 'react'
import {
  Users,
  Search,
  Lock,
  Unlock,
  ShieldCheck,
  GraduationCap,
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Calendar,
  Mail,
  UserCheck,
  UserX,
  Info
} from 'lucide-react'

const QUICK_LOCK_REASONS = [
  'Vi phạm bản quyền học liệu hoặc tài liệu bảo mật',
  'Tải tệp tin sai quy chuẩn hoặc chứa mã độc hại',
  'Bình luận phản cảm, quấy rối hoặc vi phạm văn hóa học đường',
  'Hành vi spam liên tục, lập nhiều tài khoản ảo'
]

export default function UserManagement({
  users = [],
  currentUser = null,
  onToggleUserStatus,
  onToggleUserActive,
  onToggleUserRole
}) {
  const toggleUser = onToggleUserStatus || onToggleUserActive
  // Bộ lọc và tìm kiếm
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL') // 'ALL' | 'STUDENT' | 'ADMIN'
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'ACTIVE' | 'LOCKED'

  // Modal Khóa tài khoản
  const [lockingUser, setLockingUser] = useState(null)
  const [lockReason, setLockReason] = useState('')
  const [lockError, setLockError] = useState('')

  // Modal Mở khóa tài khoản
  const [unlockingUser, setUnlockingUser] = useState(null)

  // Banner thông báo nội bộ
  const [bannerNotice, setBannerNotice] = useState('')

  // Lọc người dùng
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !q ||
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.studentId?.toLowerCase().includes(q)

    const matchesRole =
      roleFilter === 'ALL' ||
      (roleFilter === 'STUDENT' && (u.role === 'STUDENT' || u.role === 'USER')) ||
      (roleFilter === 'ADMIN' && u.role === 'ADMIN')

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.isActive) ||
      (statusFilter === 'LOCKED' && !u.isActive)

    return matchesSearch && matchesRole && matchesStatus
  })

  // Thống kê nhanh
  const totalCount = users.length
  const activeCount = users.filter((u) => u.isActive).length
  const lockedCount = users.filter((u) => !u.isActive).length
  const studentCount = users.filter((u) => u.role === 'STUDENT' || u.role === 'USER').length

  // Xử lý mở modal khóa
  const handleOpenLockModal = (user) => {
    if (user.id === currentUser?.id) {
      setBannerNotice('Không thể tự khóa tài khoản Quản trị viên đang đăng nhập.')
      return
    }
    setLockingUser(user)
    setLockReason(QUICK_LOCK_REASONS[0])
    setLockError('')
  }

  // Xác nhận khóa
  const handleConfirmLock = (e) => {
    e.preventDefault()
    if (!lockReason.trim()) {
      setLockError('Vui lòng nhập hoặc chọn lý do khóa tài khoản.')
      return
    }
    toggleUser?.(lockingUser.id, lockReason.trim())
    setBannerNotice(`Đã khóa tài khoản thành viên "${lockingUser.fullName}". Các quyền đóng góp và tương tác đã bị phong tỏa.`)
    setLockingUser(null)
    setLockReason('')
    setLockError('')
  }

  // Xác nhận mở khóa
  const handleConfirmUnlock = () => {
    if (unlockingUser) {
      toggleUser?.(unlockingUser.id, null)
      setBannerNotice(`Đã mở khóa tài khoản "${unlockingUser.fullName}". Người dùng có thể tiếp tục sử dụng đầy đủ tính năng.`)
      setUnlockingUser(null)
    }
  }

  return (
    <div>
      {/* Tiêu đề trang */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '18px'
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Quản trị Người dùng & Phân quyền (FR-08 / UC10)
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Theo dõi danh sách sinh viên, quản lý quyền truy cập và thực thi chế tài Khóa / Mở khóa tài khoản vi phạm.
          </p>
        </div>
      </div>

      {/* Thông báo thao tác */}
      {bannerNotice && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'var(--green-1)',
            border: '1px solid var(--green-3)',
            color: 'var(--green-12)',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} style={{ color: 'var(--green-9)' }} />
            <span>{bannerNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerNotice('')}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Thẻ thống kê 4 cột */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>TỔNG TÀI KHOẢN</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalCount}</div>
          </div>
          <Users size={22} style={{ color: 'var(--primary-base)' }} />
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>SINH VIÊN SPTH</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--blue-9)' }}>{studentCount}</div>
          </div>
          <GraduationCap size={22} style={{ color: 'var(--blue-9)' }} />
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>ĐANG HOẠT ĐỘNG</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--green-9)' }}>{activeCount}</div>
          </div>
          <UserCheck size={22} style={{ color: 'var(--green-9)' }} />
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>ĐÃ KHÓA (CÁCH LY)</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--red-9)' }}>{lockedCount}</div>
          </div>
          <UserX size={22} style={{ color: 'var(--red-9)' }} />
        </div>
      </div>

      {/* Thanh tìm kiếm & Bộ lọc */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Ô tìm kiếm theo Tên, Email hoặc MSSV */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-muted)',
            border: '1px solid var(--border-strong)',
            borderRadius: '8px',
            padding: '6px 12px',
            flex: '1 1 300px',
            minWidth: '240px'
          }}
        >
          <Search size={15} style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo họ tên, email (@hcmue.edu.vn) hoặc MSSV..."
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              width: '100%',
              color: 'var(--text-primary)'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Lọc theo Vai trò & Trạng thái */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              height: '34px',
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="STUDENT">Sinh viên (User)</option>
            <option value="ADMIN">Quản trị viên (Admin)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: '34px',
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động bình thường</option>
            <option value="LOCKED">Đã khóa tài khoản</option>
          </select>

          {(searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setSearchQuery('')
                setRoleFilter('ALL')
                setStatusFilter('ALL')
              }}
              style={{ height: '34px', padding: '0 10px', fontSize: '12px' }}
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* Bảng danh sách người dùng */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Người dùng</th>
              <th style={{ width: '130px' }}>MSSV / Khóa</th>
              <th style={{ width: '130px' }}>Vai trò</th>
              <th style={{ width: '110px' }}>Điểm thưởng</th>
              <th style={{ width: '120px' }}>Trạng thái</th>
              <th style={{ width: '120px' }}>Ngày tham gia</th>
              <th style={{ width: '140px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Users size={32} style={{ color: 'var(--text-tertiary)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Không tìm thấy người dùng phù hợp</span>
                    <span style={{ fontSize: '12px' }}>Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc đặt lại bộ lọc.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const isAdmin = user.role === 'ADMIN'
                const isCurrent = user.id === currentUser?.id

                return (
                  <tr key={user.id}>
                    {/* Người dùng: Avatar + Tên + Email */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: isAdmin ? 'var(--blue-9)' : 'var(--slate-8)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            flexShrink: 0
                          }}
                        >
                          {user.avatarInitials || user.fullName?.slice(0, 2).toUpperCase() || 'SV'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {user.fullName}
                            {isCurrent && (
                              <span style={{ fontSize: '11px', color: 'var(--primary-base)', marginLeft: '6px' }}>
                                (Bạn)
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={11} />
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* MSSV / Khóa */}
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {user.studentId || 'Chưa cập nhật'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        {user.cohort || 'Sư phạm Tin'}
                      </div>
                    </td>

                    {/* Vai trò */}
                    <td>
                      {isAdmin ? (
                        <span className="status-badge blue">
                          <ShieldCheck size={12} /> Quản trị viên
                        </span>
                      ) : (
                        <span className="status-badge slate">
                          <GraduationCap size={12} /> Sinh viên
                        </span>
                      )}
                    </td>

                    {/* Điểm thưởng */}
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: 'var(--amber-11)' }}>
                        <Award size={13} style={{ color: 'var(--amber-9)' }} />
                        <span>{user.points || 0}</span>
                      </div>
                    </td>

                    {/* Trạng thái */}
                    <td>
                      {user.isActive ? (
                        <span className="status-badge green">
                          <CheckCircle2 size={12} /> Hoạt động
                        </span>
                      ) : (
                        <span
                          className="status-badge red"
                          title={user.lockReason ? `Lý do: ${user.lockReason}` : 'Tài khoản đang bị khóa'}
                        >
                          <Lock size={12} /> Đã khóa
                        </span>
                      )}
                    </td>

                    {/* Ngày tạo */}
                    <td>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        <span>{user.createdAt ? user.createdAt.split('T')[0] : '2026-02-01'}</span>
                      </div>
                    </td>

                    {/* Thao tác Phân quyền & Khóa / Mở khóa */}
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {onToggleUserRole && (
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => {
                              const nextRole = isAdmin ? 'STUDENT' : 'ADMIN'
                              onToggleUserRole(user.id, nextRole)
                              setBannerNotice(
                                nextRole === 'ADMIN'
                                  ? `Đã thăng quyền Quản trị viên (ADMIN) cho "${user.fullName}".`
                                  : `Đã chuyển vai trò của "${user.fullName}" về Sinh viên (STUDENT).`
                              )
                            }}
                            title={
                              isCurrent
                                ? 'Không thể tự hạ quyền tài khoản Quản trị đang đăng nhập'
                                : isAdmin
                                ? 'Hạ quyền xuống Sinh viên'
                                : 'Thăng cấp thành Quản trị viên'
                            }
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              borderRadius: '6px',
                              border: '1px solid var(--blue-3)',
                              backgroundColor: isCurrent ? 'var(--bg-muted)' : 'var(--blue-1)',
                              color: isCurrent ? 'var(--text-tertiary)' : 'var(--blue-11)',
                              fontWeight: 600,
                              cursor: isCurrent ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              opacity: isCurrent ? 0.6 : 1
                            }}
                          >
                            <ShieldCheck size={13} />
                            <span>{isAdmin ? 'Hạ SV' : 'Cấp Admin'}</span>
                          </button>
                        )}

                        {user.isActive ? (
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => handleOpenLockModal(user)}
                            title={isCurrent ? 'Không thể tự khóa tài khoản của bạn' : 'Khóa tài khoản sinh viên này'}
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              borderRadius: '6px',
                              border: '1px solid var(--red-2)',
                              backgroundColor: isCurrent ? 'var(--bg-muted)' : 'var(--red-1)',
                              color: isCurrent ? 'var(--text-tertiary)' : 'var(--red-9)',
                              fontWeight: 600,
                              cursor: isCurrent ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              opacity: isCurrent ? 0.6 : 1
                            }}
                          >
                            <Lock size={13} />
                            <span>Khóa</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setUnlockingUser(user)}
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              borderRadius: '6px',
                              border: '1px solid var(--green-2)',
                              backgroundColor: 'var(--green-1)',
                              color: 'var(--green-11)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Unlock size={13} />
                            <span>Mở khóa</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Thông tin cưỡng chế hệ thống (System Enforcement Notice) */}
      <div
        style={{
          marginTop: '20px',
          padding: '14px 18px',
          borderRadius: '10px',
          backgroundColor: 'var(--blue-1)',
          border: '1px solid var(--blue-3)',
          color: 'var(--blue-12)',
          fontSize: '12.5px',
          lineHeight: 1.55,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}
      >
        <Info size={18} style={{ color: 'var(--blue-9)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: 'var(--blue-11)', display: 'block', marginBottom: '3px' }}>
            Quy chuẩn Cưỡng chế Hệ thống đối với Tài khoản Đã khóa (System Enforcement)
          </strong>
          Khi Quản trị viên chuyển trạng thái tài khoản sang <strong>&quot;Đã khóa&quot; (<code>isActive = false</code>)</strong>:
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li><strong>Chặn đóng góp học liệu:</strong> Không thể tải lên tệp tin PDF/DOCX/PPTX mới (bị chặn ngay tại tầng kiểm định).</li>
            <li><strong>Chặn bình luận &amp; đánh giá:</strong> Không thể chấm sao hay gửi nhận xét học thuật tại các trang học liệu.</li>
            <li><strong>Phong tỏa Treo thưởng (Study Bounty):</strong> Không thể tạo yêu cầu treo thưởng mới hoặc nộp tài liệu để nhận điểm thưởng.</li>
            <li><strong>Chặn đăng nhập phiên mới:</strong> Bị từ chối xác thực với thông báo vi phạm chuẩn mực học thuật.</li>
          </ul>
        </div>
      </div>

      {/* Modal Xác nhận Khóa tài khoản */}
      {lockingUser && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Xác nhận khóa tài khoản">
          <div className="modal-panel" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="status-badge red">
                <XCircle size={13} />
                <span>Khóa tài khoản sinh viên</span>
              </span>
              <button
                type="button"
                onClick={() => setLockingUser(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800 }}>
              Khóa tài khoản của {lockingUser.fullName}?
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Email: <strong>{lockingUser.email}</strong> • MSSV: {lockingUser.studentId || 'N/A'}
            </p>

            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--amber-1)',
                border: '1px solid var(--amber-3)',
                color: 'var(--amber-12)',
                fontSize: '12px',
                marginBottom: '14px',
                display: 'flex',
                gap: '8px'
              }}
            >
              <AlertTriangle size={16} style={{ color: 'var(--amber-9)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                Tài khoản bị khóa sẽ lập tức bị tước quyền tải lên tài liệu, gửi bình luận học thuật và tham gia Treo thưởng.
              </div>
            </div>

            <form onSubmit={handleConfirmLock} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                  Chọn nhanh lý do khóa tài khoản:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {QUICK_LOCK_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setLockReason(reason)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: lockReason === reason ? '1.5px solid var(--primary-base)' : '1px solid var(--border-subtle)',
                        backgroundColor: lockReason === reason ? 'var(--blue-1)' : 'var(--bg-muted)',
                        color: lockReason === reason ? 'var(--blue-12)' : 'var(--text-primary)',
                        fontSize: '12px',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                  Chi tiết lý do ghi nhận vào hồ sơ kiểm duyệt:
                </label>
                <textarea
                  rows={3}
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="Nhập lý do chi tiết để sinh viên nắm rõ và khiếu nại nếu cần..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '12.5px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {lockError && (
                <div style={{ color: 'var(--red-9)', fontSize: '12px', fontWeight: 600 }}>
                  {lockError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setLockingUser(null)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--red-9)',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Xác nhận khóa tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Mở khóa tài khoản */}
      {unlockingUser && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Xác nhận mở khóa tài khoản">
          <div className="modal-panel" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="status-badge green">
                <CheckCircle2 size={13} />
                <span>Mở khóa tài khoản</span>
              </span>
              <button
                type="button"
                onClick={() => setUnlockingUser(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 800 }}>
              Mở khóa tài khoản cho {unlockingUser.fullName}?
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Tài khoản <strong>&quot;{unlockingUser.fullName}&quot;</strong> ({unlockingUser.email}) sẽ được phục hồi toàn bộ quyền sinh viên: tải lên tài liệu học thuật, bình luận trao đổi và tham gia Treo thưởng.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setUnlockingUser(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-solid-primary"
                onClick={handleConfirmUnlock}
              >
                Xác nhận mở khóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
