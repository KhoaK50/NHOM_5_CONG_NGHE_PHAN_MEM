import { useCallback, useEffect, useState } from 'react'

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

// Mặc định theo hệ điều hành, sau khi người dùng chọn thì nhớ trên trình duyệt này
export function useTheme() {
  const [theme, setThemeState] = useState(() => readStoredTheme() || systemTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return undefined
    const onChange = () => {
      if (!readStoredTheme()) setThemeState(systemTheme())
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const setTheme = useCallback((next) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Trình duyệt chặn lưu trữ: theme vẫn đổi trong phiên hiện tại
    }
    setThemeState(next)
  }, [])

  return { theme, setTheme }
}
