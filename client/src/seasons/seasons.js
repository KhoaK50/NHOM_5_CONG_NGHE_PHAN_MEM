// Giao diện theo dịp.
//
// Bật, tắt bằng biến môi trường VITE_SEASON lúc build, không cần sửa code:
//   (không đặt) hoặc off  giao diện mặc định, đây là trạng thái khi mới deploy
//   teachers-day          luôn bật giao diện 20/11
//   christmas             luôn bật giao diện Noel
//   auto                  tự bật theo lịch SEASONS bên dưới
// Trên Vercel: Settings, Environment Variables, đặt VITE_SEASON rồi Redeploy.
//
// Thêm dịp mới: một dòng ở SEASONS, một tệp trong styles/seasons
// và một thư mục ảnh trong assets/seasons.
// from, to theo dạng MM-DD và tính cả hai ngày, giờ Việt Nam. Chỉ dùng khi VITE_SEASON=auto.
export const SEASONS = [
  { id: 'teachers-day', from: '11-13', to: '11-21' },
  { id: 'christmas', from: '12-01', to: '12-31' },
]

const PREVIEW_PARAM = 'season'
const MODE_OFF = 'off'
const MODE_AUTO = 'auto'
const BUILD_MODE = String(import.meta.env?.VITE_SEASON || MODE_OFF).trim()

function monthDayInVietnam(date) {
  // en-CA cho dạng YYYY-MM-DD, lấy phần MM-DD để so sánh như chuỗi
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .slice(5)
}

function isInRange(monthDay, { from, to }) {
  // Dịp đi qua năm mới có from lớn hơn to, ví dụ 12-28 đến 01-02
  return from <= to
    ? monthDay >= from && monthDay <= to
    : monthDay >= from || monthDay <= to
}

// ?season=<id> để xem trước một dịp, ?season=off để xem giao diện thường.
// Chỉ ảnh hưởng tab đang mở, không đổi giao diện của người khác.
export function resolveSeasonId(date = new Date(), search = '', seasons = SEASONS, mode = BUILD_MODE) {
  const isKnown = (id) => seasons.some((season) => season.id === id)

  const preview = new URLSearchParams(search).get(PREVIEW_PARAM)
  if (preview === MODE_OFF) return null
  if (isKnown(preview)) return preview

  if (mode === MODE_AUTO) {
    const monthDay = monthDayInVietnam(date)
    return seasons.find((season) => isInRange(monthDay, season))?.id ?? null
  }
  return isKnown(mode) ? mode : null
}

// Gọi một lần trước khi React vẽ, nên nội dung không bị nháy từ giao diện thường sang giao diện dịp.
// Trong dịp chỉ dùng nền sáng; lựa chọn sáng/tối đã lưu của người dùng vẫn giữ cho lúc hết dịp.
export function applySeason() {
  const seasonId = resolveSeasonId(new Date(), window.location.search)
  if (seasonId) {
    document.documentElement.dataset.season = seasonId
    document.documentElement.dataset.theme = 'light'
  }
  return seasonId
}

export function getActiveSeason() {
  return document.documentElement.dataset.season ?? null
}
