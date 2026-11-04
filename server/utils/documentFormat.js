/**
 * Nhận diện và kiểm tra 3 định dạng học liệu theo SRS: .pdf, .docx, .pptx.
 * Tệp được lưu nguyên bản, không chuyển đổi ở máy chủ. DOCX và PPTX là tệp ZIP,
 * nên đọc mục lục ZIP để xác nhận đúng cấu trúc, tránh tệp bị đổi đuôi.
 */

const zlib = require('zlib');

const MIME_BY_FORMAT = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};

const REQUIRED_PART = { docx: 'word/document.xml', pptx: 'ppt/presentation.xml' };
const MACRO_PART = { docx: 'word/vbaProject.bin', pptx: 'ppt/vbaProject.bin' };
const FORMAT_LABEL = { docx: 'Word', pptx: 'PowerPoint' };

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const MAX_METADATA_BYTES = 1024 * 1024;

class InvalidDocumentError extends Error {}

function detectDocumentFormat(fileName = '') {
  const match = /\.([a-z0-9]+)$/i.exec(String(fileName).trim());
  const ext = match ? match[1].toLowerCase() : '';
  return Object.prototype.hasOwnProperty.call(MIME_BY_FORMAT, ext) ? ext : null;
}

function mimeForFormat(format) {
  return MIME_BY_FORMAT[format] || MIME_BY_FORMAT.pdf;
}

function isZipBuffer(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= 22 && buffer.readUInt32LE(0) === LOCAL_SIGNATURE;
}

function readZipEntries(buffer) {
  const searchStart = Math.max(0, buffer.length - 65557);
  let eocd = -1;
  for (let i = buffer.length - 22; i >= searchStart; i -= 1) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const count = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let i = 0; i < count; i += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) return null;
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const nameEnd = cursor + 46 + nameLength;
    if (nameEnd > buffer.length) return null;
    entries.set(buffer.subarray(cursor + 46, nameEnd).toString('utf8'), {
      method: buffer.readUInt16LE(cursor + 10),
      compressedSize: buffer.readUInt32LE(cursor + 20),
      localOffset: buffer.readUInt32LE(cursor + 42)
    });
    cursor = nameEnd + extraLength + commentLength;
  }
  return entries;
}

function readZipText(buffer, entry) {
  if (!entry || entry.localOffset + 30 > buffer.length) return '';
  if (buffer.readUInt32LE(entry.localOffset) !== LOCAL_SIGNATURE) return '';
  const start =
    entry.localOffset + 30 + buffer.readUInt16LE(entry.localOffset + 26) + buffer.readUInt16LE(entry.localOffset + 28);
  const data = buffer.subarray(start, start + entry.compressedSize);
  try {
    if (entry.method === 0) return data.subarray(0, MAX_METADATA_BYTES).toString('utf8');
    if (entry.method === 8) return zlib.inflateRawSync(data, { maxOutputLength: MAX_METADATA_BYTES }).toString('utf8');
  } catch {
    return '';
  }
  return '';
}

function countPages(buffer, entries, format) {
  if (format === 'pptx') {
    let slides = 0;
    for (const name of entries.keys()) {
      if (/^ppt\/slides\/slide\d+\.xml$/.test(name)) slides += 1;
    }
    return Math.max(1, slides);
  }
  const match = /<Pages>\s*(\d+)\s*<\/Pages>/.exec(readZipText(buffer, entries.get('docProps/app.xml')));
  return match ? Math.max(1, Number(match[1])) : 1;
}

/** Kiểm tra tệp Word, PowerPoint và trả về số trang hoặc số slide. */
function inspectOfficeDocument(buffer, format) {
  const label = FORMAT_LABEL[format];
  const invalid = `Tệp không phải ${label} hợp lệ: nội dung không khớp với đuôi tệp.`;
  if (!isZipBuffer(buffer)) throw new InvalidDocumentError(invalid);
  const entries = readZipEntries(buffer);
  if (!entries || !entries.has(REQUIRED_PART[format])) throw new InvalidDocumentError(invalid);
  if (entries.has(MACRO_PART[format])) {
    throw new InvalidDocumentError(`Tệp ${label} chứa macro nên không được chấp nhận. Vui lòng lưu lại dưới dạng không có macro.`);
  }
  return { pages: countPages(buffer, entries, format) };
}

/** Header tải tệp an toàn với tên tiếng Việt (RFC 6266). */
function contentDisposition(type, fileName) {
  const clean = String(fileName).replace(/[\r\n"\\]/g, '_');
  const ascii = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^\x20-\x7e]/g, '_');
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}

module.exports = {
  InvalidDocumentError,
  detectDocumentFormat,
  mimeForFormat,
  inspectOfficeDocument,
  isZipBuffer,
  contentDisposition
};
