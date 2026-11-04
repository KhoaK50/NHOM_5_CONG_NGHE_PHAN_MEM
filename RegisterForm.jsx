import { useState } from "react";

/**
 * RegisterForm.jsx – UC02: Đăng ký tài khoản (giao diện tĩnh, chưa gắn API)
 * Task 5S-035 | Giai đoạn 5 | Trâm
 *
 * Props (tất cả đều tùy chọn, dùng để Giai đoạn 6 nối API POST /api/auth/register):
 *  - errors:      { fullName, email, password, confirmPassword, form }  → thông báo lỗi theo từng ô
 *  - submitting:  boolean → khóa nút khi đang gửi
 *  - onSubmit:    (values) => void
 *  - onGoToLogin: () => void
 */

const inputBase =
  "block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:bg-slate-100";

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 flex-none text-teal-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="8" />
      <path d="M6.5 10.2l2.4 2.4 4.6-5" />
    </svg>
  );
}

export default function RegisterForm({
  errors = {},
  submitting = false,
  onSubmit = () => {},
  onGoToLogin = () => {},
}) {
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onSubmit({
      fullName: data.get("fullName"),
      email: data.get("email"),
      password: data.get("password"),
      confirmPassword: data.get("confirmPassword"),
    });
  };

  const ring = (key) => (errors[key] ? "border-rose-500" : "border-slate-300");
  const describe = (key, hasHint) =>
    errors[key] ? `${key}-error` : hasHint ? `${key}-hint` : undefined;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200 lg:grid-cols-5">
        {/* Cột giới thiệu */}
        <aside className="bg-slate-900 p-8 text-slate-100 lg:col-span-2 lg:p-10">
          <p className="text-xl font-semibold text-white">5Share</p>
          <h2 className="mt-8 text-2xl font-semibold leading-snug text-white">
            Học liệu Sư phạm Tin học, do sinh viên cùng chia sẻ
          </h2>
          <ul className="mt-8 space-y-4 text-sm leading-relaxed text-slate-300">
            <li className="flex gap-3">
              <CheckIcon />
              <span>Đọc thử 3 trang đầu của mọi tài liệu, không cần tài khoản.</span>
            </li>
            <li className="flex gap-3">
              <CheckIcon />
              <span>Có tài khoản để đọc toàn văn, tải về và lưu tài liệu yêu thích.</span>
            </li>
            <li className="flex gap-3">
              <CheckIcon />
              <span>Đăng tài liệu của bạn, nhận kết quả duyệt ngay trong chuông thông báo.</span>
            </li>
          </ul>
        </aside>

        {/* Biểu mẫu */}
        <main className="p-8 sm:p-10 lg:col-span-3">
          <h1 className="text-2xl font-semibold text-slate-900">Tạo tài khoản</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Điền thông tin bên dưới, bạn có thể đăng nhập ngay sau khi tạo xong.
          </p>

          {errors.form && (
            <div role="alert" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
            <Field id="fullName" label="Họ và tên" error={errors.fullName}>
              <input
                id="fullName" name="fullName" type="text" autoComplete="name"
                placeholder="Lê Nguyễn Thùy Trâm"
                className={`${inputBase} ${ring("fullName")}`}
                aria-invalid={!!errors.fullName} aria-describedby={describe("fullName")}
                disabled={submitting}
              />
            </Field>

            <Field id="email" label="Email" error={errors.email}>
              <input
                id="email" name="email" type="email" autoComplete="email"
                placeholder="ten.ban@student.hcmue.edu.vn"
                className={`${inputBase} ${ring("email")}`}
                aria-invalid={!!errors.email} aria-describedby={describe("email")}
                disabled={submitting}
              />
            </Field>

            <Field id="password" label="Mật khẩu" error={errors.password} hint="Tối thiểu 8 ký tự.">
              <div className="relative">
                <input
                  id="password" name="password" type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`${inputBase} ${ring("password")} pr-11`}
                  aria-invalid={!!errors.password} aria-describedby={describe("password", true)}
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-500 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showPassword}
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
            </Field>

            <Field id="confirmPassword" label="Nhập lại mật khẩu" error={errors.confirmPassword}>
              <input
                id="confirmPassword" name="confirmPassword"
                type={showPassword ? "text" : "password"} autoComplete="new-password"
                className={`${inputBase} ${ring("confirmPassword")}`}
                aria-invalid={!!errors.confirmPassword} aria-describedby={describe("confirmPassword")}
                disabled={submitting}
              />
            </Field>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-teal-400"
            >
              {submitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Đã có tài khoản?{" "}
            <button
              type="button"
              onClick={onGoToLogin}
              className="font-semibold text-teal-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              Đăng nhập
            </button>
          </p>
        </main>
      </div>
    </div>
  );
}
