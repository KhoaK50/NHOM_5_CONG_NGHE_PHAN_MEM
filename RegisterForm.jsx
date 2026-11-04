import { useEffect, useState } from "react";

const COHORTS = ["K47", "K48", "K49", "K50"]; 
const inputBase =
  "block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:bg-slate-100";

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">{label}</label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-rose-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

function EyeIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

export default function RegisterForm({
  open = true,
  errors = {},
  submitting = false,
  success = false,
  onSubmit = () => {},
  onClose = () => {},
  onGoToLogin = () => {},
  onGoHome = () => {},
}) {
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !submitting && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    onSubmit({
      fullName: d.get("fullName"),
      email: d.get("email"),
      cohort: d.get("cohort"),
      password: d.get("password"),
      confirmPassword: d.get("confirmPassword"),
    });
  };

  const ring = (k) => (errors[k] ? "border-rose-500" : "border-slate-300");
  const describe = (k, hasHint) => (errors[k] ? `${k}-error` : hasHint ? `${k}-hint` : undefined);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="register-title"
        className="w-full max-w-md rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {success ? (
          <div role="status" className="px-6 py-10 text-center sm:px-8">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">
              <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 10.5l3.2 3.2L15 6.8" /></svg>
            </span>
            <h2 id="register-title" className="mt-4 text-xl font-semibold text-slate-900">Đăng ký thành công</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Tài khoản Sinh viên của bạn đã sẵn sàng và bạn đã được đăng nhập.
            </p>
            <button type="button" onClick={onGoHome}
              className="mt-6 w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">
              Về trang chủ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-8">
              <div>
                <h2 id="register-title" className="text-xl font-semibold text-slate-900">Tạo tài khoản</h2>
                <p className="mt-1 text-sm text-slate-600">Đăng ký để đọc toàn văn, tải về và đăng tài liệu.</p>
              </div>
              <button type="button" onClick={onClose} disabled={submitting} aria-label="Đóng biểu mẫu"
                className="-mr-2 -mt-1 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
              </button>
            </div>

            <div className="space-y-4 px-6 py-5 sm:px-8">
              {errors.form && (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errors.form}</div>
              )}

              <Field id="fullName" label="Họ và tên" error={errors.fullName}>
                <input id="fullName" name="fullName" type="text" autoComplete="name" placeholder="Lê Nguyễn Thùy Trâm"
                  className={`${inputBase} ${ring("fullName")}`} aria-invalid={!!errors.fullName}
                  aria-describedby={describe("fullName")} disabled={submitting} />
              </Field>

              <Field id="email" label="Email" error={errors.email}>
                <input id="email" name="email" type="email" autoComplete="email" placeholder="ten.ban@student.hcmue.edu.vn"
                  className={`${inputBase} ${ring("email")}`} aria-invalid={!!errors.email}
                  aria-describedby={describe("email")} disabled={submitting} />
              </Field>

              <Field id="cohort" label="Khóa học" error={errors.cohort}>
                <select id="cohort" name="cohort" defaultValue="K50"
                  className={`${inputBase} ${ring("cohort")}`} aria-invalid={!!errors.cohort}
                  aria-describedby={describe("cohort")} disabled={submitting}>
                  {COHORTS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <Field id="password" label="Mật khẩu" error={errors.password} hint="Tối thiểu 8 ký tự.">
                <div className="relative">
                  <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password"
                    className={`${inputBase} ${ring("password")} pr-11`} aria-invalid={!!errors.password}
                    aria-describedby={describe("password", true)} disabled={submitting} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-500 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
                    <EyeIcon off={showPassword} />
                  </button>
                </div>
              </Field>

              <Field id="confirmPassword" label="Xác nhận mật khẩu" error={errors.confirmPassword}>
                <input id="confirmPassword" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password"
                  className={`${inputBase} ${ring("confirmPassword")}`} aria-invalid={!!errors.confirmPassword}
                  aria-describedby={describe("confirmPassword")} disabled={submitting} />
              </Field>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 sm:rounded-b-2xl sm:px-8">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} disabled={submitting}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
                  Hủy
                </button>
                <button type="submit" disabled={submitting}
                  className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-teal-400">
                  {submitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
                </button>
              </div>
              <p className="mt-4 text-center text-sm text-slate-600">
                Đã có tài khoản?{" "}
                <button type="button" onClick={onGoToLogin}
                  className="rounded font-semibold text-teal-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
                  Đăng nhập
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
