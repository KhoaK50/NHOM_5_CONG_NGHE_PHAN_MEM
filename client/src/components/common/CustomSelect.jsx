import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Dropdown tùy biến đồng bộ chuẩn UI/UX 5share (thay thế thẻ select mặc định của trình duyệt)
 */
export default function CustomSelect({
  id,
  name,
  label,
  value,
  options = [],
  onChange,
  disabled = false,
  className = '',
  style,
  triggerStyle,
  placeholder = 'Chọn một mục...',
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedby
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const normalizedOptions = options.map((opt) =>
    typeof opt === 'string' || typeof opt === 'number'
      ? { value: String(opt), label: String(opt) }
      : { value: String(opt.value), label: String(opt.label) }
  )

  const stringVal = value != null ? String(value) : ''
  const currentOption = normalizedOptions.find((opt) => opt.value === stringVal)

  useEffect(() => {
    if (!open) return undefined
    const closeOutside = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }
    const closeEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('keydown', closeEscape)
    }
  }, [open])

  const select = (val) => {
    const orig = options.find((opt) => (typeof opt === 'object' && opt !== null ? String(opt.value) === val : String(opt) === val))
    const returnedVal = typeof orig === 'object' && orig !== null ? orig.value : orig !== undefined ? orig : val
    if (typeof onChange === 'function') {
      onChange(returnedVal)
    }
    setOpen(false)
  }

  const displayLabel = currentOption ? currentOption.label : placeholder

  return (
    <div className={`custom-filter-dropdown ${className}`} ref={wrapRef} style={style}>
      <button
        id={id}
        name={name}
        type="button"
        disabled={disabled}
        className={`filter-select custom-filter-trigger ${open ? 'is-open' : ''}`}
        aria-label={label || ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        style={triggerStyle}
      >
        <span title={displayLabel}>{displayLabel}</span>
        <ChevronDown size={15} aria-hidden="true" className={`dropdown-chevron ${open ? 'rotated' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="custom-filter-popover" role="listbox" aria-label={label || ariaLabel}>
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === stringVal
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`custom-filter-option ${isSelected ? 'is-selected' : ''}`}
                onClick={() => select(opt.value)}
              >
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
