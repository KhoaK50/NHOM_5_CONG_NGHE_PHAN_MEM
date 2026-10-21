/**
 * ============================================================================
 * TẦNG SERVICE: HỆ THỐNG THƯ ĐIỆN TỬ DOANH NGHIỆP (ENTERPRISE EMAIL SERVICE)
 * Đồng bộ kiến trúc bảo mật & văn phong trang trọng của Vectoria (user.py)
 * ============================================================================
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const EMAIL_BASE_CSS = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7; margin: 0; padding: 40px 0; -webkit-font-smoothing: antialiased; }
  .wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #eaeaec; }
  .header { padding: 30px 40px; border-bottom: 1px solid #f0f0f5; background-color: #fafbfc; }
  .brand-title { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; margin: 0; }
  .brand-sub { font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .content { padding: 36px 40px; color: #333333; line-height: 1.65; font-size: 15px; }
  .h1 { font-size: 19px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 18px; }
  .p { margin-bottom: 18px; color: #374151; }
  .otp-box { background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px 24px; text-align: center; margin: 24px 0; }
  .otp-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; font-weight: 700; margin-bottom: 6px; }
  .otp-code { font-size: 28px; font-weight: 800; letter-spacing: 8px; color: #0077e6; font-family: 'Courier New', monospace; }
  .btn-container { margin: 28px 0; }
  .btn { display: inline-block; background-color: #0077e6; color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 6px; }
  .btn-danger { display: inline-block; background-color: #dc2626; color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 6px; }
  .btn-outline { display: inline-block; background-color: #ffffff; color: #1e293b !important; border: 1px solid #cbd5e1; font-weight: 600; font-size: 14px; text-decoration: none; padding: 11px 22px; border-radius: 6px; margin-right: 10px; }
  .info-box { background-color: #f9fafb; border-left: 4px solid #0077e6; padding: 16px 20px; margin: 22px 0; font-size: 14px; color: #374151; }
  .alert-box { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px 20px; margin: 22px 0; font-size: 14px; color: #7f1d1d; }
  .footer { padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #f0f0f5; font-size: 12px; color: #6b7280; line-height: 1.6; }
  .link-fallback { word-break: break-all; color: #0077e6; font-size: 13px; }
`;

/**
 * 1. Mẫu thư Kích hoạt Tài khoản (Account Activation)
 */
function buildActivationEmail({ fullName, otpCode, verificationUrl }) {
  return {
    subject: '[5Share] Yêu cầu xác thực và kích hoạt tài khoản',
    html: `
      <!DOCTYPE html>
      <html lang="vi">
      <head><meta charset="utf-8"><style>${EMAIL_BASE_CSS}</style></head>
      <body>
        <div class="wrapper">
          <div class="header">
            <p class="brand-title">5SHARE</p>
            <div class="brand-sub">Hệ thống Quản trị Định danh & Bảo mật</div>
          </div>
          <div class="content">
            <div class="h1">Xác thực địa chỉ thư điện tử</div>
            <div class="p">Kính gửi <strong>${fullName}</strong>,</div>
            <div class="p">Hệ thống <strong>5Share</strong> đã tiếp nhận yêu cầu khởi tạo tài khoản của Quý thành viên. Nhằm đảm bảo tính toàn vẹn định danh và bảo mật dữ liệu, Quý thành viên vui lòng nhập mã xác thực gồm 6 chữ số dưới đây hoặc nhấn vào liên kết kích hoạt trực tiếp:</div>
            <div class="otp-box">
              <div class="otp-label">Mã xác thực kích hoạt (OTP)</div>
              <div class="otp-code">${otpCode}</div>
            </div>
            <div class="btn-container">
              <a href="${verificationUrl}" class="btn">Kích hoạt tài khoản ngay</a>
            </div>
            <div class="info-box">
              <strong>Lưu ý bảo mật:</strong> Mã xác thực và đường dẫn kích hoạt này chỉ có hiệu lực trong vòng <strong>24 giờ</strong> kể từ thời điểm cấp phát. Nếu Quý thành viên không thực hiện yêu cầu này, vui lòng bỏ qua thư thông báo.
            </div>
            <div class="p" style="font-size: 13px; color: #6b7280;">
              Trong trường hợp nút bấm không hoạt động, vui lòng sao chép đường dẫn sau vào trình duyệt:<br>
              <a href="${verificationUrl}" class="link-fallback">${verificationUrl}</a>
            </div>
          </div>
          <div class="footer">
            Đây là thư điện tử tự động từ Hệ thống Quản trị Định danh 5Share. Vui lòng không phản hồi lại thư này.<br>
            © 2026 5Share. Mọi quyền được bảo lưu.
          </div>
        </div>
      </body>
      </html>
    `
  };
}

/**
 * 2. Mẫu thư Khôi phục Mật khẩu (Password Reset)
 */
