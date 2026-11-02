/**
 * ============================================================================
 * DỊCH VỤ LƯU TRỮ ĐÁM MÂY CLOUDINARY (AVATAR NGƯỜI DÙNG - UC01 / FR-02)
 * Kiểm tra chữ ký nhị phân (Magic Bytes JPG/PNG/WEBP), giới hạn 5 MB và
 * tải trực tiếp lên Cloudinary qua REST API có chữ ký SHA-1 bảo mật.
 * ============================================================================
 */

const crypto = require('crypto');

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Nhận diện định dạng ảnh thật từ Magic Bytes đầu tệp (chống giả mạo đuôi tệp)
 */
function detectImageMimeType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }
  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  // 3. WEBP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * Tải tệp ảnh đại diện lên Cloudinary (thư mục 5share/avatars)
 */
async function uploadAvatarBufferToCloudinary(fileBuffer, userId) {
  if (!fileBuffer || fileBuffer.length === 0) {
    return {
      ok: false,
      statusCode: 400,
      message: 'Vui lòng chọn một tệp ảnh để tải lên.'
    };
  }

  if (fileBuffer.length > MAX_AVATAR_BYTES) {
    return {
      ok: false,
      statusCode: 413,
      message: 'Kích thước ảnh vượt quá giới hạn 5 MB. Vui lòng chọn ảnh nhẹ hơn.'
    };
  }

  const realMime = detectImageMimeType(fileBuffer);
  if (!realMime) {
    return {
      ok: false,
      statusCode: 415,
      message: 'Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh .JPG, .PNG hoặc .WEBP.'
    };
  }

  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || '').trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      ok: false,
      statusCode: 500,
      message: 'Máy chủ chưa được cấu hình thông số kết nối Cloudinary.'
    };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = '5share/avatars';
  const publicId = `user_${Number(userId)}_${timestamp}`;

  // Chuỗi ký chuẩn Cloudinary: các tham số xếp theo thứ tự bảng chữ cái + api_secret
  const stringToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

  const dataUri = `data:${realMime};base64,${fileBuffer.toString('base64')}`;
  const formBody = new URLSearchParams({
    file: dataUri,
    api_key: apiKey,
    timestamp: String(timestamp),
    folder,
    public_id: publicId,
    signature
  });

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody.toString()
  });

  const payload = await resp.json().catch(() => ({}));
  if (!resp.ok || !payload.secure_url) {
    const errMsg = payload?.error?.message || 'Không thể tải ảnh lên đám mây Cloudinary.';
    console.error('[CloudinaryService.uploadAvatar]', errMsg);
    return {
      ok: false,
      statusCode: 502,
      message: 'Không thể tải ảnh lên dịch vụ lưu trữ đám mây Cloudinary lúc này.'
    };
  }

  return {
    ok: true,
    secureUrl: payload.secure_url,
    publicId: payload.public_id,
    bytes: payload.bytes,
    format: payload.format
  };
}

module.exports = {
  MAX_AVATAR_BYTES,
  detectImageMimeType,
  uploadAvatarBufferToCloudinary
};
