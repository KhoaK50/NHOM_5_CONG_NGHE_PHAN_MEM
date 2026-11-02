import { useState } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  FileSpreadsheet,
  Presentation,
  Hash,
  Copy,
  Check
} from 'lucide-react'
import { MAX_FILE_SIZE_BYTES } from '../../utils/fileHasher'

export default function Sha256Verifier({ verificationResult }) {
  const [hashCopied, setHashCopied] = useState(false)

  if (!verificationResult) return null

  const handleCopyHash = async () => {
    if (!verificationResult?.sha256Hash) return
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(verificationResult.sha256Hash)
      } else {
        const ta = document.createElement('textarea')
        ta.value = verificationResult.sha256Hash
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setHashCopied(true)
      setTimeout(() => setHashCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const formatKey = (
    verificationResult.format ||
    verificationResult.fileType ||
    'pdf'
  ).toLowerCase()

  const FORMAT_META = {
    pdf: { label: 'PDF', icon: FileText },
    docx: { label: 'DOCX', icon: FileSpreadsheet },
    pptx: { label: 'PPTX', icon: Presentation }
  }
  const formatMeta = FORMAT_META[formatKey] || { label: 'FILE', icon: FileText }

  const FileFormatIcon = formatMeta.icon
  const sizeBytes = Number(verificationResult.sizeBytes) || 0
  const quotaPct = Math.min(100, Math.max(2, (sizeBytes / MAX_FILE_SIZE_BYTES) * 100))

  // magicHeaderHex dạng `25 50 44 46 2D (%PDF-)`: tách phần bytes và phần diễn giải đọc từ tệp thật
  const headerMatch = String(verificationResult.magicHeaderHex || '').match(/^([0-9A-F ]+?)\s*\((.*)\)$/i)
  const displayHex = headerMatch ? headerMatch[1] : verificationResult.magicHeaderHex || 'N/A'
  const displayAscii = headerMatch ? headerMatch[2] : ''

  return (
    <div
      className={`vec-inspector-box ${verificationResult.isValid ? 'valid' : 'invalid'}`}
      aria-label="Kết quả phân tích chữ ký nhị phân và mã băm SHA-256"
    >
      {/* 1. Thông tin định danh tệp & Thanh hạn mức dung lượng */}
      <div className="vec-inspector-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <FileFormatIcon
            size={16}
            style={{
              color: verificationResult.isValid
                ? 'var(--blue-9, #0090ff)'
                : 'var(--red-9, #e5484d)',
              flexShrink: 0
            }}
          />
          <strong
            style={{
              color: 'var(--slate-12, #11181c)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={verificationResult.fileName}
          >
            {verificationResult.fileName}
          </strong>
        </div>

        <span
          className={`vec-check-tag ${verificationResult.isValid ? 'ok' : 'err'}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          {verificationResult.isValid ? (
            <>
              <ShieldCheck size={11} />
              <span>HỢP LỆ</span>
            </>
          ) : (
            <>
              <ShieldAlert size={11} />
              <span>TỪ CHỐI</span>
            </>
          )}
        </span>
      </div>

      <div>
        <div className="vec-inspector-row" style={{ marginBottom: '5px', fontSize: '11px' }}>
          <span style={{ color: 'var(--slate-11, #687076)' }}>
            Dung lượng tệp đính kèm
          </span>
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              color: verificationResult.sizeOk
                ? 'var(--slate-12, #11181c)'
                : 'var(--red-9, #e5484d)'
            }}
          >
            {verificationResult.sizeMb} MB / 25.00 MB
          </span>
        </div>
        <div className="vec-quota-track">
          <div
            className={`vec-quota-fill ${verificationResult.sizeOk ? '' : 'danger'}`}
            style={{ width: `${quotaPct}%` }}
          />
        </div>
      </div>

      {/* 2. Bảng giải mã Byte Offset 0x0000 (Magic Bytes Header) */}
      <div>
        <div className="vec-inspector-row" style={{ marginBottom: '4px', fontSize: '11px' }}>
          <span style={{ color: 'var(--slate-11, #687076)' }}>
            Chữ ký nhị phân (Magic Bytes • Offset 0x0000)
          </span>
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10.5px',
              color: verificationResult.magicBytesOk
                ? 'var(--green-11, #18794e)'
                : 'var(--red-9, #e5484d)',
              fontWeight: 600
            }}
          >
            {verificationResult.magicBytesOk ? 'Khớp định dạng' : 'Giả mạo chữ ký'}
          </span>
        </div>
        <div className="vec-hex-table">
          <span className="vec-hex-offset">0x00000000</span>
          <span className="vec-hex-bytes">{displayHex}</span>
          <span
            className={`vec-hex-ascii ${verificationResult.magicBytesOk ? '' : 'danger'}`}
          >
            {displayAscii}
          </span>
        </div>
      </div>

      {/* 3. Mã băm toàn vẹn SHA-256 (64 ký tự Hex) & Đối sánh Kho lưu trữ */}
      {verificationResult.sha256Hash && (
        <div>
          <div className="vec-inspector-row" style={{ marginBottom: '4px', fontSize: '11px' }}>
            <span
              style={{
                color: 'var(--slate-11, #687076)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Hash size={11} />
              <span>Mã băm SHA-256 (64-char Hex)</span>
            </span>
            <button
              type="button"
              className="vec-template-btn"
              onClick={handleCopyHash}
              style={{ padding: '1px 6px', fontSize: '10px' }}
            >
              {hashCopied ? <Check size={10} /> : <Copy size={10} />}
              <span style={{ marginLeft: '3px' }}>
                {hashCopied ? 'Đã chép' : 'Sao chép'}
              </span>
            </button>
          </div>
          <div className="vec-hash-box">{verificationResult.sha256Hash}</div>
        </div>
      )}

      {/* 4. Thông báo chi tiết nếu phát hiện trùng lặp hoặc lỗi kỹ thuật */}
      {!verificationResult.isValid && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--red-3, #ffefef)',
            border: '1px solid var(--red-7, #cd2b31)',
            color: 'var(--red-11, #cd2b31)',
            fontSize: '11.5px',
            lineHeight: 1.45
          }}
        >
          <strong style={{ display: 'block', marginBottom: '2px' }}>
            {verificationResult.errorMessage}
          </strong>
        </div>
      )}
    </div>
  )
}
