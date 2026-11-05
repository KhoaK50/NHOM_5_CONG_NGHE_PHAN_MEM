/**
 * ============================================================================
 * UC02: FORM ĐĂNG KÝ TÀI KHOẢN SINH VIÊN (MODAL DIALOG)
 * Thành viên phụ trách: Lê Nguyễn Thùy Trâm (50.01.103.088)
 * Nối API POST /api/auth/register chuẩn RESTful
 * Tinh chỉnh UI tương thích Radix Colors & Dark/Light Theme của 5Share
 * ============================================================================
 */

import { useEffect, useState } from "react";
import CustomSelect from '../common/CustomSelect';
import { api } from "../../api/notificationReportApi";

const COHORTS = ["K47", "K48", "K49", "K50"];

const inputBase =
  "block w-full rounded-lg border bg-[var(--bg-surface,#ffffff)] px-3.5 py-2.5 text-sm text-[var(--text-primary,#0f172a)] placeholder-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#007A5E)] focus:border-[var(--brand-primary,#007A5E)] disabled:opacity-60 transition";

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--text-primary,#0f172a)]">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-[var(--text-tertiary,#64748b)]">
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

export default function RegisterModal({
  open = true,
  errors: propErrors = {},
  submitting: propSubmitting,
  success: propSuccess,
  onSubmit = null,
  onClose = () => {},
  onGoToLogin = () => {},
  onGoHome = () => {},
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    cohort: "K50",
    password: "",
    confirmPassword: "",
  });
  const [internalErrors, setInternalErrors] = useState({});
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const [internalSuccess, setInternalSuccess] = useState(false);

  const errors = { ...internalErrors, ...propErrors };
  const isSubmitting = propSubmitting !== undefined ? propSubmitting : internalSubmitting;
  const isSuccess = propSuccess !== undefined ? propSuccess : internalSuccess;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !isSubmitting && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isSubmitting, onClose]);

  if (!open) return null;

  // Xử lý thay đổi input và xóa lỗi tức thời của ô đó
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (internalErrors[name] || internalErrors.form) {
      setInternalErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        delete next.form;
        return next;
      });
    }
  };

  // Logic kiểm tra dữ liệu đăng ký (Validation chuẩn Activity Diagram UC02 bước 4)
  const validateForm = () => {
    const errs = {};

    // 1. Họ và tên
    const name = formData.fullName.trim();
    if (!name) {
      errs.fullName = "Họ và tên không được để trống.";
    } else if (name.length < 2) {
      errs.fullName = "Họ và tên phải có ít nhất 2 ký tự.";
    }

    // 2. Email (RFC 5322 regex)
    const email = formData.email.trim();
    if (!email) {
      errs.email = "Email không được để trống.";
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        errs.email = "Định dạng email không hợp lệ (ví dụ: ten.ban@student.hcmue.edu.vn).";
      }
    }

    // 3. Khóa học (cohort)
    if (!formData.cohort) {
      errs.cohort = "Vui lòng chọn khóa học.";
    }

    // 4. Mật khẩu (Test Case 2: Mật khẩu < 8 ký tự)
    if (!formData.password) {
      errs.password = "Mật khẩu không được để trống.";
    } else if (formData.password.length < 8) {
      errs.password = "Mật khẩu phải có tối thiểu 8 ký tự.";
    }

    // 5. Mật khẩu xác nhận
    if (!formData.confirmPassword) {
      errs.confirmPassword = "Vui lòng xác nhận lại mật khẩu.";
    } else if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }

    setInternalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Nối API POST /api/auth/register (Sequence Diagram UC02)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Nếu caller bên ngoài truyền custom onSubmit handler, ưu tiên gọi
    if (onSubmit) {
      onSubmit(formData);
      return;
    }

    // Thực thi luồng API mặc định
    setInternalSubmitting(true);
    setInternalErrors({});

    try {
      // POST /api/auth/register
      const res = await api.register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        cohort: formData.cohort,
        password: formData.password,
      });

      if (res.success || res.status === "success") {
        setInternalSuccess(true);
      }
    } catch (err) {
      // Bắt lỗi trùng email (HTTP 409 Conflict - Test Case 1)
      if (err.status === 409 || err.code === "EMAIL_ALREADY_EXISTS") {
        setInternalErrors({
          email: err.message || "Email này đã được đăng ký",
        });
      } else {
        setInternalErrors({
          form: err.message || "Đã xảy ra lỗi khi tạo tài khoản. Vui lòng thử lại.",
        });
      }
    } finally {
      setInternalSubmitting(false);
    }
  };

  const ring = (k) =>
    errors[k]
      ? "border-rose-500 focus:ring-rose-500"
      : "border-[var(--border-subtle,#e2e8f0)] dark:border-slate-700";
  const describe = (k, hasHint) => (errors[k] ? `${k}-error` : hasHint ? `${k}-hint` : undefined);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/60 p-0 sm:items-center sm:p-4 backdrop-blur-sm transition-all"
      onMouseDown={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-title"
        className="w-full max-w-md rounded-t-2xl bg-[var(--bg-surface,#ffffff)] border border-[var(--border-subtle,#e2e8f0)] dark:border-slate-800 shadow-2xl sm:rounded-2xl overflow-hidden"
      >
        {isSuccess ? (
          <div role="status" className="px-6 py-10 text-center sm:px-8">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" aria-hidden="true">
              <svg viewBox="0 0 20 20" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 10.5l3.2 3.2L15 6.8" />
              </svg>
            </span>
            <h2 id="register-title" className="mt-4 text-xl font-bold text-[var(--text-primary,#0f172a)]">
              Đăng ký thành công!
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary,#475569)]">
              Tài khoản Sinh viên 5Share của bạn đã được khởi tạo và sẵn sàng sử dụng.
            </p>
            <button
              type="button"
              onClick={onGoHome}
              className="mt-6 w-full rounded-xl bg-[var(--brand-primary,#007A5E)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,#007A5E)] focus-visible:ring-offset-2 transition"
            >
              Về trang chủ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle,#e2e8f0)] dark:border-slate-800 px-6 py-5 sm:px-8 bg-[var(--bg-muted,#f8fafc)]">
              <div>
                <h2 id="register-title" className="text-lg font-bold text-[var(--text-primary,#0f172a)]">
                  Đăng ký tài khoản Sinh viên
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-secondary,#475569)]">
                  Tham gia cộng đồng 5Share để đọc toàn văn và chia sẻ học liệu.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Đóng biểu mẫu"
                className="-mr-2 -mt-1 rounded-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,#007A5E)] transition"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 px-6 py-5 sm:px-8">
              {errors.form && (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                  {errors.form}
                </div>
              )}

              <Field id="fullName" label="Họ và tên" error={errors.fullName}>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Ví dụ: Lê Nguyễn Thùy Trâm"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`${inputBase} ${ring("fullName")}`}
                  aria-invalid={!!errors.fullName}
                  aria-describedby={describe("fullName")}
                  disabled={isSubmitting}
                />
              </Field>

              <Field id="email" label="Email trường (@student.hcmue.edu.vn)" error={errors.email}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tram.lnt@student.hcmue.edu.vn"
                  value={formData.email}
                  onChange={handleChange}
                  className={`${inputBase} ${ring("email")}`}
                  aria-invalid={!!errors.email}
                  aria-describedby={describe("email")}
                  disabled={isSubmitting}
                />
              </Field>

              <Field id="cohort" label="Khóa học" error={errors.cohort}>
                <CustomSelect
                  id="cohort"
                  name="cohort"
                  value={formData.cohort}
                  options={COHORTS}
                  disabled={isSubmitting}
                  onChange={(val) => handleChange({ target: { name: 'cohort', value: val } })}
                  triggerStyle={{ height: '42px', fontSize: '14px' }}
                />
              </Field>

              <Field id="password" label="Mật khẩu" error={errors.password} hint="Tối thiểu 8 ký tự.">
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`${inputBase} ${ring("password")} pr-11`}
                    aria-invalid={!!errors.password}
                    aria-describedby={describe("password", true)}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,#007A5E)]"
                  >
                    <EyeIcon off={showPassword} />
                  </button>
                </div>
              </Field>

              <Field id="confirmPassword" label="Xác nhận mật khẩu" error={errors.confirmPassword}>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`${inputBase} ${ring("confirmPassword")}`}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={describe("confirmPassword")}
                  disabled={isSubmitting}
                />
              </Field>
            </div>

            <div className="border-t border-[var(--border-subtle,#e2e8f0)] dark:border-slate-800 bg-[var(--bg-muted,#f8fafc)] px-6 py-4 sm:rounded-b-2xl sm:px-8">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-xl border border-[var(--border-subtle,#e2e8f0)] dark:border-slate-700 bg-[var(--bg-surface,#ffffff)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary,#0f172a)] hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,#007A5E)] transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[var(--brand-primary,#007A5E)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,#007A5E)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition"
                >
                  {isSubmitting ? "Đang xử lý..." : "Tạo tài khoản"}
                </button>
              </div>
              <p className="mt-4 text-center text-xs text-[var(--text-secondary,#475569)]">
                Đã có tài khoản?{" "}
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="rounded font-semibold text-[var(--brand-primary,#007A5E)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,#007A5E)]"
                >
                  Đăng nhập ngay
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
