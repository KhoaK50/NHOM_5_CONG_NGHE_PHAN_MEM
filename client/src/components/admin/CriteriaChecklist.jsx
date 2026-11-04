import { Check, X } from 'lucide-react'
import { AUTO_CRITERIA, MANUAL_CRITERIA } from '../../utils/documentCourseApi'

const sectionLabelStyle = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-secondary)'
}

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px',
  color: 'var(--text-primary)'
}

export default function CriteriaChecklist({ autoChecks = {}, checks = {}, onToggleCriterion }) {
  const passedAuto = AUTO_CRITERIA.filter((item) => autoChecks[item.key]).length
  const passedManual = MANUAL_CRITERIA.filter((item) => checks[item.key]).length
  const totalPassed = passedAuto + passedManual

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <strong style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Bảng kiểm 8 tiêu chí</strong>
        <span className={`status-badge ${totalPassed === 8 ? 'green' : 'amber'}`}>{totalPassed}/8 đạt</span>
      </div>

      <span style={sectionLabelStyle}>Hệ thống đã kiểm tra</span>
      {AUTO_CRITERIA.map((item) => {
        const passed = Boolean(autoChecks[item.key])
        return (
          <div key={item.key} style={rowStyle} title={item.hint}>
            {passed ? (
              <Check size={16} style={{ color: 'var(--status-green)', flexShrink: 0 }} />
            ) : (
              <X size={16} style={{ color: 'var(--status-red)', flexShrink: 0 }} />
            )}
            <span>{passed ? item.title : `${item.title}: không đạt, cần từ chối`}</span>
          </div>
        )
      })}

      <span style={{ ...sectionLabelStyle, marginTop: '4px' }}>Bạn xác nhận sau khi đọc</span>
      {MANUAL_CRITERIA.map((item) => (
        <label key={item.key} style={{ ...rowStyle, cursor: 'pointer' }} title={item.hint}>
          <input
            type="checkbox"
            checked={Boolean(checks[item.key])}
            onChange={() => onToggleCriterion(item.key)}
            style={{ width: '16px', height: '16px', accentColor: 'var(--primary-base)', flexShrink: 0, cursor: 'pointer' }}
          />
          <span>{item.title}</span>
        </label>
      ))}
    </div>
  )
}
