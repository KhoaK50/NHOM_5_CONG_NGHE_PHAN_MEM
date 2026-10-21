/**
 * ============================================================================
 * ADVERSARIAL STRESS TEST SUITE: MULTI-FORMAT UPLOAD PIPELINE & MAGIC BYTES
 * ============================================================================
 * Targets: client/src/utils/fileHasher.js & 4-Layer Defense Architecture
 *
 * Empirical verification of:
 * 1. Disguised Windows Executables (MZ 0x4D, 0x5A) renamed to .pdf/.docx/.pptx
 * 2. Disguised Linux Executables (ELF 0x7F, 0x45, 0x4C, 0x46) renamed to .docx/.pptx/.pdf
 * 3. 0-byte files, negative sizes, empty buffers at Layer 1
 * 4. File size > 25MB (26,214,401 bytes) boundary rejection at Layer 1
 * 5. File size exactly 25MB (26,214,400 bytes) boundary pass at Layer 1
 * 6. Genuine PDF (%PDF-) multi-version parsing at Layer 2
 * 7. Genuine DOCX & PPTX (PK\x03\x04) OpenXML ZIP signatures at Layer 2
 * 8. Cryptographic SHA-256 deduplication & case-insensitivity against CSDL at Layer 3
 * 9. Non-duplicate SHA-256 computation via Web Crypto API / SubtleCrypto
 * 10. Backward compatibility of verifyPdfFileAndHash with all 9+ legacy edge cases
 * 11. Hostile attack vectors: double extension, path traversal, script injection,
 *     corrupted ZIP, and malicious MIME type spoofing
 * ============================================================================
 */

import crypto from 'node:crypto';
import {
  verifyFileAndHash,
  verifyPdfFileAndHash,
  computeDeterministicHexHash,
  MAX_FILE_SIZE_BYTES,
  FILE_SIGNATURES,
  detectFormatFromExtension
} from '../client/src/utils/fileHasher.js';
import { INITIAL_DOCUMENTS } from '../client/src/data/mockData.js';

let totalTests = 0;
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passed++;
    console.log(`  ✔ PASS: ${message}`);
  } else {
    failed++;
    const err = `${message} ${details ? `(${details})` : ''}`;
    failures.push(err);
    console.error(`  ✖ FAIL: ${err}`);
  }
}

/**
 * Tạo mock file object mô phỏng Web File / Blob API trong môi trường Node.js
 */
function createMockFile(name, contentBytes, options = {}) {
  const u8 = contentBytes instanceof Uint8Array
    ? contentBytes
    : new Uint8Array(contentBytes || []);
  const size = options.size !== undefined ? options.size : u8.byteLength;

  return {
    name,
    size,
    type: options.type !== undefined ? options.type : '',
    presetMagic: options.presetMagic,
    presetHash: options.presetHash,
    async arrayBuffer() {
      // Đảm bảo trả về unpooled ArrayBuffer chính xác
      const copy = new Uint8Array(u8.byteLength);
      copy.set(u8);
      return copy.buffer;
    }
  };
}