function buildPasswordResetEmail({ fullName, otpCode, resetUrl }) {
  return {
    subject: '[5Share] Yêu cầu thiết lập lại mật khẩu tài khoản',
    html: `
      <!DOCTYPE html>
      <html lang="vi">
      <head><meta charset="utf-8"><style>${EMAIL_BASE_CSS}</style></head>
      <body>
        <div class="wrapper">
          <div class="header">
            <p class="brand-title">5SHARE</p>
            <div class="brand-sub">Trung tâm An ninh Định danh</div>
          </div>
          <div class="content">
            <div class="h1">Yêu cầu đặt lại mật khẩu</div>
            <div class="p">Kính gửi <strong>${fullName}</strong>,</div>
            <div class="p">Hệ thống <strong>5Share</strong> vừa nhận được yêu cầu thiết lập lại mật khẩu cho tài khoản liên kết với địa chỉ thư điện tử này. Quý thành viên có thể sử dụng mã khôi phục dưới đây hoặc nhấn trực tiếp vào nút xác nhận để tạo mật khẩu mới:</div>
            <div class="otp-box">
              <div class="otp-label">Mã khôi phục bảo mật</div>
              <div class="otp-code">${otpCode}</div>
            </div>
            <div class="btn-container">
              <a href="${resetUrl}" class="btn">Thiết lập lại mật khẩu</a>
            </div>
            <div class="info-box">
              <strong>Hiệu lực phiên khôi phục:</strong> Đường dẫn và mã khôi phục này sẽ tự động hết hạn sau <strong>15 phút</strong>. Ngay sau khi mật khẩu mới được thiết lập, toàn bộ các phiên đăng nhập cũ trên mọi thiết bị sẽ tự động bị thu hồi để bảo vệ tài khoản.
            </div>
          </div>
          <div class="footer">
            Thư thông báo được gửi tự động từ Phân hệ Bảo mật 5Share. Vui lòng không phản hồi lại thư này.<br>
            © 2026 5Share. Mọi quyền được bảo lưu.
          </div>
        </div>
      </body>
      </html>
    `
  };
}

/**
 * 3. Mẫu thư Cảnh báo Đăng nhập từ Thiết bị Lạ (Enterprise Device Security Alert)
 * Đồng bộ 100% với hàm get_security_alert_email() trong Vectoria user.py
 */
function buildSecurityAlertEmail({
  fullName,
  timeStr,
  ipAddress,
  deviceInfo,
  confirmUrl,
  emergencyUrl
}) {
  return {
    subject: '[5Share] Cảnh báo bảo mật: Phát hiện đăng nhập từ thiết bị mới',
    html: `
      <!DOCTYPE html>
      <html lang="vi">
      <head><meta charset="utf-8"><style>${EMAIL_BASE_CSS}</style></head>
      <body>
        <div class="wrapper">
          <div class="header">
            <p class="brand-title">5SHARE</p>
            <div class="brand-sub">Giám sát An ninh Truy cập</div>
          </div>
          <div class="content">
            <div class="h1">Cảnh báo đăng nhập từ thiết bị chưa xác thực</div>
            <div class="p">Kính gửi <strong>${fullName}</strong>,</div>
            <div class="p">Hệ thống Giám sát An ninh <strong>5Share</strong> vừa ghi nhận một phiên đăng nhập thành công vào tài khoản của Quý thành viên từ một thiết bị hoặc trình duyệt chưa từng được xác nhận trước đây:</div>
            <div class="alert-box">
              <strong>Thời điểm ghi nhận:</strong> ${timeStr} (GMT+7)<br>
              <strong>Thiết bị & Trình duyệt:</strong> ${deviceInfo}<br>
              <strong>Địa chỉ IP truy cập:</strong> ${ipAddress}
            </div>
            <div class="p">Nếu chính Quý thành viên vừa thực hiện thao tác đăng nhập này, vui lòng nhấn xác nhận để hệ thống ghi nhận đây là thiết bị tin cậy cho các lần truy cập tiếp theo. Ngược lại, nếu Quý thành viên không nhận ra hoạt động này, vui lòng kích hoạt chế độ thu hồi phiên khẩn cấp ngay lập tức:</div>
            <div class="btn-container">
              <a href="${confirmUrl}" class="btn-outline">Xác nhận thiết bị của tôi</a>
              <a href="${emergencyUrl}" class="btn-danger">Khóa phiên & Đổi mật khẩu ngay</a>
            </div>
          </div>
          <div class="footer">
            Thư cảnh báo tự động từ Hệ thống Giám sát An ninh 5Share. Vui lòng không phản hồi lại thư này.<br>
            © 2026 5Share. Mọi quyền được bảo lưu.
          </div>
        </div>
      </body>
      </html>
    `
  };
}

/**
 * 3.5. Mẫu thư Chào mừng khi Đăng ký / Đăng nhập lần đầu bằng Google OAuth 2.0
 */
