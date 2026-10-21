import { ShieldCheck, CheckSquare, RotateCcw } from 'lucide-react'
import { EIGHT_MODERATION_CRITERIA } from '../../data/mockData'

export default function CriteriaChecklist({
  checks = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true },
  onToggleCriterion,
  onCheckAll,
  onResetChecks,
  // Backward compatibility
  adminChecks,
  onToggleAdminCriterion
}) {
  // Normalize checks in case caller passes adminChecks
  const activeChecks = adminChecks
    ? { 1: true, 2: true, 3: true, 4: true, 5: true, ...adminChecks, ...checks }
    : checks

  const handleToggle = (id) => {
    if (onToggleCriterion) {
      onToggleCriterion(id)
    } else if (onToggleAdminCriterion) {
      onToggleAdminCriterion(id)
    }
  }

  const totalPassed = [1, 2, 3, 4, 5, 6, 7, 8].filter((id) => Boolean(activeChecks[id])).length
  const allPassed = totalPassed === 8

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Tiêu đề & Bộ đếm */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={16} style={{ color: 'var(--primary-base)' }} />
          <span>Bảng kiểm 8 Tiêu chí Thẩm định</span>
        </strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className={`status-badge ${allPassed ? 'green' : 'amber'}`}>
            {totalPassed}/8 Đạt chuẩn
          </span>
          {onCheckAll && (
            <button
              type="button"
              onClick={onCheckAll}
              className="btn-ghost"
              style={{ fontSize: '11px', padding: '3px 7px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title="Đánh dấu đạt tất cả 8 tiêu chí"
            >
              <CheckSquare size={12} />
              <span>Chọn tất cả</span>
            </button>
          )}
          {onResetChecks && (
            <button
              type="button"
              onClick={onResetChecks}
              className="btn-ghost"
              style={{ fontSize: '11px', padding: '3px 7px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title="Đặt lại trạng thái kiểm tra"
            >
              <RotateCcw size={12} />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>

      {/* Danh sách 8 tiêu chí hiển thị nhất quán */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {EIGHT_MODERATION_CRITERIA.map((item) => {
          const isChecked = Boolean(activeChecks[item.id])
          return (
            <label
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                backgroundColor: isChecked ? 'var(--blue-1)' : 'var(--bg-surface)',
                border: isChecked ? '1.5px solid var(--primary-base)' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                fontSize: '12.5px',
                lineHeight: 1.4,
                transition: 'all 0.15s ease'
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(item.id)}
                style={{
                  marginTop: '2.5px',
                  width: '15px',
                  height: '15px',
                  accentColor: 'var(--primary-base)',
                  flexShrink: 0,
                  cursor: 'pointer'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '2px' }}>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '12.5px' }}>
                    {item.id}. {item.title}
                  </strong>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: item.type === 'AUTO' ? 'var(--green-2)' : 'var(--slate-3)',
                      color: item.type === 'AUTO' ? 'var(--green-9)' : 'var(--text-secondary)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {item.executor}
                  </span>
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block' }}>
                  {item.rule}
                </span>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
