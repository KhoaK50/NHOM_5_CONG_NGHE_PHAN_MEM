/**
 * Hàm đánh giá độ an toàn mật khẩu theo chuẩn bảo mật Vectoria
 * @param {string} password
 * @returns {object}
 */
export function evaluatePassword(password = '') {
  const criteria = [
    { id: 'length', label: 'Tối thiểu 8 ký tự', valid: password.length >= 8 },
    { id: 'upper', label: 'Có chữ in hoa (A-Z)', valid: /[A-Z]/.test(password) },
    { id: 'number', label: 'Có chữ số (0-9)', valid: /[0-9]/.test(password) },
    { id: 'special', label: 'Ký tự đặc biệt (@, #, $...)', valid: /[^A-Za-z0-9]/.test(password) }
  ]

  const passedCount = criteria.filter((c) => c.valid).length

  let scoreLabel = 'Chưa đạt'
  let scoreColor = 'var(--slate-9)'

  if (password.length > 0) {
    if (passedCount <= 1) {
      scoreLabel = 'Yếu'
      scoreColor = 'var(--red-9)'
    } else if (passedCount === 2) {
      scoreLabel = 'Trung bình'
      scoreColor = 'var(--amber-9)'
    } else if (passedCount === 3) {
      scoreLabel = 'Khá'
      scoreColor = 'var(--blue-9)'
    } else if (passedCount === 4) {
      scoreLabel = 'Rất an toàn'
      scoreColor = 'var(--green-9)'
    }
  }

  return {
    criteria,
    passedCount,
    scoreLabel,
    scoreColor,
    isSecure: passedCount >= 3 && password.length >= 8
  }
}