function buildWelcomeEmail({ fullName, email, deviceInfo }) {
  return {
    subject: '[5Share] Chào mừng bạn gia nhập nền tảng 5Share',
    html: `
      <!DOCTYPE html>
      <html lang="vi">
      <head><meta charset="utf-8"><style>${EMAIL_BASE_CSS}</style></head>
      <body>
        <div class="wrapper">
          <div class="header">
            <p class="brand-title">5SHARE</p>
            <div class="brand-sub">Hệ thống Quản trị Định danh & Học liệu Số</div>
          </div>
          <div class="content">
            <div class="h1">Khởi tạo định danh thành công</div>
            <div class="p">Kính gửi <strong>${fullName}</strong>,</div>
            <div class="p">Chào mừng Quý thành viên chính thức gia nhập nền tảng <strong>5Share</strong> thông qua xác thực liên kết Google OAuth 2.0. Tài khoản của Quý thành viên đã được kích hoạt toàn quyền truy cập:</div>
            <div class="info-box">
              <strong>Tài khoản định danh:</strong> ${email}<br>
              <strong>Phương thức xác thực:</strong> Google OAuth 2.0 (Đã xác minh)<br>
              <strong>Thiết bị tin cậy gốc:</strong> ${deviceInfo || 'Trình duyệt Web'}
            </div>
            <div class="p">Hệ thống Giám sát An ninh 5Share đã tự động ghi nhận thiết bị hiện tại vào danh sách tin cậy. Trong các lần đăng nhập sau, nếu phát hiện truy cập từ một thiết bị hoặc trình duyệt lạ, hệ thống sẽ gửi thư cảnh báo bảo mật kèm liên kết thu hồi phiên khẩn cấp tới hộp thư này.</div>
          </div>
          <div class="footer">
            Đây là thư thông báo tự động từ Hệ thống Quản trị Định danh 5Share.<br>
            © 2026 5Share. Mọi quyền được bảo lưu.
          </div>
        </div>
      </body>
      </html>
    `
  };
}

/**
 * 4. Trang HTML phản hồi trực tiếp khi bấm "Xác nhận thiết bị của tôi" từ Email
 * Đồng bộ với hàm get_device_confirmation_page() trong Vectoria user.py
 */
function buildDeviceConfirmationHtmlPage({
  success,
  title,
  message,
  deviceInfo,
  frontendUrl = 'http://localhost:5173'
}) {
  const accentColor = success ? '#16a34a' : '#dc2626';
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} — 5Share Security</title>
      <style>
        body { font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, sans-serif; background: #fcfcfd; color: #11181c; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
        .card { max-width: 460px; width: 100%; background: #ffffff; border: 1px solid #e6e8eb; border-radius: 16px; padding: 36px 32px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06); text-align: center; }
        .badge { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 50%; background: ${success ? '#f0fdf4' : '#fef2f2'}; color: ${accentColor}; font-size: 26px; font-weight: 800; margin-bottom: 18px; border: 1px solid ${success ? '#bbf7d0' : '#fecaca'}; }
        h1 { font-size: 20px; font-weight: 800; margin: 0 0 12px; color: #11181c; }
        p { font-size: 14px; line-height: 1.6; color: #687076; margin: 0 0 20px; }
        .device-pill { background: #f9f9fb; border: 1px solid #e6e8eb; border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600; color: #11181c; margin-bottom: 24px; }
        .btn { display: inline-block; background: #0090ff; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 10px; transition: background 0.2s; }
        .btn:hover { background: #0588f0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">${success ? '✓' : '!'}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        ${deviceInfo ? `<div class="device-pill">Thiết bị: ${deviceInfo}</div>` : ''}
        <a href="${frontendUrl}" class="btn">Quay về Không gian 5Share</a>
      </div>
    </body>
    </html>
  `;
}

/**
 * Hàm gửi Email qua Resend API (giống send_resend_email trong Vectoria user.py).
 * Mặc định sử dụng tên hiển thị "5Share Security <security@vectoria.io.vn>" (Phương án 1).
 */
async function sendEnterpriseEmail({ toEmail, subject, html }) {
  const apiKey = process.env.RESEND_AUTH_KEY || process.env.RESEND_API_KEY;
  const isAutomatedTestEmail =
    String(toEmail || '').startsWith('test_auth_') ||
    String(toEmail || '').startsWith('test_vectoria_auth_');

  if (!apiKey || isAutomatedTestEmail) {
    console.log(`[5share Email Sandbox] -> Tới: ${toEmail} | Chủ đề: ${subject}`);
    return { delivered: false, mode: 'sandbox' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || '5Share Security <security@vectoria.io.vn>',
        to: [toEmail],
        subject,
        html
      })
    });

    if (response.ok) {
      const resJson = await response.json().catch(() => ({}));
      console.log(`[5share Resend Delivered] -> Tới: ${toEmail} | ID: ${resJson.id || 'OK'}`);
      return { delivered: true, mode: 'resend', id: resJson.id };
    }
    const errText = await response.text();
    console.warn('[5share Resend API Warning]:', errText);
    return { delivered: false, mode: 'fallback', error: errText };
  } catch (err) {
    console.warn('[5share Resend Network Error]:', err.message);
    return { delivered: false, mode: 'fallback', error: err.message };
  }
}

module.exports = {
  buildActivationEmail,
  buildPasswordResetEmail,
  buildSecurityAlertEmail,
  buildWelcomeEmail,
  buildDeviceConfirmationHtmlPage,
  sendEnterpriseEmail
};
