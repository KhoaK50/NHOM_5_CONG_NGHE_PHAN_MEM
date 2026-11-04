export default function Sha256Verifier({ verificationResult }) {
  if (!verificationResult) return null
  const { isValid, isDuplicate } = verificationResult

  return (
    <div className={`file-check ${isValid ? 'valid' : 'invalid'}`} aria-label="Kết quả kiểm tra tệp">
      <div className="file-check-row">
        <strong className="file-check-name" title={verificationResult.fileName}>
          {verificationResult.fileName}
          {verificationResult.sizeMb ? ` · ${verificationResult.sizeMb} MB` : ''}
        </strong>
        <span className={`status-badge ${isValid ? 'green' : 'red'}`}>
          {isValid ? 'Sẵn sàng gửi' : isDuplicate ? 'Tệp đã có trong kho' : 'Cần chọn lại tệp'}
        </span>
      </div>

      {!isValid && (
        <p className="file-check-error" role="alert">
          {verificationResult.errorMessage || 'Tệp không đủ điều kiện tải lên.'}
        </p>
      )}

    </div>
  )
}
