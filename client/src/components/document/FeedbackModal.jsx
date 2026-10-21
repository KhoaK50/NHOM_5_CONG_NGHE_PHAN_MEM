import { useState } from 'react'
import {
  MessageSquare,
  X,
  Sparkles,
  Bug,
  BookOpen,
  HelpCircle,
  Send,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'

const FEEDBACK_CATEGORIES = [
  {
    id: 'FEATURE_REQUEST',
    label: 'Góp ý tính năng mới',
    description: 'Đề xuất cải tiến trải nghiệm người dùng, công cụ hỗ trợ đọc hoặc chia sẻ học liệu.',
    icon: Sparkles,
    color: 'var(--blue-9)'
  },
  {
    id: 'BUG_REPORT',
    label: 'Báo lỗi kỹ thuật',
    description: 'Phản ánh sự cố xem trước PDF, lỗi tải tệp, hiển thị giao diện hoặc hiệu năng.',
    icon: Bug,
    color: 'var(--red-9)'
  },
  {
    id: 'ACADEMIC_SUGGESTION',
    label: 'Đề xuất học liệu & Môn học',
    description: 'Đề xuất bổ sung giáo án mẫu CV 5512, đề thi các môn chuyên ngành Sư phạm Tin.',
    icon: BookOpen,
    color: 'var(--amber-9)'
  },
  {
    id: 'OTHER',
    label: 'Ý kiến đóng góp khác',
    description: 'Mọi thắc mắc hoặc thông điệp gửi tới Ban Điều hành Nền tảng 5share.',
    icon: HelpCircle,
    color: 'var(--slate-9)'
  }
]

export default function FeedbackModal({
  isOpen,
  onClose,
  currentUser,
  onSubmitFeedback
}) {
  const [category, setCategory] = useState('FEATURE_REQUEST')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '')
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    const trimmedEmail = contactEmail.trim()

    if (!trimmedTitle || trimmedTitle.length < 5) {
      setErrorMsg('Vui lòng nhập tiêu đề góp ý rõ ràng (tối thiểu 5 ký tự).')
      return
    }

    if (!trimmedContent || trimmedContent.length < 15) {
      setErrorMsg('Vui lòng mô tả chi tiết nội dung đóng góp của bạn (tối thiểu 15 ký tự).')
      return
    }

    if (!currentUser && (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail))) {
      setErrorMsg('Vui lòng cung cấp email liên hệ hợp lệ để Ban Quản trị phản hồi.')
      return
    }

    setErrorMsg('')

    const payload = {
      id: `fb-${Date.now()}`,
      category,
      categoryLabel: FEEDBACK_CATEGORIES.find((c) => c.id === category)?.label || category,
      title: trimmedTitle,
      content: trimmedContent,
      contactEmail: trimmedEmail || currentUser?.email || 'Chưa cung cấp',
      userId: currentUser?.id || 'guest',
      userName: currentUser?.fullName || 'Khách vãng lai',
      userRole: currentUser?.role || 'GUEST',
      createdAt: new Date().toISOString(),
      status: 'RECEIVED'
    }

    if (onSubmitFeedback) {
      onSubmitFeedback(payload)
    }

    setIsSubmitted(true)
    setTimeout(() => {
      setIsSubmitted(false)
      setTitle('')
      setContent('')
      if (onClose) onClose()
    }, 1800)
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose()
      }}
    >
      <div className="modal-panel" style={{ maxWidth: '540px', padding: '24px 28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--green-3)',
                color: 'var(--green-9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MessageSquare size={18} />
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--green-11)', letterSpacing: '0.04em' }}>
              HÒM THƯ GÓP Ý &amp; PHẢN ÁNH HỆ THỐNG
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '4px'
            }}
            aria-label="Đóng hộp thoại"
          >
            <X size={18} />
          </button>
        </div>

        <h2
          id="feedback-modal-title"
          style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}
        >
          Ý kiến của bạn giúp 5share ngày càng hoàn thiện
        </h2>
        <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          Ban Quản trị Khoa CNTT trân trọng mọi phản ánh về lỗi kỹ thuật, đề xuất tài liệu học tập và sáng kiến trải nghiệm người dùng.
        </p>

        {isSubmitted ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--green-2)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--green-4)',
              margin: '12px 0'
            }}
          >
            <CheckCircle2 size={42} style={{ color: 'var(--green-9)', margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: 'var(--green-12)' }}>
              Cảm ơn đóng góp quý báu của bạn!
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--green-11)' }}>
              Phản ánh đã được chuyển tới Ban Quản trị. Chúng tôi sẽ nghiên cứu và phản hồi sớm nhất qua email.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Báo lỗi validate */}
            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  backgroundColor: 'var(--red-2)',
                  border: '1px solid var(--red-4)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--red-11)',
                  fontSize: '12.5px'
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Nhóm chủ đề đóng góp (4 Categories) */}
            <div>
              <label
                style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}
              >
                Chủ đề đóng góp ý kiến
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {FEEDBACK_CATEGORIES.map((cat) => {
                  const IconComponent = cat.icon
                  const isSelected = category === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${isSelected ? 'var(--blue-9)' : 'var(--border-subtle)'}`,
                        backgroundColor: isSelected ? 'var(--blue-3)' : 'var(--bg-surface)',
                        color: isSelected ? 'var(--blue-12)' : 'var(--text-primary)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <IconComponent size={16} style={{ color: cat.color, marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>{cat.label}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tiêu đề góp ý */}
            <div>
              <label
                htmlFor="feedback-title"
                style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}
              >
                Tiêu đề ngắn gọn <span style={{ color: 'var(--danger-base)' }}>*</span>
              </label>
              <input
                id="feedback-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Đề xuất thêm tính năng đánh dấu trang khi đọc PDF..."
                maxLength={120}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-strong)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-ui)',
                  outline: 'none',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Nội dung chi tiết */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label
                  htmlFor="feedback-content"
                  style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}
                >
                  Nội dung phản ánh chi tiết <span style={{ color: 'var(--danger-base)' }}>*</span>
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{content.length}/1000</span>
              </div>
              <textarea
                id="feedback-content"
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Mô tả cụ thể ý tưởng của bạn hoặc các bước tái hiện nếu bạn gặp sự cố kỹ thuật..."
                maxLength={1000}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-strong)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-ui)',
                  outline: 'none',
                  resize: 'vertical',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Email liên hệ */}
            <div>
              <label
                htmlFor="feedback-email"
                style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}
              >
                Email nhận phản hồi {currentUser ? '(Đã tự động điền)' : '(Bắt buộc để nhận giải đáp)'}
              </label>
              <input
                id="feedback-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="ten.nguyenvana@hcmue.edu.vn"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-strong)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-ui)',
                  outline: 'none',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Nút hành động */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="btn-solid-primary"
                style={{ padding: '8px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Send size={14} />
                <span>Gửi đóng góp</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
