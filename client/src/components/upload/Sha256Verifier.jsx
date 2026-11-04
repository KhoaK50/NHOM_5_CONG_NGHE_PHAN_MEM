import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

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

  const { isValid, isDuplicate, magicBytesOk, sizeOk } = verificationResult

  return (
    <div className={`file-check ${isValid ? 'valid' : 'invalid'}`} aria-label="Kết quả kiểm tra tệp">
      <div className="file-check-row">
        <strong className="file-check-name" title={verificationResult.fileName}>
          {verificationResult.fileName}
          {verificationResult.sizeMb ? ` · ${verificationResult.sizeMb} MB` : ''}
        </strong>
        <span className={`status-badge ${isValid ? 'green' : 'red'}`}>
          {isValid ? 'Tệp hợp lệ, chưa có trong kho' : 'Chưa đạt'}
        </span>
      </div>

      {!isValid && (
        <p className="file-check-error" role="alert">
          {verificationResult.errorMessage || 'Tệp không đủ điều kiện tải lên.'}
        </p>
      )}

      <details className="file-check-details">
        <summary>Chi tiết kỹ thuật</summary>
        <dl>
          <div>
            <dt>Dung lượng</dt>
            <dd>{sizeOk === false ? `${verificationResult.sizeMb} MB, vượt 25 MB` : `${verificationResult.sizeMb} MB / 25 MB`}</dd>
          </div>
          <div>
            <dt>Chữ ký tệp</dt>
            <dd>{magicBytesOk ? 'Đúng định dạng' : 'Sai cấu trúc tệp'}</dd>
          </div>
          {verificationResult.magicHeaderHex && verificationResult.magicHeaderHex !== 'N/A' && (
            <div>
              <dt>Bytes đầu tệp</dt>
              <dd className="file-check-code">{verificationResult.magicHeaderHex}</dd>
            </div>
          )}
          <div>
            <dt>Trùng lặp</dt>
            <dd>{isDuplicate ? 'Tài liệu đã tồn tại' : 'Chưa có trong kho'}</dd>
          </div>
          {verificationResult.sha256Hash && (
            <div>
              <dt>Mã SHA-256</dt>
              <dd className="file-check-code">{verificationResult.sha256Hash}</dd>
              <button type="button" className="btn-ghost nav-auth-link" onClick={handleCopyHash}>
                {hashCopied ? <Check size={13} /> : <Copy size={13} />}
                <span>{hashCopied ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>
          )}
        </dl>
      </details>
    </div>
  )
}
