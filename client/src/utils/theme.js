import { useCallback, useEffect, useState } from 'react'
import { getActiveSeason } from '../seasons/seasons'

const STORAGE_KEY = '5share_theme'
const META_COLOR = { light: '#ffffff', dark: '#16202a' }

function readStoredTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme])
}

// Trong giao diện theo dịp chỉ có nền sáng, nút chuyển sáng/tối được ẩn
export function isThemeLocked() {
  return Boolean(getActiveSeason())
}

// Mặc định theo hệ điều hành, sau khi người dùng chọn thì nhớ trên trình duyệt này
export function useTheme() {
  const locked = isThemeLocked()
  const [theme, setThemeState] = useState(() =>
    locked ? 'light' : readStoredTheme() || systemTheme()
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (locked) return undefined
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return undefined
    const onChange = () => {
      if (!readStoredTheme()) setThemeState(systemTheme())
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [locked])

  const setTheme = useCallback(
    (next) => {
      // Đang trong dịp: không đổi và không ghi đè lựa chọn đã lưu
      if (locked) return
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Trình duyệt chặn lưu trữ: theme vẫn đổi trong phiên hiện tại
      }
      setThemeState(next)
    },
    [locked]
  )

  return { theme, setTheme, locked }
}
