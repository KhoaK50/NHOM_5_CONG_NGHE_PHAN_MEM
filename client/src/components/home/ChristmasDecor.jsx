import { useEffect, useState } from 'react'

const SNOWFLAKES = Array.from({ length: 32 }, (_, index) => ({
  '--snow-x': `${(index * 37 + 5) % 100}%`,
  '--snow-size': `${2 + (index % 4)}px`,
  '--snow-duration': `${9 + (index % 7) * 2}s`,
  '--snow-delay': `${-((index * 7) % 23)}s`,
  '--snow-drift': `${(index % 2 ? 1 : -1) * (18 + (index % 5) * 9)}px`,
}))

// Chỉ mount trong hero Noel; không có timer, canvas hay vòng lặp JavaScript.
export default function ChristmasDecor() {
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)

  useEffect(() => {
    const onVisibilityChange = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  return (
    <div className="christmas-scene" aria-hidden="true">
      <div className="christmas-snow" data-paused={!pageVisible}>
        {SNOWFLAKES.map((style, index) => (
          <span key={index} className="christmas-snowflake" style={style} />
        ))}
      </div>
      <svg className="christmas-snowbank" viewBox="0 0 1440 64" preserveAspectRatio="none">
        <path fill="#f7faff" d="M0 26Q120 0 265 30T540 28T830 24T1130 22T1440 24V64H0Z" />
        <path fill="#e8f0ff" d="M0 42Q180 20 355 46T700 42T1075 46T1440 38V64H0Z" />
      </svg>
    </div>
  )
}
