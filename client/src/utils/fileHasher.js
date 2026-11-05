/**
 * ============================================================================
 * UC08 (G5-FR13) & FR-06: KIỂM SOÁT 4 TẦNG AN NINH & BĂM SHA-256 ĐA ĐỊNH DẠNG
 * Hỗ trợ các định dạng học liệu chuẩn: Adobe PDF (.pdf), MS Word (.docx), MS PowerPoint (.pptx)
 * ============================================================================
 */

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB (giới hạn Cloudinary Free)

export const FILE_SIGNATURES = {
  PDF: {
    ext: 'pdf',
    mime: ['application/pdf'],
    bytes: [0x25, 0x50, 0x44, 0x2D], // %PDF-
    ascii: '%PDF-',
    name: 'Adobe Portable Document Format (.pdf)'
  },
  DOCX: {
    ext: 'docx',
    mime: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'application/x-zip-compressed',
      'application/octet-stream'
    ],
    bytes: [0x50, 0x4B, 0x03, 0x04], // PK.. (ZIP archive)
    ascii: 'PK\x03\x04',
    name: 'Microsoft Word Document (.docx)'
  },
  PPTX: {
    ext: 'pptx',
    mime: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-zip-compressed',
      'application/octet-stream'
    ],
    bytes: [0x50, 0x4B, 0x03, 0x04], // PK.. (ZIP archive)
    ascii: 'PK\x03\x04',
    name: 'Microsoft PowerPoint Presentation (.pptx)'
  }
}

/**
 * Nhận diện định dạng tệp tin dựa trên phần mở rộng tên tệp
 */
export function detectFormatFromExtension(fileName = '') {
  if (typeof fileName !== 'string') return null
  const extMatch = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)
  const ext = extMatch ? extMatch[1] : ''
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  if (ext === 'pptx') return 'pptx'
  return null
}

/**
 * Chuyển ArrayBuffer sang chuỗi thập lục phân 64 ký tự (hexadecimal)
 */
