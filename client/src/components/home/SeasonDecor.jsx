import { getActiveSeason } from '../../seasons/seasons'
import ChristmasDecor from './ChristmasDecor'

const PETAL_COUNT = 14

// Lớp trang trí theo dịp: chỉ để nhìn, không nhận thao tác, trình đọc màn hình bỏ qua.
// Hình và vị trí nằm trong styles/seasons. Ngoài dịp thì không vẽ gì.
export default function SeasonDecor({ slot }) {
  const season = getActiveSeason()
  if (!season) return null
  if (season === 'christmas') {
    if (slot === 'hero') return <ChristmasDecor />
    if (slot === 'footer') return <div className="christmas-footer" aria-hidden="true" />
    return null
  }

  if (slot === 'hero') {
    return (
      <div className="season-decor season-decor-hero" aria-hidden="true">
        <span className="season-art season-art-left" />
        <span className="season-art season-art-right" />
        <svg className="season-wave" viewBox="0 0 1440 70" preserveAspectRatio="none">
          <path d="M0 34C160 10 300 8 470 30s300 40 480 16 330-30 490-6v30H0Z" />
        </svg>
      </div>
    )
  }

  if (slot === 'petals') {
    return (
      <div className="season-decor season-petals" aria-hidden="true">
        {Array.from({ length: PETAL_COUNT }, (_, index) => (
          <span key={index} className="season-petal" />
        ))}
      </div>
    )
  }

  return (
    <div className="season-decor season-decor-footer" aria-hidden="true">
      <svg className="season-hills" viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path className="season-hill-back" d="M0 70c180-30 340-34 520 0s340 52 500 12 280-52 420-30v68H0Z" />
        <path className="season-hill-front" d="M0 96c200-22 360-20 540 4s320 18 470-8 290-30 430-8v36H0Z" />
      </svg>
      <span className="season-art season-art-flowers" />
      <span className="season-art season-art-book" />
    </div>
  )
}
