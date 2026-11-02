import { Check, Lock, ShieldCheck } from 'lucide-react'
import { AUTO_CRITERIA, MANUAL_CRITERIA } from '../../utils/documentCourseApi'

const sectionLabelStyle = {
  fontSize: '10.5px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase'
}

const rowTextStyle = { display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, minWidth: 0 }

function CriterionText({ title, hint }) {
  return (
    <div style={rowTextStyle}>
      <strong style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</strong>
      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{hint}</span>
    </div>
  )
}

export default function CriteriaChecklist({ autoChecks = {}, checks = {}, onToggleCriterion }) {
  const passedAuto = AUTO_CRITERIA.filter((item) => autoChecks[item.key]).length
  const passedManual = MANUAL_CRITERIA.filter((item) => checks[item.key]).length
  const totalPassed = passedAuto + passedManual

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={15} style={{ color: 'var(--primary-base)' }} />
          <span>Bảng kiểm 8 tiêu chí</span>
        </strong>
        <span className={`status-badge ${totalPassed === 8 ? 'green' : 'amber'}`}>{totalPassed}/8 đạt</span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={8}
        aria-valuenow={totalPassed}
        aria-label="Số tiêu chí đã đạt"
        style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-hover)', overflow: 'hidden' }}
      >
        <div
          style={{
            height: '100%',
            width: `${(totalPassed / 8) * 100}%`,
            borderRadius: '3px',
            backgroundColor: totalPassed === 8 ? 'var(--green-9)' : 'var(--primary-base)',
            transition: 'width 0.2s ease'
          }}
        />
      </div>

      <span style={sectionLabelStyle}>Hệ thống đã kiểm tra</span>
      {AUTO_CRITERIA.map((item) => {
        const passed = Boolean(autoChecks[item.key])
        return (
          <div
            key={item.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '8px 10px',
              borderRadius: '8px',
              backgroundColor: passed ? 'var(--green-2)' : 'var(--red-3)',
              border: `1px solid ${passed ? 'var(--green-6)' : 'var(--red-6)'}`
            }}
          >
            <Lock size={14} style={{ color: passed ? 'var(--green-11)' : 'var(--red-11)', flexShrink: 0 }} />
            <CriterionText title={item.title} hint={passed ? item.hint : 'Không đạt: tài liệu cần được từ chối để tác giả bổ sung'} />
            {passed && <Check size={15} style={{ color: 'var(--green-9)', flexShrink: 0 }} />}
          </div>
        )
      })}

      <span style={sectionLabelStyle}>Quản trị viên xác nhận sau khi đọc</span>
      {MANUAL_CRITERIA.map((item) => {
        const isChecked = Boolean(checks[item.key])
        return (
          <label
            key={item.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '8px 10px',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: isChecked ? 'var(--blue-2)' : 'var(--bg-surface)',
              border: `1px solid ${isChecked ? 'var(--primary-base)' : 'var(--border-subtle)'}`,
              transition: 'all 0.15s ease'
            }}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggleCriterion(item.key)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--primary-base)', flexShrink: 0, cursor: 'pointer' }}
            />
            <CriterionText title={item.title} hint={item.hint} />
          </label>
        )
      })}
    </div>
  )
}
