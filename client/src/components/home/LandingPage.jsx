import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Search, Play } from 'lucide-react'
import DocumentCard from './DocumentCard'

// Phần 3D nặng nên chỉ tải khi thật sự phát
const IntroFilm = lazy(() => import('./IntroFilm'))

const POPULAR_LIMIT = 3
const INTRO_SEEN_KEY = '5share_intro_seen'

function shouldAutoplayIntro() {
  try {
    if (sessionStorage.getItem(INTRO_SEEN_KEY)) return false
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function markIntroSeen() {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1')
  } catch {
    // Trình duyệt chặn Web Storage thì phần giới thiệu không tự chạy lại được kiểm soát, bỏ qua
  }
}

export default function LandingPage({
  documents = [],
  onSearch,
  onExploreDiscovery,
  onOpenUpload,
  onSelectDoc
}) {
  const [query, setQuery] = useState('')
  const [isIntroOpen, setIsIntroOpen] = useState(shouldAutoplayIntro)

  useEffect(() => {
    if (isIntroOpen) markIntroSeen()
  }, [isIntroOpen])

  const popularDocs = useMemo(
    () =>
      documents
        .filter((doc) => doc.status === 'APPROVED')
        .sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
        .slice(0, POPULAR_LIMIT),
    [documents]
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (onSearch) onSearch(query.trim())
  }

  return (
    <div className="home-page">
      {isIntroOpen && (
        <Suspense fallback={<div className="intro-film-loading" aria-hidden="true" />}>
          <IntroFilm onFinish={() => setIsIntroOpen(false)} />
        </Suspense>
      )}

      <section className="home-hero" aria-label="Giới thiệu 5share">
        <h1 className="home-title">Tài liệu học tập ngành Sư phạm Tin học</h1>
        <p className="home-subtitle">
          Tra cứu theo môn học, đọc thử trực tuyến và tải về tài liệu đã được kiểm duyệt.
        </p>

        <form className="home-search" onSubmit={handleSubmit} role="search">
          <div className="saas-search-box">
            <Search size={16} className="saas-search-icon" />
            <input
              type="search"
              className="saas-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập tên môn, mã môn hoặc chủ đề"
              aria-label="Tìm tài liệu"
            />
          </div>
          <button type="submit" className="btn-solid-primary">
            Tìm tài liệu
          </button>
        </form>

        <div className="home-secondary-actions">
          {onOpenUpload && (
            <button type="button" className="btn-ghost" onClick={onOpenUpload}>
              Đóng góp tài liệu
            </button>
          )}
          <button type="button" className="btn-ghost nav-auth-link" onClick={() => setIsIntroOpen(true)}>
            <Play size={14} />
            <span>Xem giới thiệu</span>
          </button>
        </div>
      </section>

      {popularDocs.length > 0 && (
        <section aria-label="Tài liệu được tải nhiều">
          <div className="home-section-head">
            <h2 className="section-title">Tài liệu được tải nhiều</h2>
            <button type="button" className="btn-ghost nav-auth-link" onClick={onExploreDiscovery}>
              Xem toàn bộ kho
            </button>
          </div>
          <div className="saas-cards-grid">
            {popularDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onSelectDoc={onSelectDoc} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
