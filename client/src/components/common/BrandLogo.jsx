import { useId } from 'react'

/**
 * BrandLogo - 5Share Official Brand Identity Lockup
 * Google Drive–Style Layered Ribbon Loops + Upright '5share' Wordmark
 *
 * Visual System:
 * - Left Icon Mark: Two interlocking geometric ribbon loops that weave over and under each other
 *   using smooth directional gradient shading at the intersection folds (Google Drive ribbon planes).
 *   Zero noisy white gap strokes, zero heavy drop shadows, 100% transparent background.
 *   - Left Loop: Radix Sapphire / Cobalt scale (#0a2a66 -> #004da6 -> #007fe6 -> #0090ff)
 *   - Right Loop: Radix Indigo to Electric Cyan scale (#07224f -> #005dbf -> #0099ff -> #00c7fe)
 * - Right Wordmark: Clean, upright modern sans-serif typography in Be Vietnam Pro Bold (700)
 *   in Radix slate-12 (#11181c), optically aligned on the exact horizontal midline.
 *
 * @param {Object} props
 * @param {number} [props.size=36] - Height of the icon mark in pixels (optical range: 24px - 48px)
 * @param {boolean} [props.showWordmark=true] - Whether to display the '5share' wordmark text
 * @param {string} [props.className=''] - Optional outer container CSS classes
 */
export default function BrandLogo({
  size = 36,
  showWordmark = true,
  className = ''
}) {
  // Unique gradient ID prefix to prevent collision when multiple BrandLogos are rendered
  const id = useId().replace(/:/g, '')

  // Proportional font size and gap for optical balance with icon mark
  const fontSize = Math.round(size * 0.61) // e.g. size 36 -> 22px
  const gap = Math.max(8, Math.round(size * 0.32)) // e.g. size 36 -> 12px

  return (
    <div
      className={`brand-logo-wrap inline-flex items-center select-none ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${gap}px`,
        userSelect: 'none',
        lineHeight: 1,
        textDecoration: 'none'
      }}
      aria-label="5Share - Nền tảng chia sẻ học liệu Sư phạm Tin học"
    >
      {/* Google Drive-Style Interlocking Ribbon Loops Mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          {/* Left Loop: Sapphire Navy to Luminous Blue-9 */}
          <linearGradient
            id={`${id}-left`}
            x1="10"
            y1="36"
            x2="26"
            y2="12"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#0a2a66" />
            <stop offset="28%" stopColor="#004da6" />
            <stop offset="70%" stopColor="#007fe6" />
            <stop offset="100%" stopColor="#0090ff" />
          </linearGradient>

          {/* Right Loop: Deep Indigo to Vivid Electric Cyan */}
          <linearGradient
            id={`${id}-right`}
            x1="22"
            y1="12"
            x2="38"
            y2="36"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#07224f" />
            <stop offset="28%" stopColor="#005dbf" />
            <stop offset="70%" stopColor="#0099ff" />
            <stop offset="100%" stopColor="#00c7fe" />
          </linearGradient>

          {/* Top Fold Crease: Directional contact shadow at underpass */}
          <linearGradient
            id={`${id}-crease-top`}
            x1="26"
            y1="13"
            x2="22"
            y2="17"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#020c1e" stopOpacity="0.42" />
            <stop offset="60%" stopColor="#020c1e" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#020c1e" stopOpacity="0" />
          </linearGradient>

          {/* Bottom Fold Crease: Directional contact shadow at underpass */}
          <linearGradient
            id={`${id}-crease-bottom`}
            x1="22"
            y1="35"
            x2="26"
            y2="31"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#020c1e" stopOpacity="0.42" />
            <stop offset="60%" stopColor="#020c1e" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#020c1e" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 1. Right Loop Base (Center: 30, 24, R=11, Stroke=5) */}
        <circle
          cx="30"
          cy="24"
          r="11"
          stroke={`url(#${id}-right)`}
          strokeWidth="5"
        />

        {/* 2. Top Fold Crease on Right Loop (before Left Loop overlaps) */}
        <path
          d="M 26 16.5 A 11 11 0 0 0 21.5 13.5"
          stroke={`url(#${id}-crease-top)`}
          strokeWidth="5"
          strokeLinecap="butt"
        />

        {/* 3. Left Loop Base (Center: 18, 24, R=11, Stroke=5) */}
        <circle
          cx="18"
          cy="24"
          r="11"
          stroke={`url(#${id}-left)`}
          strokeWidth="5"
        />

        {/* 4. Bottom Fold Crease on Left Loop (before Right Loop overlaps) */}
        <path
          d="M 22 31.5 A 11 11 0 0 0 26.5 34.5"
          stroke={`url(#${id}-crease-bottom)`}
          strokeWidth="5"
          strokeLinecap="butt"
        />

        {/* 5. Top Crossing Overpass: Left Loop cleanly over Right Loop */}
        <path
          d="M 18 13 A 11 11 0 0 1 27.53 18.5"
          stroke={`url(#${id}-left)`}
          strokeWidth="5"
          strokeLinecap="butt"
        />

        {/* 6. Bottom Crossing Overpass: Right Loop cleanly over Left Loop */}
        <path
          d="M 30 35 A 11 11 0 0 1 20.47 29.5"
          stroke={`url(#${id}-right)`}
          strokeWidth="5"
          strokeLinecap="butt"
        />
      </svg>

      {/* Upright Wordmark: '5' in synchronized Brand Sapphire-Azure gradient + 'share' in slate-12 */}
      {showWordmark && (
        <span
          className="brand-wordmark"
          style={{
            fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
            fontSize: `${fontSize}px`,
            fontWeight: 700,
            color: 'var(--slate-12, #11181c)',
            letterSpacing: '-0.025em',
            display: 'inline-flex',
            alignItems: 'baseline',
            transform: 'translateY(-0.5px)' // Optical balance with geometric icon center
          }}
        >
          <span
            style={{
              fontWeight: 800,
              background: 'linear-gradient(155deg, #003d99 0%, #006adc 52%, #00b4ff 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginRight: '0.5px'
            }}
          >
            5
          </span>
          <span>share</span>
        </span>
      )}
    </div>
  )
}
