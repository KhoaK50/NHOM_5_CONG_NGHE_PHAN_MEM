import { useState } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  FileSpreadsheet,
  Presentation,
  Hash,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  FileUp
} from 'lucide-react'
import { MAX_FILE_SIZE_BYTES } from '../../utils/fileHasher'

export default function Sha256Verifier({ verificationResult }) {
  const [hashCopied, setHashCopied] = useState(false)

  if (!verificationResult) {
    return (
      <div className="vec-inspector-box" style={{ textAlign: 'center', padding: '24px 16px' }}>
        <FileUp size={28} style={{ color: 'var(--text-tertiary)', margin: '0 auto 8px', display: 'block' }} />
        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          Chưa chọn tệp tin. Vui lòng tải lên tài liệu để hệ thống kiểm tra định dạng và trùng lặp.
        </p>
      </div>
    )
  }

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

  return (
    <div
      className={`vec-inspector-box ${verificationResult.isValid ? 'valid' : 'invalid'}`}
      aria-label="Kết quả kiểm tra tệp tin"
    >
      {/* 1. Tên tệp & Trạng thái hợp lệ */}
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
              <span>CHƯA ĐẠT</span>
            </>
          )}
        </span>
      </div>

      {/* 2. Dung lượng tệp */}
      <div>
        <div className="vec-inspector-row" style={{ marginBottom: '5px', fontSize: '11.5px' }}>
          <span style={{ color: 'var(--slate-11, #687076)' }}>
            Dung lượng tệp
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
            {verificationResult.sizeMb} MB / 25 MB
          </span>
        </div>
        <div className="vec-quota-track">
          <div
            className={`vec-quota-fill ${verificationResult.sizeOk ? '' : 'danger'}`}
            style={{ width: `${quotaPct}%` }}
          />
        </div>
      </div>

      {/* 3. Kiểm tra tính toàn vẹn & cấu trúc tệp */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
        <div className="vec-inspector-row">
          <span style={{ color: 'var(--slate-11, #687076)' }}>Định dạng tệp:</span>
          <span
            style={{
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: verificationResult.magicBytesOk ? 'var(--green-11, #18794e)' : 'var(--red-9, #e5484d)'
            }}
          >
            {verificationResult.magicBytesOk ? (
              <>
                <CheckCircle2 size={12} />
                <span>Đúng chuẩn {formatMeta.label}</span>
              </>
            ) : (
              <>
                <XCircle size={12} />
                <span>Sai cấu trúc tệp</span>
              </>
            )}
          </span>
        </div>

        <div className="vec-inspector-row">
          <span style={{ color: 'var(--slate-11, #687076)' }}>Kiểm tra trùng lặp:</span>
          <span
            style={{
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: !verificationResult.isDuplicate ? 'var(--green-11, #18794e)' : 'var(--red-9, #e5484d)'
            }}
          >
            {!verificationResult.isDuplicate ? (
              <>
                <CheckCircle2 size={12} />
                <span>Chưa có trên hệ thống</span>
              </>
            ) : (
              <>
                <XCircle size={12} />
                <span>Tài liệu đã tồn tại</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* 4. Mã xác thực SHA-256 */}
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
              <span>Mã xác thực SHA-256</span>
            </span>
            <button
              type="button"
              className="vec-template-btn"
              onClick={handleCopyHash}
              style={{ padding: '1px 6px', fontSize: '10px' }}
            >
              {hashCopied ? <Check size={10} /> : <Copy size={10} />}
              <span style={{ marginLeft: '3px' }}>
                {hashCopied ? 'Đã sao chép' : 'Sao chép'}
              </span>
            </button>
          </div>
          <div className="vec-hash-box">{verificationResult.sha256Hash}</div>
        </div>
      )}

      {/* 5. Thông báo lỗi nếu chưa đạt */}
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
            {verificationResult.errorMessage || 'Tệp tin không đủ điều kiện tải lên.'}
          </strong>
        </div>
      )}
    </div>
  )
}