async function runAdversarialUploadTests() {
  console.log('\n================================================================');
  console.log('  5SHARE ADVERSARIAL CHALLENGE: UPLOAD PIPELINE & MAGIC BYTES');
  console.log('================================================================\n');

  // ==========================================================================
  // SECTION 1: DISGUISED WINDOWS EXECUTABLES (MZ 0x4D, 0x5A) -> MUST REJECT L2
  // ==========================================================================
  console.log('--- SECTION 1: Disguised Windows Executable (MZ) Rejection ---');
  {
    // 1.1 MZ executable renamed to .pdf
    const mzPdfBytes = new Uint8Array([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00]);
    const res1 = await verifyFileAndHash(
      createMockFile('trojan_payload.pdf', mzPdfBytes),
      INITIAL_DOCUMENTS
    );
    assert(!res1.isValid, 'MZ executable disguised as .pdf must be INVALID');
    assert(!res1.magicBytesOk, 'MZ executable disguised as .pdf must fail magic bytes (magicBytesOk=false)');
    assert(res1.stageFailed === 'MAGIC_BYTES', 'MZ disguised as .pdf must fail at Layer 2 (MAGIC_BYTES)', `Got: ${res1.stageFailed}`);
    assert(res1.errorMessage.includes('Phát hiện tệp giả mạo'), 'Error message must alert about disguised file');

    // 1.2 MZ executable renamed to .docx
    const res2 = await verifyFileAndHash(
      createMockFile('ransomware.docx', mzPdfBytes),
      INITIAL_DOCUMENTS
    );
    assert(!res2.isValid, 'MZ executable disguised as .docx must be INVALID');
    assert(!res2.magicBytesOk, 'MZ disguised as .docx must fail magic bytes');
    assert(res2.stageFailed === 'MAGIC_BYTES', 'MZ disguised as .docx must fail at Layer 2 (MAGIC_BYTES)');

    // 1.3 MZ executable renamed to .pptx
    const res3 = await verifyFileAndHash(
      createMockFile('slide_stealer.pptx', mzPdfBytes),
      INITIAL_DOCUMENTS
    );
    assert(!res3.isValid, 'MZ executable disguised as .pptx must be INVALID');
    assert(!res3.magicBytesOk, 'MZ disguised as .pptx must fail magic bytes');
    assert(res3.stageFailed === 'MAGIC_BYTES', 'MZ disguised as .pptx must fail at Layer 2 (MAGIC_BYTES)');

    // 1.4 Preset magic INVALID_EXE
    const res4 = await verifyFileAndHash(
      { name: 'disguised_exam.pdf', size: 1024 * 200, presetMagic: 'INVALID_EXE' },
      INITIAL_DOCUMENTS
    );
    assert(!res4.isValid, 'presetMagic: INVALID_EXE must be INVALID');
    assert(res4.stageFailed === 'MAGIC_BYTES', 'presetMagic: INVALID_EXE must fail at MAGIC_BYTES');

    // 1.5 MZ executable with executable MIME type (Layer 1 catch before Layer 2)
    const res5 = await verifyFileAndHash(
      createMockFile('exploit.pdf', mzPdfBytes, { type: 'application/x-msdownload' }),
      INITIAL_DOCUMENTS
    );
    assert(!res5.isValid, 'MZ with application/x-msdownload must be rejected');
    assert(res5.stageFailed === 'EXTENSION', 'File with malicious MIME type must fail at Layer 1 EXTENSION check');
  }

  // ==========================================================================
  // SECTION 2: DISGUISED LINUX EXECUTABLES (ELF 0x7F 0x45 0x4C 0x46) -> MUST REJECT L2
  // ==========================================================================
  console.log('\n--- SECTION 2: Disguised Linux Executable (ELF) Rejection ---');
  {
    // ELF magic bytes: 0x7F, 'E', 'L', 'F' (0x7F, 0x45, 0x4C, 0x46)
    const elfBytes = new Uint8Array([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00]);

    // 2.1 ELF executable renamed to .docx
    const res1 = await verifyFileAndHash(
      createMockFile('rootkit.docx', elfBytes),
      INITIAL_DOCUMENTS
    );
    assert(!res1.isValid, 'ELF executable disguised as .docx must be INVALID');
    assert(!res1.magicBytesOk, 'ELF disguised as .docx must fail magic bytes');
    assert(res1.stageFailed === 'MAGIC_BYTES', 'ELF disguised as .docx must fail at Layer 2 (MAGIC_BYTES)');

    // 2.2 ELF executable renamed to .pptx
    const res2 = await verifyFileAndHash(
      createMockFile('botnet.pptx', elfBytes),
      INITIAL_DOCUMENTS
    );
    assert(!res2.isValid, 'ELF executable disguised as .pptx must be INVALID');
    assert(res2.stageFailed === 'MAGIC_BYTES', 'ELF disguised as .pptx must fail at Layer 2 (MAGIC_BYTES)');

    // 2.3 ELF executable renamed to .pdf
    const res3 = await verifyFileAndHash(
      createMockFile('backdoor.pdf', elfBytes),
      INITIAL_DOCUMENTS
    );
    assert(!res3.isValid, 'ELF executable disguised as .pdf must be INVALID');
    assert(res3.stageFailed === 'MAGIC_BYTES', 'ELF disguised as .pdf must fail at Layer 2 (MAGIC_BYTES)');

    // 2.4 ELF with application/x-executable MIME type
    const res4 = await verifyFileAndHash(
      createMockFile('binary.docx', elfBytes, { type: 'application/x-executable' }),
      INITIAL_DOCUMENTS
    );
    assert(!res4.isValid, 'ELF with application/x-executable MIME must be rejected at Layer 1');
    assert(res4.stageFailed === 'EXTENSION', 'ELF with executable MIME must fail at EXTENSION');
  }

  // ==========================================================================
  // SECTION 3: 0-BYTE EMPTY FILES & INVALID SIZES -> MUST REJECT AT LAYER 1
  // ==========================================================================
  console.log('\n--- SECTION 3: 0-Byte Empty Files & Negative Sizes (Layer 1) ---');
  {
    // 3.1 0-byte PDF
    const res1 = await verifyFileAndHash(
      createMockFile('zero_byte.pdf', new Uint8Array(0)),
      INITIAL_DOCUMENTS
    );
    assert(!res1.isValid, '0-byte PDF must be INVALID');
    assert(!res1.sizeOk, '0-byte PDF sizeOk must be false');
    assert(res1.stageFailed === 'EMPTY_FILE', '0-byte PDF must fail at Layer 1 (EMPTY_FILE)');
    assert(res1.errorMessage.includes('rỗng (0 byte)'), 'Error message must mention empty 0-byte file');

    // 3.2 0-byte DOCX
    const res2 = await verifyFileAndHash(
      createMockFile('empty_word.docx', new Uint8Array(0)),
      INITIAL_DOCUMENTS
    );
    assert(!res2.isValid, '0-byte DOCX must be INVALID');
    assert(res2.stageFailed === 'EMPTY_FILE', '0-byte DOCX must fail at Layer 1 (EMPTY_FILE)');

    // 3.3 0-byte PPTX
    const res3 = await verifyFileAndHash(
      createMockFile('empty_slides.pptx', new Uint8Array(0)),
      INITIAL_DOCUMENTS
    );
    assert(!res3.isValid, '0-byte PPTX must be INVALID');
    assert(res3.stageFailed === 'EMPTY_FILE', '0-byte PPTX must fail at Layer 1 (EMPTY_FILE)');

    // 3.4 Negative size (-1 byte)
    const res4 = await verifyFileAndHash(
      { name: 'negative_size.pdf', size: -1 },
      INITIAL_DOCUMENTS
    );
    assert(!res4.isValid, 'Negative size file must be INVALID');
    assert(res4.stageFailed === 'EMPTY_FILE', 'Negative size file must fail at Layer 1 (EMPTY_FILE)');

    // 3.5 Negative size (-1024 bytes)
    const res5 = await verifyFileAndHash(
      { name: 'corrupted_size.docx', size: -1024 },
      INITIAL_DOCUMENTS
    );
    assert(!res5.isValid, 'Negative size DOCX must be INVALID');
    assert(res5.stageFailed === 'EMPTY_FILE', 'Negative size DOCX must fail at EMPTY_FILE');
  }

  // ==========================================================================
  // SECTION 4: FILE SIZE > 25MB (26,214,401 BYTES) -> MUST REJECT AT LAYER 1
  // ==========================================================================
  console.log('\n--- SECTION 4: File Size > 25MB (Layer 1 Boundary Rejection) ---');
  {
    // Max size constant: 25 * 1024 * 1024 = 26,214,400 bytes
    assert(MAX_FILE_SIZE_BYTES === 26214400, 'MAX_FILE_SIZE_BYTES must be exactly 26,214,400 bytes');

    // 4.1 Exactly 25MB + 1 byte (26,214,401 bytes)
    const res1 = await verifyFileAndHash(
      { name: 'oversized_by_1_byte.pdf', size: 26214401 },
      INITIAL_DOCUMENTS
    );
    assert(!res1.isValid, 'File of 26,214,401 bytes must be INVALID');
    assert(!res1.sizeOk, 'sizeOk must be false for 26,214,401 bytes');
    assert(res1.stageFailed === 'SIZE_LIMIT', 'File of 26,214,401 bytes must fail at Layer 1 (SIZE_LIMIT)');
    assert(res1.errorMessage.includes('vượt quá giới hạn tối đa 25MB'), 'Error message must state exceeded 25MB limit');

    // 4.2 25MB + 1KB (26,215,424 bytes)
    const res2 = await verifyFileAndHash(
      { name: 'big_syllabus.docx', size: 25 * 1024 * 1024 + 1024 },
      INITIAL_DOCUMENTS
    );
    assert(!res2.isValid, '25MB + 1KB DOCX must be INVALID');
    assert(res2.stageFailed === 'SIZE_LIMIT', '25MB + 1KB DOCX must fail at SIZE_LIMIT');

    // 4.3 50 MB
    const res3 = await verifyFileAndHash(
      { name: 'massive_presentation.pptx', size: 50 * 1024 * 1024 },
      INITIAL_DOCUMENTS
    );
    assert(!res3.isValid, '50MB PPTX must be INVALID');
    assert(res3.stageFailed === 'SIZE_LIMIT', '50MB PPTX must fail at SIZE_LIMIT');

    // 4.4 Max safe integer
    const res4 = await verifyFileAndHash(
      { name: 'infinite.pdf', size: Number.MAX_SAFE_INTEGER },
      INITIAL_DOCUMENTS
    );
    assert(!res4.isValid, 'MAX_SAFE_INTEGER file size must be INVALID');
    assert(res4.stageFailed === 'SIZE_LIMIT', 'MAX_SAFE_INTEGER must fail at SIZE_LIMIT');
  }

  // ==========================================================================
  // SECTION 5: FILE SIZE EXACTLY 25MB (26,214,400 BYTES) -> MUST PASS LAYER 1
  // ==========================================================================
  console.log('\n--- SECTION 5: File Size Exactly 25MB (Layer 1 Boundary Pass) ---');
  {
    const EXACT_25MB = 25 * 1024 * 1024; // 26,214,400 bytes

    // 5.1 Exactly 25MB PDF with genuine %PDF- header
    const validPdfBytes = new TextEncoder().encode('%PDF-1.7\n%Academic Document 25MB Boundary Test\n');
    const res1 = await verifyFileAndHash(
      createMockFile('boundary_exact_25mb.pdf', validPdfBytes, { size: EXACT_25MB }),
      INITIAL_DOCUMENTS
    );
    assert(res1.isValid, 'File of exactly 26,214,400 bytes (.pdf) must be VALID');
    assert(res1.sizeOk, 'sizeOk must be true for exactly 26,214,400 bytes');
    assert(res1.stageFailed === null, 'stageFailed must be null for exact 25MB boundary pass');

    // 5.2 Exactly 25MB DOCX with genuine PK\x03\x04 header
    const validDocxBytes = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
    const res2 = await verifyFileAndHash(
      createMockFile('boundary_exact_25mb.docx', validDocxBytes, { size: EXACT_25MB }),
      INITIAL_DOCUMENTS
    );
    assert(res2.isValid, 'File of exactly 26,214,400 bytes (.docx) must be VALID');
    assert(res2.sizeOk, 'DOCX exact 25MB sizeOk must be true');
    assert(res2.stageFailed === null, 'stageFailed must be null for DOCX exact 25MB');

    // 5.3 Exactly 25MB PPTX with genuine PK\x03\x04 header
    const res3 = await verifyFileAndHash(
      createMockFile('boundary_exact_25mb.pptx', validDocxBytes, { size: EXACT_25MB }),
      INITIAL_DOCUMENTS
    );
    assert(res3.isValid, 'File of exactly 26,214,400 bytes (.pptx) must be VALID');
    assert(res3.sizeOk, 'PPTX exact 25MB sizeOk must be true');
    assert(res3.stageFailed === null, 'stageFailed must be null for PPTX exact 25MB');

    // 5.4 25MB - 1 byte (26,214,399 bytes) boundary check
    const res4 = await verifyFileAndHash(
      createMockFile('boundary_minus_1.pdf', validPdfBytes, { size: EXACT_25MB - 1 }),
      INITIAL_DOCUMENTS
    );
    assert(res4.isValid, 'File of 26,214,399 bytes must be VALID');
    assert(res4.sizeOk, 'sizeOk must be true for 26,214,399 bytes');

    // 5.5 Minimum non-empty file (1 byte)
    // Note: 1 byte PDF fails magic bytes because %PDF- needs at least 5 bytes, but passes sizeOk
    const res5 = await verifyFileAndHash(
      createMockFile('tiny_file.pdf', new Uint8Array([0x25]), { size: 1 }),
      INITIAL_DOCUMENTS
    );
    assert(res5.sizeOk, '1-byte file must pass sizeOk (size > 0 && size <= 25MB)');
    assert(!res5.magicBytesOk, '1-byte file cannot contain complete %PDF- header');
  }

  // ==========================================================================
  // SECTION 6: GENUINE PDF (%PDF-) MULTI-VERSION VALIDATION -> PASS LAYER 2
  // ==========================================================================
  console.log('\n--- SECTION 6: Genuine PDF (%PDF-) Multi-Version Validation ---');
  {
    // 6.1 PDF 1.4 header
    const pdf14 = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n');
    const res1 = await verifyFileAndHash(
      createMockFile('giao_trinh_k49_v14.pdf', pdf14),
      INITIAL_DOCUMENTS
    );
    assert(res1.isValid, 'Genuine %PDF-1.4 file must be VALID');
    assert(res1.magicBytesOk, 'PDF 1.4 magicBytesOk must be true');
    assert(res1.fileType === 'pdf', 'fileType must be pdf');
    assert(res1.format === 'pdf', 'format must be pdf');
    assert(res1.magicHeaderHex.includes('%PDF-'), 'magicHeaderHex must display (%PDF-)');

    // 6.2 PDF 1.7 header
    const pdf17 = new TextEncoder().encode('%PDF-1.7\n%HCMUE SpTin 2026\n');
    const res2 = await verifyFileAndHash(
      createMockFile('ke_hoach_bai_day_cv5512.pdf', pdf17),
      INITIAL_DOCUMENTS
    );
    assert(res2.isValid, 'Genuine %PDF-1.7 file must be VALID');
    assert(res2.magicBytesOk, 'PDF 1.7 magicBytesOk must be true');

    // 6.3 PDF 2.0 header
    const pdf20 = new TextEncoder().encode('%PDF-2.0\n%ISO 32000-2 Modern PDF\n');
    const res3 = await verifyFileAndHash(
      createMockFile('tai_lieu_chuan_iso.pdf', pdf20),
      INITIAL_DOCUMENTS
    );
    assert(res3.isValid, 'Genuine %PDF-2.0 file must be VALID');
    assert(res3.magicBytesOk, 'PDF 2.0 magicBytesOk must be true');

    // 6.4 Uppercase extension .PDF
    const res4 = await verifyFileAndHash(
      createMockFile('SLIDES_K50.PDF', pdf17),
      INITIAL_DOCUMENTS
    );
    assert(res4.isValid, 'File with uppercase extension .PDF must be VALID');
    assert(res4.format === 'pdf', 'format must normalize to lowercase pdf');

    // 6.5 Genuine PDF with valid MIME application/pdf
    const res5 = await verifyFileAndHash(
      createMockFile('de_cuong.pdf', pdf17, { type: 'application/pdf' }),
      INITIAL_DOCUMENTS
    );
    assert(res5.isValid, 'PDF with valid application/pdf MIME must be VALID');

    // 6.6 Truncated PDF magic bytes (%PD without F-)
    const brokenPdf = new TextEncoder().encode('%PD\x00\x00corrupted');
    const res6 = await verifyFileAndHash(
      createMockFile('corrupted_header.pdf', brokenPdf),
      INITIAL_DOCUMENTS
    );
    assert(!res6.isValid, 'Truncated %PD header must be INVALID');
    assert(res6.stageFailed === 'MAGIC_BYTES', 'Truncated %PD must fail at MAGIC_BYTES');

    // 6.7 Non-standard offset (%PDF- preceded by whitespace or BOM)
    const shiftedPdf = new TextEncoder().encode('  %PDF-1.7');
    const res7 = await verifyFileAndHash(
      createMockFile('shifted_header.pdf', shiftedPdf),
      INITIAL_DOCUMENTS
    );
    assert(!res7.isValid, 'Header shifted by leading spaces must be INVALID');
    assert(res7.stageFailed === 'MAGIC_BYTES', 'Shifted header must fail at MAGIC_BYTES');
  }

  // ==========================================================================
  // SECTION 7: GENUINE DOCX & PPTX (PK\x03\x04) -> PASS LAYER 2
  // ==========================================================================
  console.log('\n--- SECTION 7: Genuine DOCX & PPTX (PK.. ZIP) Validation ---');
  {
    // Standard OpenXML ZIP Local Header magic bytes: 0x50, 0x4B, 0x03, 0x04
    const openXmlBytes = new Uint8Array([
      0x50, 0x4B, 0x03, 0x04, // PK\x03\x04
      0x14, 0x00, 0x06, 0x00,
      0x08, 0x00, 0x00, 0x00,
      0x21, 0x00, 0x77, 0x47,
      0x23, 0x44, 0x00, 0x00,
      0x5b, 0x43, 0x6f, 0x6e, 0x74, 0x65, 0x6e, 0x74, 0x5f, 0x54, 0x79, 0x70, 0x65, 0x73, 0x5d, 0x2e, 0x78, 0x6d, 0x6c // [Content_Types].xml
    ]);

    // 7.1 Genuine DOCX
    const res1 = await verifyFileAndHash(
      createMockFile('giao_an_mau_cv5512.docx', openXmlBytes),
      INITIAL_DOCUMENTS
    );
    assert(res1.isValid, 'Genuine DOCX with PK\\x03\\x04 must be VALID');
    assert(res1.magicBytesOk, 'DOCX magicBytesOk must be true');
    assert(res1.format === 'docx', 'format must be docx');
    assert(res1.fileType === 'docx', 'fileType must be docx');
    assert(res1.magicHeaderHex.includes('PK.. OpenXML'), 'magicHeaderHex must describe PK.. OpenXML');

    // 7.2 Genuine PPTX
    const res2 = await verifyFileAndHash(
      createMockFile('slide_thuyet_trinh_k49.pptx', openXmlBytes),
      INITIAL_DOCUMENTS
    );
    assert(res2.isValid, 'Genuine PPTX with PK\\x03\\x04 must be VALID');
    assert(res2.magicBytesOk, 'PPTX magicBytesOk must be true');
    assert(res2.format === 'pptx', 'format must be pptx');

    // 7.3 Uppercase extensions .DOCX and .PPTX
    const res3 = await verifyFileAndHash(
      createMockFile('TAI_LIEU.DOCX', openXmlBytes),
      INITIAL_DOCUMENTS
    );
    assert(res3.isValid, 'Uppercase .DOCX must be VALID');
    assert(res3.format === 'docx', 'format must be docx');

    const res4 = await verifyFileAndHash(
      createMockFile('BAI_GIANG.PPTX', openXmlBytes),
      INITIAL_DOCUMENTS
    );
    assert(res4.isValid, 'Uppercase .PPTX must be VALID');
    assert(res4.format === 'pptx', 'format must be pptx');

    // 7.4 Genuine DOCX with standard WordprocessingML MIME
    const res5 = await verifyFileAndHash(
      createMockFile('chuan_mime.docx', openXmlBytes, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }),
      INITIAL_DOCUMENTS
    );
    assert(res5.isValid, 'DOCX with standard OpenXML MIME must be VALID');

    // 7.5 Genuine PPTX with PresentationML MIME
    const res6 = await verifyFileAndHash(
      createMockFile('chuan_mime.pptx', openXmlBytes, {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      }),
      INITIAL_DOCUMENTS
    );
    assert(res6.isValid, 'PPTX with standard OpenXML MIME must be VALID');

    // 7.6 Fake DOCX containing PDF magic bytes (%PDF-) -> Mismatch format
    const fakeDocxPdfBytes = new TextEncoder().encode('%PDF-1.7\nNot a Word file');
    const res7 = await verifyFileAndHash(
      createMockFile('fake_word.docx', fakeDocxPdfBytes),
      INITIAL_DOCUMENTS
    );
    assert(!res7.isValid, 'DOCX containing PDF magic bytes must be INVALID');
    assert(res7.stageFailed === 'MAGIC_BYTES', 'DOCX containing PDF magic bytes must fail at MAGIC_BYTES');

    // 7.7 Corrupted ZIP signature (PK\x01\x02 or PK\x05\x06 instead of PK\x03\x04 local header)
    const centralDirHeader = new Uint8Array([0x50, 0x4B, 0x01, 0x02, 0x00, 0x00, 0x00, 0x00]);
    const res8 = await verifyFileAndHash(
      createMockFile('corrupted_zip.docx', centralDirHeader),
      INITIAL_DOCUMENTS
    );
    assert(!res8.isValid, 'ZIP with central dir header instead of local header must be INVALID');
    assert(res8.stageFailed === 'MAGIC_BYTES', 'Non-local-header ZIP must fail at MAGIC_BYTES');
  }

  // ==========================================================================
  // SECTION 8: CRYPTOGRAPHIC SHA-256 DEDUPLICATION AGAINST CSDL -> REJECT DUPLICATE
  // ==========================================================================
  console.log('\n--- SECTION 8: SHA-256 Deduplication Against CSDL ---');
  {
    assert(INITIAL_DOCUMENTS.length > 0, 'INITIAL_DOCUMENTS must contain seed documents');
    const existingDoc = INITIAL_DOCUMENTS[0];
    const existingHash = existingDoc.fileHash;
    assert(/^[0-9a-f]{64}$/.test(existingHash), `Doc ${existingDoc.id} must have 64-char hex SHA-256 hash`);

    // 8.1 Duplicate hash detection with exact lowercase match
    const res1 = await verifyFileAndHash(
      {
        name: 'duplicate_upload.pdf',
        size: 1024 * 500,
        presetHash: existingHash.toLowerCase()
      },
      INITIAL_DOCUMENTS
    );
    assert(!res1.isValid, 'Document with identical SHA-256 must be INVALID');
    assert(res1.isDuplicate, 'isDuplicate flag must be TRUE');
    assert(res1.stageFailed === 'DUPLICATE_HASH', 'Duplicate must fail at Layer 3 (DUPLICATE_HASH)');
    assert(res1.duplicateDoc && res1.duplicateDoc.id === existingDoc.id, 'Must reference the conflicting existing document ID');
    assert(res1.errorMessage.includes(existingDoc.title), 'Error message must quote existing document title');

    // 8.2 Case-insensitivity: existing database has UPPERCASE, upload computes lowercase
    const upperDocList = [
      { id: 'doc-upper-1', title: 'Giáo trình Tin học Đại cương', fileHash: existingHash.toUpperCase() }
    ];
    const res2 = await verifyFileAndHash(
      {
        name: 'hoc_lieu_k50.pdf',
        size: 1024 * 300,
        presetHash: existingHash.toLowerCase()
      },
      upperDocList
    );
    assert(!res2.isValid, 'Uppercase database hash vs lowercase upload hash must detect duplicate');
    assert(res2.isDuplicate, 'Case-insensitive duplicate check must flag isDuplicate=true');
    assert(res2.stageFailed === 'DUPLICATE_HASH', 'Must fail at DUPLICATE_HASH');

    // 8.3 Case-insensitivity: existing database has lowercase, upload provides UPPERCASE
    const lowerDocList = [
      { id: 'doc-lower-1', title: 'Bài tập Cấu trúc Dữ liệu', fileHash: existingHash.toLowerCase() }
    ];
    const res3 = await verifyFileAndHash(
      {
        name: 'bai_tap.pdf',
        size: 1024 * 300,
        presetHash: existingHash.toUpperCase()
      },
      lowerDocList
    );
    assert(!res3.isValid, 'Lowercase database hash vs uppercase upload hash must detect duplicate');
    assert(res3.isDuplicate, 'Must flag isDuplicate=true');
    assert(res3.stageFailed === 'DUPLICATE_HASH', 'Must fail at DUPLICATE_HASH');

    // 8.4 Real buffer content SHA-256 matching existing document
    // We compute the true SHA-256 of real content using node:crypto, then put it into db
    const rawContent = new TextEncoder().encode('%PDF-1.7\nUnique content for real hash test 12345\n');
    const realSha256 = crypto.createHash('sha256').update(rawContent).digest('hex');
    const dynamicDb = [
      { id: 'doc-real-sha', title: 'Tài liệu Thật Đã Tồn Tại', fileHash: realSha256 }
    ];
    const res4 = await verifyFileAndHash(
      createMockFile('tai_lieu_that.pdf', rawContent),
      dynamicDb
    );
    assert(!res4.isValid, 'Real calculated SHA-256 matching DB entry must be INVALID');
    assert(res4.isDuplicate, 'Real buffer duplicate must set isDuplicate=true');
    assert(res4.stageFailed === 'DUPLICATE_HASH', 'Real buffer duplicate must fail at DUPLICATE_HASH');
    assert(res4.sha256Hash === realSha256, 'Calculated hash must match exact crypto.createHash result');
  }

  // ==========================================================================
  // SECTION 9: NON-DUPLICATE SHA-256 DOCUMENTS -> PASS LAYER 3
  // ==========================================================================
  console.log('\n--- SECTION 9: Non-Duplicate SHA-256 Documents (Pass Layer 3) ---');
  {
    // 9.1 Unique file content not in INITIAL_DOCUMENTS
    const uniqueContent = new TextEncoder().encode(
      `%PDF-1.7\n%5Share Adversarial Unique Academic Content Timestamp: ${Date.now()}\n`
    );
    const expectedHash = crypto.createHash('sha256').update(uniqueContent).digest('hex');

    const res1 = await verifyFileAndHash(
      createMockFile('unique_research_paper.pdf', uniqueContent),
      INITIAL_DOCUMENTS
    );
    assert(res1.isValid, 'Unique non-duplicate document must be VALID');
    assert(!res1.isDuplicate, 'isDuplicate must be false for unique document');
    assert(res1.stageFailed === null, 'stageFailed must be null');
    assert(res1.sha256Hash === expectedHash, 'sha256Hash must match expected SHA-256 digest');
    assert(/^[0-9a-f]{64}$/.test(res1.sha256Hash), 'Hash must be 64-character lowercase hex string');

    // 9.2 Empty existing documents list
    const res2 = await verifyFileAndHash(
      createMockFile('first_doc_in_system.pdf', uniqueContent),
      []
    );
    assert(res2.isValid, 'File uploaded to empty database must be VALID');
    assert(!res2.isDuplicate, 'isDuplicate must be false when DB is empty');

    // 9.3 Avalanche effect: changing 1 bit in content completely changes hash
    const modifiedContent = new Uint8Array(uniqueContent);
    modifiedContent[modifiedContent.length - 1] ^= 0x01; // flip 1 bit
    const modifiedHash = crypto.createHash('sha256').update(modifiedContent).digest('hex');

    const res3 = await verifyFileAndHash(
      createMockFile('flipped_bit.pdf', modifiedContent),
      INITIAL_DOCUMENTS
    );
    assert(res3.isValid, 'Bit-flipped document must be VALID');
    assert(res3.sha256Hash !== expectedHash, '1-bit change must produce completely different hash (Avalanche effect)');
    assert(res3.sha256Hash === modifiedHash, 'Computed hash must match bit-flipped digest');
  }

  // ==========================================================================
  // SECTION 10: PRESERVED verifyPdfFileAndHash BACKWARD COMPATIBILITY
  // ==========================================================================
  console.log('\n--- SECTION 10: Backward Compatibility (verifyPdfFileAndHash) ---');
  {
    // 10.1 Null input
    const rNull = await verifyPdfFileAndHash(null, INITIAL_DOCUMENTS);
    assert(!rNull.isValid, 'verifyPdfFileAndHash(null) must be INVALID');
    assert(rNull.stageFailed === 'FILE_MISSING', 'Null input must fail with FILE_MISSING');
    assert(rNull.errorMessage.includes('PDF'), 'PDF alias must specify PDF in error message');

    // 10.2 Disallow DOCX in verifyPdfFileAndHash (legacy PDF-only contract)
    const rDocx = await verifyPdfFileAndHash(
      { name: 'document.docx', size: 1024 * 100 },
      INITIAL_DOCUMENTS
    );
    assert(!rDocx.isValid, 'verifyPdfFileAndHash must reject .docx at Layer 1');
    assert(rDocx.stageFailed === 'EXTENSION', 'Non-PDF must fail with EXTENSION');
    assert(rDocx.errorMessage.includes('Chỉ chấp nhận tệp tin chuẩn định dạng .pdf'), 'Must instruct user to use .pdf');

    // 10.3 Disallow PPTX in verifyPdfFileAndHash
    const rPptx = await verifyPdfFileAndHash(
      { name: 'slides.pptx', size: 1024 * 100 },
      INITIAL_DOCUMENTS
    );
    assert(!rPptx.isValid, 'verifyPdfFileAndHash must reject .pptx');
    assert(rPptx.stageFailed === 'EXTENSION', 'PPTX must fail EXTENSION in PDF alias');

    // 10.4 0-byte PDF
    const rZero = await verifyPdfFileAndHash(
      { name: 'empty.pdf', size: 0 },
      INITIAL_DOCUMENTS
    );
    assert(!rZero.isValid, 'verifyPdfFileAndHash 0-byte must be INVALID');
    assert(rZero.stageFailed === 'EMPTY_FILE', '0-byte must fail with EMPTY_FILE');

    // 10.5 >25MB PDF
    const rBig = await verifyPdfFileAndHash(
      { name: 'heavy.pdf', size: 26214401 },
      INITIAL_DOCUMENTS
    );
    assert(!rBig.isValid, 'verifyPdfFileAndHash >25MB must be INVALID');
    assert(rBig.stageFailed === 'SIZE_LIMIT', '>25MB must fail with SIZE_LIMIT');

    // 10.6 Exactly 25MB PDF
    const r25mb = await verifyPdfFileAndHash(
      { name: 'limit.pdf', size: 25 * 1024 * 1024 },
      INITIAL_DOCUMENTS
    );
    assert(r25mb.isValid, 'verifyPdfFileAndHash exactly 25MB must be VALID');
    assert(r25mb.sizeOk, 'sizeOk must be true');

    // 10.7 Fake magic MZ
    const rMz = await verifyPdfFileAndHash(
      { name: 'fake.pdf', size: 1024 * 100, presetMagic: 'INVALID_EXE' },
      INITIAL_DOCUMENTS
    );
    assert(!rMz.isValid, 'verifyPdfFileAndHash with INVALID_EXE must be INVALID');
    assert(rMz.stageFailed === 'MAGIC_BYTES', 'INVALID_EXE must fail with MAGIC_BYTES');

    // 10.8 Duplicate hash
    const rDup = await verifyPdfFileAndHash(
      {
        name: 'copy.pdf',
        size: 1024 * 100,
        presetHash: INITIAL_DOCUMENTS[0].fileHash
      },
      INITIAL_DOCUMENTS
    );
    assert(!rDup.isValid, 'verifyPdfFileAndHash duplicate must be INVALID');
    assert(rDup.isDuplicate, 'isDuplicate must be true');
    assert(rDup.stageFailed === 'DUPLICATE_HASH', 'Duplicate must fail with DUPLICATE_HASH');

    // 10.9 Genuine %PDF- real buffer
    const realPdf = new TextEncoder().encode('%PDF-1.7\nReal PDF stream content\n');
    const rReal = await verifyPdfFileAndHash(
      createMockFile('real_stream.pdf', realPdf),
      INITIAL_DOCUMENTS
    );
    assert(rReal.isValid, 'verifyPdfFileAndHash genuine buffer must be VALID');
    assert(rReal.magicBytesOk, 'magicBytesOk must be true');
    assert(/^[0-9a-f]{64}$/.test(rReal.sha256Hash), 'Calculated hash must be valid 64-char hex');
  }

  // ==========================================================================
  // SECTION 11: HOSTILE ATTACK VECTORS & CORNER CASES (ADVERSARIAL STRESS)
  // ==========================================================================
  console.log('\n--- SECTION 11: Hostile Attack Vectors & Edge Cases ---');
  {
    // 11.1 Double extension: assignment.pdf.exe -> Reject Layer 1
    const res1 = await verifyFileAndHash(
      createMockFile('assignment.pdf.exe', new Uint8Array([0x4D, 0x5A, 0x90, 0x00])),
      INITIAL_DOCUMENTS
    );
    assert(!res1.isValid, 'Double extension .pdf.exe must be rejected');
    assert(res1.stageFailed === 'EXTENSION', 'Double extension .pdf.exe must fail at EXTENSION');

    // 11.2 Double extension: lecture.docx.sh -> Reject Layer 1
    const res2 = await verifyFileAndHash(
      createMockFile('lecture.docx.sh', new TextEncoder().encode('#!/bin/bash\nrm -rf /')),
      INITIAL_DOCUMENTS
    );
    assert(!res2.isValid, 'Double extension .docx.sh must be rejected');
    assert(res2.stageFailed === 'EXTENSION', 'Double extension .docx.sh must fail at EXTENSION');

    // 11.3 Script injection inside .pdf
    const scriptBytes = new TextEncoder().encode('<script>alert("XSS")</script>');
    const res3 = await verifyFileAndHash(
      createMockFile('payload.pdf', scriptBytes),
      INITIAL_DOCUMENTS
    );
    assert(!res3.isValid, 'Script disguised as .pdf must be INVALID');
    assert(res3.stageFailed === 'MAGIC_BYTES', 'Script disguised as .pdf must fail at MAGIC_BYTES');

    // 11.4 HTML phishing page disguised as .pdf
    const htmlBytes = new TextEncoder().encode('<!DOCTYPE html><html><head><title>Phishing</title></head></html>');
    const res4 = await verifyFileAndHash(
      createMockFile('portal_login.pdf', htmlBytes),
      INITIAL_DOCUMENTS
    );
    assert(!res4.isValid, 'HTML disguised as .pdf must be INVALID');
    assert(res4.stageFailed === 'MAGIC_BYTES', 'HTML disguised as .pdf must fail at MAGIC_BYTES');

    // 11.5 GZIP archive disguised as .docx (0x1F, 0x8B)
    const gzipBytes = new Uint8Array([0x1F, 0x8B, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const res5 = await verifyFileAndHash(
      createMockFile('compressed.docx', gzipBytes),
      INITIAL_DOCUMENTS
    );
    assert(!res5.isValid, 'GZIP disguised as .docx must be INVALID');
    assert(res5.stageFailed === 'MAGIC_BYTES', 'GZIP disguised as .docx must fail at MAGIC_BYTES');

    // 11.6 JPEG image disguised as .docx (0xFF, 0xD8, 0xFF)
    const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
    const res6 = await verifyFileAndHash(
      createMockFile('photo.docx', jpegBytes),
      INITIAL_DOCUMENTS
    );
    assert(!res6.isValid, 'JPEG disguised as .docx must be INVALID');
    assert(res6.stageFailed === 'MAGIC_BYTES', 'JPEG disguised as .docx must fail at MAGIC_BYTES');

    // 11.7 PNG image disguised as .pptx (0x89, 0x50, 0x4E, 0x47)
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const res7 = await verifyFileAndHash(
      createMockFile('diagram.pptx', pngBytes),
      INITIAL_DOCUMENTS
    );
    assert(!res7.isValid, 'PNG disguised as .pptx must be INVALID');
    assert(res7.stageFailed === 'MAGIC_BYTES', 'PNG disguised as .pptx must fail at MAGIC_BYTES');

    // 11.8 Path traversal in filename: ../../../../etc/passwd.pdf
    const validPdf = new TextEncoder().encode('%PDF-1.7\nSafe content\n');
    const res8 = await verifyFileAndHash(
      createMockFile('../../../../etc/passwd.pdf', validPdf),
      INITIAL_DOCUMENTS
    );
    assert(res8.isValid, 'Filename with path traversal must parse extension safely without crash');
    assert(res8.format === 'pdf', 'Format must still detect pdf');

    // 11.9 Filename without extension: README
    const res9 = await verifyFileAndHash(
      createMockFile('README', validPdf),
      INITIAL_DOCUMENTS
    );
    assert(!res9.isValid, 'Filename without extension must be INVALID');
    assert(res9.stageFailed === 'EXTENSION', 'Filename without extension must fail at EXTENSION');

    // 11.10 Filename is just dot-extension: .pdf
    const res10 = await verifyFileAndHash(
      createMockFile('.pdf', validPdf),
      INITIAL_DOCUMENTS
    );
    assert(res10.isValid, 'Dotfile .pdf must parse extension correctly');
    assert(res10.format === 'pdf', 'Format must be pdf');

    // 11.11 Unicode Vietnamese characters in filename
    const res11 = await verifyFileAndHash(
      createMockFile('Kế hoạch bài dạy (K49) - Tin học 11 [CV 5512].pdf', validPdf),
      INITIAL_DOCUMENTS
    );
    assert(res11.isValid, 'Vietnamese accented filename must be supported');
    assert(res11.format === 'pdf', 'Format must be pdf');

    // 11.12 detectFormatFromExtension helper unit tests
    assert(detectFormatFromExtension('test.pdf') === 'pdf', 'detectFormatFromExtension(test.pdf) === pdf');
    assert(detectFormatFromExtension('test.docx') === 'docx', 'detectFormatFromExtension(test.docx) === docx');
    assert(detectFormatFromExtension('test.pptx') === 'pptx', 'detectFormatFromExtension(test.pptx) === pptx');
    assert(detectFormatFromExtension('test.PDF') === 'pdf', 'detectFormatFromExtension(test.PDF) === pdf');
    assert(detectFormatFromExtension('test.DOCX') === 'docx', 'detectFormatFromExtension(test.DOCX) === docx');
    assert(detectFormatFromExtension('test.PPTX') === 'pptx', 'detectFormatFromExtension(test.PPTX) === pptx');
    assert(detectFormatFromExtension('test.exe') === null, 'detectFormatFromExtension(test.exe) === null');
    assert(detectFormatFromExtension(null) === null, 'detectFormatFromExtension(null) === null');
    assert(detectFormatFromExtension('') === null, 'detectFormatFromExtension("") === null');
    assert(detectFormatFromExtension(12345) === null, 'detectFormatFromExtension(12345) === null');

    // 11.13 computeDeterministicHexHash unit tests
    const h1 = computeDeterministicHexHash('hello');
    const h2 = computeDeterministicHexHash('hello');
    const h3 = computeDeterministicHexHash('world');
    assert(h1 === h2, 'computeDeterministicHexHash must be deterministic');
    assert(h1 !== h3, 'computeDeterministicHexHash must differ for different inputs');
    assert(/^[0-9a-f]{64}$/.test(h1), 'computeDeterministicHexHash must produce 64-char hex string');

    // 11.14 FILE_SIGNATURES exports check
    assert(FILE_SIGNATURES.PDF.bytes.length === 4, 'FILE_SIGNATURES.PDF must have 4 magic bytes');
    assert(FILE_SIGNATURES.DOCX.bytes.length === 4, 'FILE_SIGNATURES.DOCX must have 4 magic bytes');
    assert(FILE_SIGNATURES.PPTX.bytes.length === 4, 'FILE_SIGNATURES.PPTX must have 4 magic bytes');
  }

  // ==========================================================================
  // FINAL EMPIRICAL SUMMARY
  // ==========================================================================
  console.log('\n================================================================');
  console.log(`  ADVERSARIAL SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${totalTests})`);
  console.log('================================================================\n');

  if (failed > 0) {
    console.error(`❌ Adversarial suite encountered ${failed} failure(s):`);
    for (const f of failures) {
      console.error(`   - ${f}`);
    }
    process.exit(1);
  } else {
    console.log(`🎉 [SUCCESS] 100% of adversarial upload and magic bytes challenges passed! (${passed}/${totalTests})`);
    process.exit(0);
  }
}

runAdversarialUploadTests().catch((err) => {
  console.error('Fatal unhandled error in adversarial test runner:', err);
  process.exit(1);
});
