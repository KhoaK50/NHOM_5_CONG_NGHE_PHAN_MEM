import RequiredMark from '../common/RequiredMark'
import CustomSelect from '../common/CustomSelect'
import { useState } from 'react'
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
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
  onToggleUserRole,
  onNotice
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

  // Thông báo dùng chung của hệ thống
  const setBannerNotice = (text) => onNotice?.(text)

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
  const handleConfirmLock = async (e) => {
    e.preventDefault()
    if (!lockReason.trim()) {
      setLockError('Vui lòng nhập hoặc chọn lý do khóa tài khoản.')
      return
    }
    // App báo kết quả sau khi máy chủ phản hồi, không báo thành công trước
    await toggleUser?.(lockingUser.id, lockReason.trim())
    setLockingUser(null)
    setLockReason('')
    setLockError('')
  }

  // Xác nhận mở khóa
  const handleConfirmUnlock = async () => {
    if (unlockingUser) {
      await toggleUser?.(unlockingUser.id, null)
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
          <h1 className="page-title">Người dùng</h1>
          <p className="page-sub">
            {totalCount} tài khoản · {activeCount} đang hoạt động · {lockedCount} đã khóa
          </p>
        </div>
      </div>

      {/* Thanh tìm kiếm & Bộ lọc */}
      <div
        style={{
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
          className="season-field-box"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: '8px',
            padding: '8px 12px',
            flex: '1 1 300px',
            minWidth: 'min(240px, 100%)'
          }}
        >
          <Search size={15} style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            aria-label="Tìm người dùng"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo họ tên, email hoặc MSSV"
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
              aria-label="Xóa từ khóa tìm người dùng"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Lọc theo Vai trò & Trạng thái */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <CustomSelect
            aria-label="Lọc theo vai trò"
            value={roleFilter}
            options={[
              { value: 'ALL', label: 'Tất cả vai trò' },
              { value: 'STUDENT', label: 'Sinh viên' },
              { value: 'ADMIN', label: 'Quản trị viên' }
            ]}
            onChange={setRoleFilter}
            style={{ minWidth: '140px' }}
            triggerStyle={{ height: '34px', fontSize: '12.5px' }}
          />

          <CustomSelect
            aria-label="Lọc theo trạng thái"
            value={statusFilter}
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: 'ACTIVE', label: 'Hoạt động bình thường' },
              { value: 'LOCKED', label: 'Đã khóa tài khoản' }
            ]}
            onChange={setStatusFilter}
            style={{ minWidth: '170px' }}
            triggerStyle={{ height: '34px', fontSize: '12.5px' }}
          />

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
        <table className="data-table user-data-table">
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>MSSV · Khóa</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
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
                const isRoot =
                  Boolean(user.isRootAdmin) ||
                  String(user.email || '').toLowerCase() === 'sc3.nguyentrandangkhoa@gmail.com'
                const isProtected = isCurrent || isRoot

                return (
                  <tr key={user.id}>
                    {/* Người dùng: Avatar + Tên + Email */}
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {user.fullName}
                        {isCurrent && (
                          <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '6px' }}>
                            (bạn)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.email}</div>
                    </td>

                    {/* MSSV / Khóa */}
                    <td>
                      {user.studentId || 'Chưa cập nhật'} · {user.cohort || 'Sư phạm Tin'}
                    </td>

                    {/* Vai trò */}
                    <td>
                      {isRoot ? 'Quản trị viên gốc' : isAdmin ? 'Quản trị viên' : 'Sinh viên'}
                    </td>

                    {/* Trạng thái */}
                    <td>
                      {user.isActive ? (
                        <span className="status-badge green">
                          Hoạt động
                        </span>
                      ) : (
                        <span
                          className="status-badge red"
                          title={user.lockReason ? `Lý do: ${user.lockReason}` : 'Tài khoản đang bị khóa'}
                        >
                          Đã khóa
                        </span>
                      )}
                    </td>

                    {/* Thao tác Phân quyền & Khóa / Mở khóa */}
                    <td>
                      <div className="user-table-actions">
                        {onToggleUserRole && (
                          <button
                            type="button"
                            disabled={isProtected}
                            onClick={async () => {
                              const nextRole = isAdmin ? 'STUDENT' : 'ADMIN'
                              const changed = await onToggleUserRole(user.id, nextRole)
                              if (!changed) return
                              setBannerNotice(
                                nextRole === 'ADMIN'
                                  ? `Đã thăng quyền Quản trị viên cho "${user.fullName}".`
                                  : `Đã chuyển vai trò của "${user.fullName}" về Sinh viên.`
                              )
                            }}
                            title={
                              isRoot
                                ? 'Tài khoản Quản trị viên gốc của hệ thống được bảo vệ'
                                : isCurrent
                                ? 'Không thể tự hạ quyền tài khoản Quản trị đang đăng nhập'
                                : isAdmin
                                ? 'Hạ quyền xuống Sinh viên'
                                : 'Thăng cấp thành Quản trị viên'
                            }
                            className="table-action"
                          >
                            {isAdmin ? 'Hạ về Sinh viên' : 'Cấp quyền Admin'}
                          </button>
                        )}

                        {user.isActive ? (
                          <button
                            type="button"
                            disabled={isProtected}
                            onClick={() => handleOpenLockModal(user)}
                            title={
                              isRoot
                                ? 'Tài khoản Quản trị viên gốc không thể bị khóa'
                                : isCurrent
                                ? 'Không thể tự khóa tài khoản của bạn'
                                : 'Khóa tài khoản sinh viên này'
                            }
                            className="table-action danger"
                          >
                            Khóa
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setUnlockingUser(user)}
                            className="table-action"
                          >
                            Mở khóa
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
                  <RequiredMark />
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
                    color: 'var(--text-on-brand)',
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
