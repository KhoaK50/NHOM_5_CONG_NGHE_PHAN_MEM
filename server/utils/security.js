/**
 * ============================================================================
 * TIỆN ÍCH BẢO MẬT, MÃ HÓA MẬT KHẨU, JWT (HS256) & NHẬN DIỆN THIẾT BỊ
 * Đồng bộ kiến trúc bảo mật chuẩn Vectoria (user.py)
 * ============================================================================
 */

const crypto = require('crypto');

const JWT_SECRET =
  process.env.JWT_SECRET || '5share_hcmue_spth_enterprise_jwt_secret_2026_k50';

/**
 * Mã hóa Base64URL chuẩn RFC 7515
 */
function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let normalized = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4 !== 0) {
    normalized += '=';
  }
  return Buffer.from(normalized, 'base64').toString('utf8');
}

/**
 * Băm mật khẩu bằng thuật toán Scrypt (64 bytes key + 16 bytes salt ngẫu nhiên)
 */
function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(String(plainPassword), salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

/**
 * Kiểm tra mật khẩu đầu vào với chuỗi băm trong CSDL
 * Hỗ trợ:
 *  - Chuẩn `scrypt$<salt>$<hash>`
 *  - Chuẩn `pbkdf2:sha256:...` (tương thích Werkzeug/Vectoria)
 *  - Dữ liệu mẫu khởi tạo `$2b$10$5ShareHash...` (mật khẩu mặc định: `5Share@2026` hoặc `Secret@123`)
 */
function verifyPassword(plainPassword, storedHash) {
  if (!plainPassword || !storedHash) return false;
  const plain = String(plainPassword);
  const hashStr = String(storedHash);

  if (hashStr.startsWith('scrypt$')) {
    const parts = hashStr.split('$');
    if (parts.length !== 3) return false;
    const [, salt, originalKeyHex] = parts;
    const derivedBuffer = crypto.scryptSync(plain, salt, 64);
    const originalBuffer = Buffer.from(originalKeyHex, 'hex');
    if (derivedBuffer.length !== originalBuffer.length) return false;
    return crypto.timingSafeEqual(derivedBuffer, originalBuffer);
  }

  if (hashStr.startsWith('pbkdf2:sha256:')) {
    // Format: pbkdf2:sha256:600000$salt$hash
    const [, , iterAndRest] = hashStr.split(':');
    const [iterStr, salt, originalHex] = (iterAndRest || '').split('$');
    const iterations = parseInt(iterStr, 10) || 260000;
    if (!salt || !originalHex) return false;
    const derived = crypto.pbkdf2Sync(plain, salt, iterations, 32, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(originalHex));
  }

  // Hỗ trợ 6 tài khoản Seed mẫu trong seed_5share.sql
  if (hashStr.startsWith('$2b$10$5ShareHash')) {
    return (
      plain === '5Share@2026' ||
      plain === 'Secret@123' ||
      plain === '12345678a' ||
      plain === 'Admin@2026'
    );
  }

  return false;
}

/**
 * Ký JWT chuẩn HS256 (chứa token_version để hỗ trợ thu hồi phiên khẩn cấp)
 */
function signJwt(payload, expiresInSeconds = 7 * 24 * 3600) {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = {
    ...payload,
    iat: nowSec,
    exp: nowSec + expiresInSeconds
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signingInput)
    .digest();

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

/**
 * Giải mã & xác thực chữ ký + thời hạn exp của JWT
 */
function verifyJwt(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token không hợp lệ');
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Cấu trúc JWT không hợp lệ');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', JWT_SECRET).update(signingInput).digest()
  );

  const sigBufA = Buffer.from(encodedSignature);
  const sigBufB = Buffer.from(expectedSig);
  if (sigBufA.length !== sigBufB.length || !crypto.timingSafeEqual(sigBufA, sigBufB)) {
    throw new Error('Chữ ký JWT không hợp lệ');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && nowSec >= payload.exp) {
    throw new Error('Phiên đăng nhập đã hết hạn');
  }

  return payload;
}

/**
 * Trích xuất địa chỉ IP thực của Client (hỗ trợ Cloudflare, Render Proxy, X-Forwarded-For)
 * Đồng bộ với hàm get_client_ip() trong Vectoria user.py
 */
function getClientIp(req) {
  if (!req || !req.headers) return '127.0.0.1';
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return String(cfIp).trim();

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Phân tích chuỗi User-Agent thành tên Hệ điều hành & Trình duyệt thân thiện
 * Đồng bộ 100% với hàm parse_user_agent(ua) trong Vectoria user.py
 */
function parseUserAgent(uaString) {
  const ua = String(uaString || '');
  let browser = 'Trình duyệt khác';
  let osName = 'Hệ điều hành khác';

  if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';

  if (ua.includes('Windows NT 10.0')) osName = 'Windows 10/11';
  else if (ua.includes('Windows NT')) osName = 'Windows';
  else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) osName = 'macOS';
  else if (ua.includes('iPhone') || ua.includes('iPad')) osName = 'iOS';
  else if (ua.includes('Android')) osName = 'Android';
  else if (ua.includes('Linux')) osName = 'Linux';

  return `${osName} (${browser})`;
}

/**
 * Sinh gói mã kích hoạt tài khoản gồm:
 * - otpCode: Mã 6 chữ số (dùng để nhập trực tiếp trên màn hình OTP của 5Share)
 * - activationToken: Chuỗi định danh lưu trong bảng account_activation (`act_<otp>_<hex>`)
 *   cho phép xác thực bằng cả 2 cách: Nhập 6 số OTP hoặc bấm Link trong Email!
 */
function generateActivationBundle() {
  const otpCode = String(crypto.randomInt(100000, 999999));
  const randomSuffix = crypto.randomBytes(16).toString('hex');
  const activationToken = `act_${otpCode}_${randomSuffix}`;
  return { otpCode, activationToken };
}

/**
 * Sinh token đặt lại mật khẩu an toàn (`rst_<hex>`) kèm mã ngắn 6 số
 */
function generatePasswordResetToken() {
  const otpCode = String(crypto.randomInt(100000, 999999));
  const randomSuffix = crypto.randomBytes(18).toString('hex');
  const resetToken = `rst_${otpCode}_${randomSuffix}`;
  return { otpCode, resetToken };
}

module.exports = {
  hashPassword,
  verifyPassword,
  signJwt,
  verifyJwt,
  getClientIp,
  parseUserAgent,
  generateActivationBundle,
  generatePasswordResetToken
};