function bufferToHex(buffer) {
  const byteArray = new Uint8Array(buffer)
  return Array.from(byteArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Đường ống kiểm tra 4 tầng an ninh tải lên (Multi-Format Validation Pipeline):
 * - Tầng 1: Whitelist phần mở rộng (.pdf, .docx, .pptx) và dung lượng (0 < size <= 25MB)
 * - Tầng 2: Kiểm tra Magic Bytes nhị phân (%PDF- cho PDF, PK\x03\x04 cho DOCX & PPTX)
 * - Tầng 3: Băm mật mã SHA-256 (64 ký tự hex) & Quét chống trùng lặp trong CSDL
 * - Tầng 4: Gắn kết Metadata học thuật hợp lệ
 *
 * @param {File} fileObj
 * @param {Array} existingDocuments
 */
export async function verifyFileAndHash(fileObj, existingDocuments = []) {
  if (!fileObj) {
    return {
      isValid: false,
      stageFailed: 'FILE_MISSING',
      errorMessage: 'Vui lòng chọn một tệp tin (PDF, Word hoặc PowerPoint) để kiểm tra.'
    }
  }

  const fileName = fileObj.name
  const sizeBytes = fileObj.size
  const sizeMb = Number((sizeBytes / (1024 * 1024)).toFixed(2))

  // Tầng 1: Kiểm tra phần mở rộng & MIME type
  const detectedFormat = detectFormatFromExtension(fileName)
  const isAllowedExt = Boolean(detectedFormat && ['pdf', 'docx', 'pptx'].includes(detectedFormat))

  // Kiểm tra MIME type nếu trình duyệt cung cấp
  let hasInvalidMime = false
  if (typeof fileObj.type === 'string' && fileObj.type.trim() !== '') {
    const rawMime = fileObj.type.toLowerCase().trim()
    if (detectedFormat === 'pdf') {
      hasInvalidMime = rawMime !== 'application/pdf'
    } else if (detectedFormat === 'docx' || detectedFormat === 'pptx') {
      const forbiddenMimes = [
        'application/x-msdownload',
        'application/x-dosexec',
        'application/x-executable',
        'application/x-sharedlib',
        'text/javascript',
        'application/javascript',
        'text/html'
      ]
      if (forbiddenMimes.includes(rawMime) || rawMime.startsWith('image/') || rawMime.startsWith('video/') || rawMime.startsWith('audio/')) {
        hasInvalidMime = true
      }
    }
  }

  if (!isAllowedExt || hasInvalidMime) {
    return {
      isValid: false,
      fileName,
      fileType: detectedFormat,
      format: detectedFormat,
      sizeMb,
      sizeBytes,
      extensionOk: false,
      sizeOk: sizeBytes > 0 && sizeBytes <= MAX_FILE_SIZE_BYTES,
      magicBytesOk: false,
      magicHeaderHex: 'N/A',
      sha256Hash: null,
      isDuplicate: false,
      duplicateDoc: null,
      stageFailed: 'EXTENSION',
      errorMessage: /\.(doc|ppt)$/i.test(fileName)
        ? 'Tệp .doc, .ppt đời cũ chưa được hỗ trợ. Hãy mở tệp trong Word hoặc PowerPoint rồi lưu lại thành .docx hoặc .pptx.'
        : 'Chỉ chấp nhận tệp .pdf, .docx hoặc .pptx.'
    }
  }

  // Tầng 1 (tiếp): Kiểm tra tệp rỗng 0-byte
  if (sizeBytes <= 0) {
    return {
      isValid: false,
      fileName,
      fileType: detectedFormat,
      format: detectedFormat,
      sizeMb: 0,
      sizeBytes: 0,
      extensionOk: true,
      sizeOk: false,
      magicBytesOk: false,
      magicHeaderHex: 'N/A',
      sha256Hash: null,
      isDuplicate: false,
      duplicateDoc: null,
      stageFailed: 'EMPTY_FILE',
      errorMessage: 'Tệp tin rỗng (0 byte) không hợp lệ, vui lòng chọn tệp có nội dung.'
    }
  }

  // Tầng 1 (tiếp): Giới hạn biên kích thước <= 25MB
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      fileName,
      fileType: detectedFormat,
      format: detectedFormat,
      sizeMb,
      sizeBytes,
      extensionOk: true,
      sizeOk: false,
      magicBytesOk: false,
      magicHeaderHex: 'N/A',
      sha256Hash: null,
      isDuplicate: false,
      duplicateDoc: null,
      stageFailed: 'SIZE_LIMIT',
      errorMessage: `Dung lượng tệp (${sizeMb} MB) vượt quá giới hạn tối đa 10 MB của dịch vụ lưu trữ đám mây Cloudinary Free. Vui lòng chọn tệp nhỏ hơn 10 MB hoặc nén lại trước khi gửi.`
    }
  }

  // Tầng 2: Xác thực tính toàn vẹn nhị phân Magic Bytes
  let magicBytesOk = true
  let magicHeaderHex = 'N/A'
  let sha256Hash = ''

  try {
      const arrayBuf = await fileObj.arrayBuffer()
      const firstBytes = new Uint8Array(arrayBuf.slice(0, 8))

      // Kiểm tra chữ ký PE executable (MZ) hoặc ELF
      const isMzExe = firstBytes[0] === 0x4D && firstBytes[1] === 0x5A
      const isElfExe = firstBytes[0] === 0x7F && firstBytes[1] === 0x45 && firstBytes[2] === 0x4C && firstBytes[3] === 0x46

      if (isMzExe || isElfExe) {
        magicBytesOk = false
        magicHeaderHex = `${Array.from(firstBytes.slice(0, 4)).map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')} (Tệp thực thi giả mạo)`
      } else if (detectedFormat === 'pdf') {
        const asciiPrefix = String.fromCharCode(...firstBytes.slice(0, 5))
        const hexPrefix = Array.from(firstBytes.slice(0, 5))
          .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
          .join(' ')
        magicBytesOk = asciiPrefix === '%PDF-' || (firstBytes[0] === 0x25 && firstBytes[1] === 0x50 && firstBytes[2] === 0x44 && firstBytes[3] === 0x2D)
        magicHeaderHex = `${hexPrefix} (${asciiPrefix})`
      } else if (detectedFormat === 'docx' || detectedFormat === 'pptx') {
        // OpenXML ZIP magic bytes: 0x50, 0x4B, 0x03, 0x04
        const isZipSignature = firstBytes[0] === 0x50 && firstBytes[1] === 0x4B && firstBytes[2] === 0x03 && firstBytes[3] === 0x04
        const hexPrefix = Array.from(firstBytes.slice(0, 4))
          .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
          .join(' ')
        magicBytesOk = isZipSignature
        magicHeaderHex = `${hexPrefix} (PK.. OpenXML)`
      }

      // Tầng 3: Băm mật mã SHA-256
      if (globalThis.crypto && globalThis.crypto.subtle) {
        const digestBuffer = await globalThis.crypto.subtle.digest('SHA-256', arrayBuf)
        sha256Hash = bufferToHex(digestBuffer)
      }
  } catch {
    magicBytesOk = false
  }

  if (!magicBytesOk) {
    return {
      isValid: false,
      fileName,
      fileType: detectedFormat,
      format: detectedFormat,
      sizeMb,
      sizeBytes,
      extensionOk: true,
      sizeOk: true,
      magicBytesOk: false,
      magicHeaderHex,
      sha256Hash: null,
      isDuplicate: false,
      duplicateDoc: null,
      stageFailed: 'MAGIC_BYTES',
      errorMessage: 'Cảnh báo an ninh: Chữ ký nhị phân đầu tệp không khớp định dạng chuẩn (Phát hiện tệp giả mạo đổi đuôi).'
    }
  }

  // Tầng 3: Đối soát chống trùng lặp mã băm SHA-256 trong kho học liệu
  const duplicateDoc = existingDocuments.find(
    (doc) => doc.fileHash && doc.fileHash.toLowerCase() === sha256Hash.toLowerCase()
  )

  if (duplicateDoc) {
    return {
      isValid: false,
      fileName,
      fileType: detectedFormat,
      format: detectedFormat,
      sizeMb,
      sizeBytes,
      extensionOk: true,
      sizeOk: true,
      magicBytesOk: true,
      magicHeaderHex,
      sha256Hash,
      isDuplicate: true,
      duplicateDoc,
      stageFailed: 'DUPLICATE_HASH',
      errorMessage: 'Tài liệu này đã có trên hệ thống. Bạn không cần đóng góp lại.'
    }
  }

  return {
    isValid: true,
    fileName,
    fileType: detectedFormat,
    format: detectedFormat,
    sizeMb,
    sizeBytes,
    extensionOk: true,
    sizeOk: true,
    magicBytesOk: true,
    magicHeaderHex,
    sha256Hash,
    isDuplicate: false,
    duplicateDoc: null,
    stageFailed: null,
    errorMessage: null
  }
}
